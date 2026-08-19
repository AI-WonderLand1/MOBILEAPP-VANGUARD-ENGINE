#include "Source/RHI/VulkanSwapchain.h"
#include <algorithm>
#include <stdexcept>

namespace Vanguard::RHI {

VulkanSwapchain::VulkanSwapchain(VkDevice device, VkPhysicalDevice physicalDevice)
    : m_Device(device), m_PhysicalDevice(physicalDevice) {}

VulkanSwapchain::~VulkanSwapchain() {
    Shutdown();
}

bool VulkanSwapchain::Initialize(const SwapchainConfig& config) {
    m_Config = config;
    m_Surface = config.Surface;
    CreateSwapchain(config.Width, config.Height);
    CreateImageViews();
    return true;
}

void VulkanSwapchain::Shutdown() {
    Cleanup();
}

void VulkanSwapchain::Cleanup() {
    for (auto& img : m_Images) {
        if (img.View) vkDestroyImageView(m_Device, img.View, nullptr);
    }
    m_Images.clear();

    if (m_Swapchain) {
        vkDestroySwapchainKHR(m_Device, m_Swapchain, nullptr);
        m_Swapchain = VK_NULL_HANDLE;
    }
}

void VulkanSwapchain::CreateSwapchain(uint32_t width, uint32_t height) {
    VkSurfaceCapabilitiesKHR capabilities;
    vkGetPhysicalDeviceSurfaceCapabilitiesKHR(m_PhysicalDevice, m_Surface, &capabilities);

    uint32_t formatCount;
    vkGetPhysicalDeviceSurfaceFormatsKHR(m_PhysicalDevice, m_Surface, &formatCount, nullptr);
    std::vector<VkSurfaceFormatKHR> formats(formatCount);
    vkGetPhysicalDeviceSurfaceFormatsKHR(m_PhysicalDevice, m_Surface, &formatCount, formats.data());

    VkSurfaceFormatKHR surfaceFormat = formats[0];
    for (const auto& f : formats) {
        if (f.format == m_Config.PreferredFormat && f.colorSpace == m_Config.PreferredColorSpace) {
            surfaceFormat = f;
            break;
        }
    }

    uint32_t presentModeCount;
    vkGetPhysicalDeviceSurfacePresentModesKHR(m_PhysicalDevice, m_Surface, &presentModeCount, nullptr);
    std::vector<VkPresentModeKHR> presentModes(presentModeCount);
    vkGetPhysicalDeviceSurfacePresentModesKHR(m_PhysicalDevice, m_Surface, &presentModeCount, presentModes.data());

    VkPresentModeKHR presentMode = VK_PRESENT_MODE_FIFO_KHR;
    for (const auto& pm : presentModes) {
        if (pm == m_Config.PreferredPresentMode) {
            presentMode = pm;
            break;
        }
    }

    VkExtent2D extent = { width, height };
    extent.width = std::clamp(extent.width, capabilities.minImageExtent.width, capabilities.maxImageExtent.width);
    extent.height = std::clamp(extent.height, capabilities.minImageExtent.height, capabilities.maxImageExtent.height);

    uint32_t imageCount = std::max(m_Config.MinImageCount, capabilities.minImageCount);
    if (capabilities.maxImageCount > 0 && imageCount > capabilities.maxImageCount) {
        imageCount = capabilities.maxImageCount;
    }

    VkSwapchainCreateInfoKHR createInfo{
        .sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR,
        .surface = m_Surface,
        .minImageCount = imageCount,
        .imageFormat = surfaceFormat.format,
        .imageColorSpace = surfaceFormat.colorSpace,
        .imageExtent = extent,
        .imageArrayLayers = 1,
        .imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT | VK_IMAGE_USAGE_TRANSFER_DST_BIT,
        .imageSharingMode = VK_SHARING_MODE_EXCLUSIVE,
        .preTransform = capabilities.currentTransform,
        .compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR,
        .presentMode = presentMode,
        .clipped = VK_TRUE,
        .oldSwapchain = m_Swapchain
    };

    VkSwapchainKHR oldSwapchain = m_Swapchain;
    if (vkCreateSwapchainKHR(m_Device, &createInfo, nullptr, &m_Swapchain) != VK_SUCCESS) {
        throw std::runtime_error("Failed to create Vulkan swapchain");
    }

    if (oldSwapchain) {
        vkDestroySwapchainKHR(m_Device, oldSwapchain, nullptr);
    }

    m_Format = surfaceFormat.format;
    m_Extent = extent;

    uint32_t actualImageCount;
    vkGetSwapchainImagesKHR(m_Device, m_Swapchain, &actualImageCount, nullptr);
    std::vector<VkImage> images(actualImageCount);
    vkGetSwapchainImagesKHR(m_Device, m_Swapchain, &actualImageCount, images.data());

    m_Images.resize(actualImageCount);
    for (size_t i = 0; i < actualImageCount; ++i) {
        m_Images[i].Image = images[i];
    }
}

void VulkanSwapchain::CreateImageViews() {
    for (auto& img : m_Images) {
        VkImageViewCreateInfo createInfo{
            .sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO,
            .image = img.Image,
            .viewType = VK_IMAGE_VIEW_TYPE_2D,
            .format = m_Format,
            .subresourceRange = {
                .aspectMask = VK_IMAGE_ASPECT_COLOR_BIT,
                .baseMipLevel = 0,
                .levelCount = 1,
                .baseArrayLayer = 0,
                .layerCount = 1,
            }
        };

        if (vkCreateImageView(m_Device, &createInfo, nullptr, &img.View) != VK_SUCCESS) {
            throw std::runtime_error("Failed to create Vulkan image view");
        }
    }
}

VkResult VulkanSwapchain::AcquireNextImage(uint64_t timeout, VkSemaphore semaphore, VkFence fence, uint32_t* imageIndex) {
    return vkAcquireNextImageKHR(m_Device, m_Swapchain, timeout, semaphore, fence, imageIndex);
}

VkResult VulkanSwapchain::Present(VkQueue queue, uint32_t imageIndex, const VkSemaphore* waitSemaphores, uint32_t waitSemaphoreCount) {
    VkPresentInfoKHR presentInfo{
        .sType = VK_STRUCTURE_TYPE_PRESENT_INFO_KHR,
        .waitSemaphoreCount = waitSemaphoreCount,
        .pWaitSemaphores = waitSemaphores,
        .swapchainCount = 1,
        .pSwapchains = &m_Swapchain,
        .pImageIndices = &imageIndex,
    };
    return vkQueuePresentKHR(queue, &presentInfo);
}

void VulkanSwapchain::Recreate(uint32_t width, uint32_t height) {
    Cleanup();
    CreateSwapchain(width, height);
    CreateImageViews();
}

} // namespace Vanguard::RHI
