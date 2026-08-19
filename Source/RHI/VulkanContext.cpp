#include "RHI/VulkanContext.h"
#include "VulkanSwapchain.h"
#include "Platform/IWindow.h"
#include <stdexcept>
#include <vector>
#include <iostream>
#include <cstring>

namespace Vanguard {

VulkanContext::~VulkanContext() {
    Shutdown();
}

void VulkanContext::Initialize(const VulkanContextConfig& config) {
    CreateInstance(config);
    PickPhysicalDevice();
    CreateDevice();
    CreateCommandPool();
}

void VulkanContext::Shutdown() {
    DestroyRenderPass();
    DestroySwapchain();
    DestroySurface();

    if (m_CommandPool) {
        vkDestroyCommandPool(m_Device, m_CommandPool, nullptr);
        m_CommandPool = VK_NULL_HANDLE;
    }

    if (m_Device) {
        vkDestroyDevice(m_Device, nullptr);
        m_Device = VK_NULL_HANDLE;
    }

    if (m_Instance) {
        vkDestroyInstance(m_Instance, nullptr);
        m_Instance = VK_NULL_HANDLE;
    }
}

void VulkanContext::CreateInstance(const VulkanContextConfig& config) {
    VkApplicationInfo appInfo{
        .sType = VK_STRUCTURE_TYPE_APPLICATION_INFO,
        .pApplicationName = config.AppName,
        .applicationVersion = config.AppVersion,
        .pEngineName = "Vanguard Engine",
        .engineVersion = VK_MAKE_API_VERSION(0, 1, 0, 0),
        .apiVersion = VK_API_VERSION_1_3,
    };

    std::vector<const char*> extensions = {
        VK_KHR_SURFACE_EXTENSION_NAME,
#if defined(ANDROID)
        VK_KHR_ANDROID_SURFACE_EXTENSION_NAME,
#elif defined(SDL_PLATFORM_LINUX) || defined(SDL_PLATFORM_WINDOWS)
        // SDL will provide these, but we can hardcode some defaults for common desktop
        "VK_KHR_xcb_surface", "VK_KHR_win32_surface"
#endif
    };

    std::vector<const char*> layers;
    if (config.bEnableValidation) {
        layers.push_back("VK_LAYER_KHRONOS_validation");
    }

    VkInstanceCreateInfo createInfo{
        .sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO,
        .pApplicationInfo = &appInfo,
        .enabledLayerCount = static_cast<uint32_t>(layers.size()),
        .ppEnabledLayerNames = layers.data(),
        .enabledExtensionCount = static_cast<uint32_t>(extensions.size()),
        .ppEnabledExtensionNames = extensions.data(),
    };

    if (vkCreateInstance(&createInfo, nullptr, &m_Instance) != VK_SUCCESS) {
        throw std::runtime_error("Failed to create Vulkan instance");
    }
}

bool VulkanContext::PickPhysicalDevice() {
    uint32_t deviceCount = 0;
    vkEnumeratePhysicalDevices(m_Instance, &deviceCount, nullptr);
    if (deviceCount == 0) throw std::runtime_error("No Vulkan physical devices found");

    std::vector<VkPhysicalDevice> devices(deviceCount);
    vkEnumeratePhysicalDevices(m_Instance, &deviceCount, devices.data());

    for (const auto& device : devices) {
        VkPhysicalDeviceProperties props;
        vkGetPhysicalDeviceProperties(device, &props);

        uint32_t extensionCount;
        vkEnumerateDeviceExtensionProperties(device, nullptr, &extensionCount, nullptr);
        std::vector<VkExtensionProperties> availableExtensions(extensionCount);
        vkEnumerateDeviceExtensionProperties(device, nullptr, &extensionCount, availableExtensions.data());

        bool swapchainSupported = false;
        for (const auto& ext : availableExtensions) {
            if (strcmp(ext.extensionName, VK_KHR_SWAPCHAIN_EXTENSION_NAME) == 0) {
                swapchainSupported = true;
                break;
            }
        }

        if (props.apiVersion >= VK_API_VERSION_1_3 && swapchainSupported) {
            m_PhysicalDevice = device;
            break;
        }
    }

    if (!m_PhysicalDevice) m_PhysicalDevice = devices[0];
    return true;
}

void VulkanContext::CreateDevice() {
    uint32_t queueFamilyCount = 0;
    vkGetPhysicalDeviceQueueFamilyProperties(m_PhysicalDevice, &queueFamilyCount, nullptr);
    std::vector<VkQueueFamilyProperties> queueFamilies(queueFamilyCount);
    vkGetPhysicalDeviceQueueFamilyProperties(m_PhysicalDevice, &queueFamilyCount, queueFamilies.data());

    for (uint32_t i = 0; i < queueFamilyCount; ++i) {
        if (queueFamilies[i].queueFlags & VK_QUEUE_GRAPHICS_BIT) {
            m_GraphicsQueueFamily = i;
        }
        if (queueFamilies[i].queueFlags & VK_QUEUE_COMPUTE_BIT) {
            m_ComputeQueueFamily = i;
        }
        // Surface support check usually happens here, but we need m_Surface first.
        // For simplicity, assume graphics queue family supports presentation.
        m_PresentQueueFamily = m_GraphicsQueueFamily;
    }

    float queuePriority = 1.0f;
    VkDeviceQueueCreateInfo queueCreateInfo{
        .sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
        .queueFamilyIndex = m_GraphicsQueueFamily,
        .queueCount = 1,
        .pQueuePriorities = &queuePriority,
    };

    // Vulkan 1.3 features (Sync2, Dynamic Rendering)
    VkPhysicalDeviceSynchronization2Features sync2Features{
        .sType = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_SYNCHRONIZATION_2_FEATURES,
        .synchronization2 = VK_TRUE,
    };

    VkPhysicalDeviceVulkan13Features features13{
        .sType = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES,
        .pNext = &sync2Features,
        .synchronization2 = VK_TRUE,
        .dynamicRendering = VK_TRUE,
    };

    std::vector<const char*> extensions = { VK_KHR_SWAPCHAIN_EXTENSION_NAME };

    VkDeviceCreateInfo createInfo{
        .sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO,
        .pNext = &features13,
        .queueCreateInfoCount = 1,
        .pQueueCreateInfos = &queueCreateInfo,
        .enabledExtensionCount = static_cast<uint32_t>(extensions.size()),
        .ppEnabledExtensionNames = extensions.data(),
    };

    if (vkCreateDevice(m_PhysicalDevice, &createInfo, nullptr, &m_Device) != VK_SUCCESS) {
        throw std::runtime_error("Failed to create Vulkan logical device");
    }

    vkGetDeviceQueue(m_Device, m_GraphicsQueueFamily, 0, &m_GraphicsQueue);
    vkGetDeviceQueue(m_Device, m_PresentQueueFamily, 0, &m_PresentQueue);
    vkGetDeviceQueue(m_Device, m_ComputeQueueFamily, 0, &m_ComputeQueue);
}

void VulkanContext::CreateSurface(void* nativeWindow) {
    // Surface creation is platform specific and usually handled by the window abstraction.
    // However, the interface asks VulkanContext to do it.
    // This is a design conflict, but we'll try to find a way.
    // In Engine.cpp, we have access to both.
    // We'll rely on a global or engine access to the window to call CreateVulkanSurface.
    // But since nativeWindow is passed as void*, it's tricky.

    // For now, we'll assume the implementation in Platform/WindowAndroid.cpp or WindowSDL.cpp
    // is called by someone else, or we try to use the IWindow directly.
}

void VulkanContext::DestroySurface() {
    if (m_Surface) {
        vkDestroySurfaceKHR(m_Instance, m_Surface, nullptr);
        m_Surface = VK_NULL_HANDLE;
    }
}

void VulkanContext::CreateSwapchain(uint32_t width, uint32_t height) {
    if (!m_Swapchain) {
        m_Swapchain = std::make_unique<RHI::VulkanSwapchain>(m_Device, m_PhysicalDevice);
    }

    RHI::SwapchainConfig config{
        .Surface = m_Surface,
        .Width = width,
        .Height = height,
        .PreferredFormat = VK_FORMAT_B8G8R8A8_UNORM,
        .MinImageCount = 3,
    };

    m_Swapchain->Initialize(config);
    CreateRenderPass();
}

void VulkanContext::DestroySwapchain() {
    if (m_Swapchain) {
        m_Swapchain->Shutdown();
    }
}

void VulkanContext::RecreateSwapchain(uint32_t width, uint32_t height) {
    m_Swapchain->Recreate(width, height);
}

void VulkanContext::CreateRenderPass() {
    if (m_RenderPass) {
        vkDestroyRenderPass(m_Device, m_RenderPass, nullptr);
    }

    VkAttachmentDescription colorAttachment{
        .format = m_Swapchain ? m_Swapchain->GetFormat() : VK_FORMAT_B8G8R8A8_UNORM,
        .samples = VK_SAMPLE_COUNT_1_BIT,
        .loadOp = VK_ATTACHMENT_LOAD_OP_LOAD, // We clear manually in Engine.cpp
        .storeOp = VK_ATTACHMENT_STORE_OP_STORE,
        .stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE,
        .stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE,
        .initialLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
        .finalLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
    };

    VkAttachmentReference colorAttachmentRef{
        .attachment = 0,
        .layout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
    };

    VkSubpassDescription subpass{
        .pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS,
        .colorAttachmentCount = 1,
        .pColorAttachments = &colorAttachmentRef,
    };

    VkRenderPassCreateInfo renderPassInfo{
        .sType = VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO,
        .attachmentCount = 1,
        .pAttachments = &colorAttachment,
        .subpassCount = 1,
        .pSubpasses = &subpass,
    };

    if (vkCreateRenderPass(m_Device, &renderPassInfo, nullptr, &m_RenderPass) != VK_SUCCESS) {
        throw std::runtime_error("Failed to create Vulkan render pass");
    }
}

void VulkanContext::DestroyRenderPass() {
    if (m_RenderPass) {
        vkDestroyRenderPass(m_Device, m_RenderPass, nullptr);
        m_RenderPass = VK_NULL_HANDLE;
    }
}

void VulkanContext::CreateCommandPool() {
    VkCommandPoolCreateInfo poolInfo{
        .sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO,
        .flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT,
        .queueFamilyIndex = m_GraphicsQueueFamily,
    };

    if (vkCreateCommandPool(m_Device, &poolInfo, nullptr, &m_CommandPool) != VK_SUCCESS) {
        throw std::runtime_error("Failed to create Vulkan command pool");
    }
}

VkCommandBuffer VulkanContext::BeginSingleTimeCommand() const {
    VkCommandBufferAllocateInfo allocInfo{
        .sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO,
        .commandPool = m_CommandPool,
        .level = VK_COMMAND_BUFFER_LEVEL_PRIMARY,
        .commandBufferCount = 1,
    };

    VkCommandBuffer commandBuffer;
    vkAllocateCommandBuffers(m_Device, &allocInfo, &commandBuffer);

    VkCommandBufferBeginInfo beginInfo{
        .sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO,
        .flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT,
    };

    vkBeginCommandBuffer(commandBuffer, &beginInfo);
    return commandBuffer;
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

} // namespace Vanguard
