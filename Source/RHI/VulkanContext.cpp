#include "RHI/VulkanContext.h"
#include "RHI/VulkanSwapchain.h"
#include <array>
#include <cstdio>
#include <cstring>
#include <set>
#include <stdexcept>
#include <string>
#include <tracy/Tracy.hpp>

#ifdef VANGUARD_ENABLE_VULKAN_VALIDATION

namespace {

VKAPI_ATTR VkBool32 VKAPI_CALL DebugMessengerCallback(
    VkDebugUtilsMessageSeverityFlagBitsEXT severity,
    VkDebugUtilsMessageTypeFlagsEXT type,
    const VkDebugUtilsMessengerCallbackDataEXT* data,
    void* userData
) {
    (void)type;
    (void)userData;
    std::string prefix = "VULKAN";
    if (severity & VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT) prefix += " [ERROR]";
    else if (severity & VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT) prefix += " [WARN]";

    std::fprintf(stderr, "%s: %s\n", prefix.c_str(), data ? data->pMessage : "unknown message");
    return VK_FALSE;
}

} // namespace

#endif // VANGUARD_ENABLE_VULKAN_VALIDATION

namespace Vanguard {

namespace {

constexpr std::array<const char*, 1> k_DeviceExtensions = {
    VK_KHR_SWAPCHAIN_EXTENSION_NAME,
};

} // namespace

VulkanContext::~VulkanContext() {
    Shutdown();
}

void VulkanContext::Initialize(const VulkanContextConfig& config) {
    ZoneScopedN("VulkanContext::Initialize");
    CreateInstance(config);
}

void VulkanContext::CreateInstance(const VulkanContextConfig& config) {
    ZoneScopedN("VulkanContext::CreateInstance");

    VkApplicationInfo appInfo{
        .sType = VK_STRUCTURE_TYPE_APPLICATION_INFO,
        .pApplicationName = config.AppName,
        .applicationVersion = config.AppVersion,
        .pEngineName = config.AppName,
        .engineVersion = config.AppVersion,
        .apiVersion = VK_API_VERSION_1_3,
    };

    uint32_t glfwExtensionCount = 0;
    const char** glfwExtensions = nullptr;

#ifdef VANGUARD_ENABLE_VULKAN_VALIDATION
    static constexpr std::array<const char*, 1> k_InstanceLayers = {
        "VK_LAYER_KHRONOS_validation",
    };
#else
    static constexpr std::array<const char*, 0> k_InstanceLayers = {};
#endif

    VkInstanceCreateInfo createInfo{
        .sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO,
        .pApplicationInfo = &appInfo,
        .enabledLayerCount = static_cast<uint32_t>(k_InstanceLayers.size()),
        .ppEnabledLayerNames = k_InstanceLayers.data(),
        .enabledExtensionCount = 0,
        .ppEnabledExtensionNames = nullptr,
    };

    // Surface extensions come from the windowing backend (SDL3). This context
    // is initialized after the surface exists; the caller passes extensions in
    // via SDL_Vulkan_GetInstanceExtensions. For a minimal standalone boot the
    // instance is created extension-less and surface selection happens later.
    (void)glfwExtensionCount;
    (void)glfwExtensions;

    VkResult result = vkCreateInstance(&createInfo, nullptr, &m_Instance);
    if (result != VK_SUCCESS) {
        throw std::runtime_error("VulkanContext: failed to create VkInstance (Vulkan 1.3 SDK required)");
    }

#ifdef VANGUARD_ENABLE_VULKAN_VALIDATION
    // Wire up the debug messenger.
    VkDebugUtilsMessengerCreateInfoEXT debugInfo{
        .sType = VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT,
        .messageSeverity = VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT |
                           VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT,
        .messageType = VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT |
                      VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT |
                      VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT,
        .pfnUserCallback = DebugMessengerCallback,
    };
    VkDebugUtilsMessengerEXT messenger = VK_NULL_HANDLE;
    if (auto func = reinterpret_cast<PFN_vkCreateDebugUtilsMessengerEXT>(
            vkGetInstanceProcAddr(m_Instance, "vkCreateDebugUtilsMessengerEXT"))) {
        func(m_Instance, &debugInfo, nullptr, &messenger);
        m_DebugMessenger = messenger;
    }
#endif // VANGUARD_ENABLE_VULKAN_VALIDATION
}

bool VulkanContext::PickPhysicalDevice() {
    ZoneScopedN("VulkanContext::PickPhysicalDevice");

    if (m_Surface == VK_NULL_HANDLE) {
        return false;
    }

    uint32_t deviceCount = 0;
    vkEnumeratePhysicalDevices(m_Instance, &deviceCount, nullptr);
    if (deviceCount == 0) return false;

    std::vector<VkPhysicalDevice> devices(deviceCount);
    vkEnumeratePhysicalDevices(m_Instance, &deviceCount, devices.data());

    // Simple scoring: prefer discrete GPUs with graphics + present queues.
    int bestScore = -1;
    for (const VkPhysicalDevice device : devices) {
        uint32_t queueFamilyCount = 0;
        vkGetPhysicalDeviceQueueFamilyProperties(device, &queueFamilyCount, nullptr);
        std::vector<VkQueueFamilyProperties> queueFamilies(queueFamilyCount);
        vkGetPhysicalDeviceQueueFamilyProperties(device, &queueFamilyCount, queueFamilies.data());

        uint32_t graphics = UINT32_MAX;
        uint32_t present = UINT32_MAX;
        uint32_t compute = UINT32_MAX;

        for (uint32_t i = 0; i < queueFamilyCount; ++i) {
            const VkQueueFamilyProperties& family = queueFamilies[i];
            if (family.queueFlags & VK_QUEUE_GRAPHICS_BIT) graphics = i;
            if (family.queueFlags & VK_QUEUE_COMPUTE_BIT) compute = i;

            VkBool32 supportsPresent = VK_FALSE;
            if (m_Surface != VK_NULL_HANDLE) {
                vkGetPhysicalDeviceSurfaceSupportKHR(device, i, m_Surface, &supportsPresent);
                if (supportsPresent) present = i;
            }
        }

        if (graphics == UINT32_MAX) continue;

        VkPhysicalDeviceProperties props;
        vkGetPhysicalDeviceProperties(device, &props);

        int score = 0;
        if (props.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU) score += 1000;
        score += static_cast<int>(props.limits.maxImageDimension2D) / 10;

        if (score > bestScore) {
            bestScore = score;
            m_PhysicalDevice = device;
            m_GraphicsQueueFamily = graphics;
            m_PresentQueueFamily = present != UINT32_MAX ? present : graphics;
            m_ComputeQueueFamily = compute != UINT32_MAX ? compute : graphics;
        }
    }

    if (m_PhysicalDevice == VK_NULL_HANDLE) return false;

    CreateDevice();
    return true;
}

void VulkanContext::CreateDevice() {
    ZoneScopedN("VulkanContext::CreateDevice");

    std::set<uint32_t> uniqueFamilies{ m_GraphicsQueueFamily, m_PresentQueueFamily, m_ComputeQueueFamily };

    std::vector<VkDeviceQueueCreateInfo> queueCreateInfos;
    const float queuePriority = 1.0f;
    for (const uint32_t family : uniqueFamilies) {
        queueCreateInfos.push_back(VkDeviceQueueCreateInfo{
            .sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
            .queueFamilyIndex = family,
            .queueCount = 1,
            .pQueuePriorities = &queuePriority,
        });
    }

    VkPhysicalDeviceFeatures deviceFeatures{};
    deviceFeatures.samplerAnisotropy = VK_TRUE;
    deviceFeatures.fillModeNonSolid = VK_TRUE;

    VkDeviceCreateInfo createInfo{
        .sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO,
        .queueCreateInfoCount = static_cast<uint32_t>(queueCreateInfos.size()),
        .pQueueCreateInfos = queueCreateInfos.data(),
        .enabledExtensionCount = static_cast<uint32_t>(k_DeviceExtensions.size()),
        .ppEnabledExtensionNames = k_DeviceExtensions.data(),
        .pEnabledFeatures = &deviceFeatures,
    };

    if (vkCreateDevice(m_PhysicalDevice, &createInfo, nullptr, &m_Device) != VK_SUCCESS) {
        throw std::runtime_error("VulkanContext: failed to create logical device");
    }

    vkGetDeviceQueue(m_Device, m_GraphicsQueueFamily, 0, &m_GraphicsQueue);
    vkGetDeviceQueue(m_Device, m_PresentQueueFamily, 0, &m_PresentQueue);
    vkGetDeviceQueue(m_Device, m_ComputeQueueFamily, 0, &m_ComputeQueue);

    CreateCommandPool();
}

void VulkanContext::CreateCommandPool() {
    VkCommandPoolCreateInfo poolInfo{
        .sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO,
        .flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT,
        .queueFamilyIndex = m_GraphicsQueueFamily,
    };
    if (vkCreateCommandPool(m_Device, &poolInfo, nullptr, &m_CommandPool) != VK_SUCCESS) {
        throw std::runtime_error("VulkanContext: failed to create command pool");
    }
}

VkCommandPool VulkanContext::CreateCommandPool(uint32_t queueFamily) const {
    VkCommandPoolCreateInfo poolInfo{
        .sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO,
        .flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT,
        .queueFamilyIndex = queueFamily,
    };
    VkCommandPool pool = VK_NULL_HANDLE;
    vkCreateCommandPool(m_Device, &poolInfo, nullptr, &pool);
    return pool;
}

VkCommandBuffer VulkanContext::BeginSingleTimeCommand() const {
    VkCommandBufferAllocateInfo allocInfo{
        .sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO,
        .commandPool = m_CommandPool,
        .level = VK_COMMAND_BUFFER_LEVEL_PRIMARY,
        .commandBufferCount = 1,
    };

    VkCommandBuffer cmdBuffer = VK_NULL_HANDLE;
    vkAllocateCommandBuffers(m_Device, &allocInfo, &cmdBuffer);

    VkCommandBufferBeginInfo beginInfo{
        .sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO,
        .flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT,
    };
    vkBeginCommandBuffer(cmdBuffer, &beginInfo);
    return cmdBuffer;
}

void VulkanContext::EndSingleTimeCommand(VkCommandBuffer cmdBuffer) const {
    vkEndCommandBuffer(cmdBuffer);

    VkSubmitInfo submitInfo{
        .sType = VK_STRUCTURE_TYPE_SUBMIT_INFO,
        .commandBufferCount = 1,
        .pCommandBuffers = &cmdBuffer,
    };
    vkQueueSubmit(m_GraphicsQueue, 1, &submitInfo, VK_NULL_HANDLE);
    vkQueueWaitIdle(m_GraphicsQueue);

    vkFreeCommandBuffers(m_Device, m_CommandPool, 1, &cmdBuffer);
}

void VulkanContext::DestroyDebugMessenger() const {
    if (m_DebugMessenger != VK_NULL_HANDLE) {
        auto func = reinterpret_cast<PFN_vkDestroyDebugUtilsMessengerEXT>(
            vkGetInstanceProcAddr(m_Instance, "vkDestroyDebugUtilsMessengerEXT")
        );
        if (func) {
            func(m_Instance, m_DebugMessenger, nullptr);
        }
    }
}

void VulkanContext::Shutdown() {
    DestroySwapchain();
    DestroySurface();

    if (m_Device != VK_NULL_HANDLE) {
        vkDestroyCommandPool(m_Device, m_CommandPool, nullptr);
        vkDestroyDevice(m_Device, nullptr);
        m_Device = VK_NULL_HANDLE;
        m_CommandPool = VK_NULL_HANDLE;
    }
    if (m_Instance != VK_NULL_HANDLE) {
        DestroyDebugMessenger();
        vkDestroyInstance(m_Instance, nullptr);
        m_Instance = VK_NULL_HANDLE;
    }
}

void VulkanContext::CreateSurface(void* nativeWindow) {
    DestroySurface();

    // Android path
#if defined(VANGUARD_PLATFORM_ANDROID)
    if (nativeWindow) {
        ANativeWindow* window = static_cast<ANativeWindow*>(nativeWindow);
        VkAndroidSurfaceCreateInfoKHR createInfo{
            .sType = VK_STRUCTURE_TYPE_ANDROID_SURFACE_CREATE_INFO_KHR,
            .pNext = nullptr,
            .flags = 0,
            .window = window
        };

        PFN_vkCreateAndroidSurfaceKHR func = reinterpret_cast<PFN_vkCreateAndroidSurfaceKHR>(
            vkGetInstanceProcAddr(m_Instance, "vkCreateAndroidSurfaceKHR")
        );
        if (!func) {
            throw std::runtime_error("Failed to find vkCreateAndroidSurfaceKHR");
        }

        VkResult result = func(m_Instance, &createInfo, nullptr, &m_Surface);
        if (result != VK_SUCCESS) {
            throw std::runtime_error("Failed to create Android surface");
        }
        return;
    }
#endif

    // SDL3 path (default)
    if (nativeWindow) {
        SDL_Window* window = static_cast<SDL_Window*>(nativeWindow);
        if (!SDL_Vulkan_CreateSurface(window, m_Instance, nullptr, &m_Surface)) {
            throw std::runtime_error("Failed to create SDL3 surface: " + std::string(SDL_GetError()));
        }
        return;
    }

    throw std::runtime_error("Failed to create Vulkan surface: nativeWindow is null");
}

void VulkanContext::DestroySurface() {
    if (m_Surface != VK_NULL_HANDLE) {
        vkDestroySurfaceKHR(m_Instance, m_Surface, nullptr);
        m_Surface = VK_NULL_HANDLE;
    }
}

void VulkanContext::CreateSwapchain(uint32_t width, uint32_t height) {
    DestroySwapchain();

    m_Swapchain = std::make_unique<RHI::VulkanSwapchain>();
    m_Swapchain->SetContext(this);

    RHI::SwapchainConfig config{
        .Surface = m_Surface,
        .Width = width,
        .Height = height,
        .PreferredFormat = VK_FORMAT_R8G8B8A8_UNORM,
        .PreferredColorSpace = VK_COLOR_SPACE_SRGB_NONLINEAR_KHR,
        .PreferredPresentMode = VK_PRESENT_MODE_MAILBOX_KHR,
        .MinImageCount = 3,
        .bEnableVsync = false
    };

    if (!m_Swapchain->Initialize(config)) {
        throw std::runtime_error("Failed to initialize swapchain");
    }
}

void VulkanContext::DestroySwapchain() {
    m_Swapchain.reset();
}

void VulkanContext::RecreateSwapchain(uint32_t width, uint32_t height) {
    CreateSwapchain(width, height);
}

} // namespace Vanguard