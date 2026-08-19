#include "RHI/ISwapchain.h"
#include "RHI/VulkanContext.h"
#include <vulkan/vulkan.h>
#include <array>
#include <stdexcept>
#include <algorithm>
#include <tracy/Tracy.hpp>

namespace Vanguard::RHI {

class VulkanSwapchain final : public ISwapchain {
public:
    VulkanSwapchain() = default;
    ~VulkanSwapchain() override { Shutdown(); }

    VulkanSwapchain(const VulkanSwapchain&) = delete;
    VulkanSwapchain& operator=(const VulkanSwapchain&) = delete;
    VulkanSwapchain(VulkanSwapchain&&) noexcept = default;
    VulkanSwapchain& operator=(VulkanSwapchain&&) noexcept = default;

    bool Initialize(const SwapchainConfig& config) override {
        m_Config = config;

        vkGetPhysicalDeviceSurfaceCapabilitiesKHR(
            config.pContext->GetPhysicalDevice(),
            config.Surface,
            &m_SurfaceCapabilities
        );

        // Choose surface format
        m_SurfaceFormat = ChooseSurfaceFormat(
            config.pContext->GetPhysicalDevice(),
            config.Surface,
            config.PreferredFormat,
            config.PreferredColorSpace
        );

        // Choose present mode
        m_PresentMode = ChoosePresentMode(
            config.pContext->GetPhysicalDevice(),
            config.Surface,
            config.PreferredPresentMode
        );

        // Choose extent
        m_Extent = ChooseExtent(
            config.Width,
            config.Height,
            m_SurfaceCapabilities
        );

        // Determine image count
        m_ImageCount = std::max(m_SurfaceCapabilities.minImageCount, config.MinImageCount);
        if (m_SurfaceCapabilities.maxImageCount > 0 &&
            m_ImageCount > m_SurfaceCapabilities.maxImageCount) {
            m_ImageCount = m_SurfaceCapabilities.maxImageCount;
        }

        // Create swapchain
        CreateSwapchain();

        // Create image views
        CreateImageViews();

        return true;
    }

    void Shutdown() override {
        DestroyImageViews();
        DestroySwapchain();
    }

    VkResult AcquireNextImage(uint64_t timeout, VkSemaphore semaphore, VkFence fence, uint32_t* imageIndex) override {
        return vkAcquireNextImageKHR(
            config.pContext->GetDevice(),
            m_Swapchain,
            timeout,
            semaphore,
            fence,
            imageIndex
        );
    }

    VkResult Present(VkQueue queue, uint32_t imageIndex, const VkSemaphore* waitSemaphores, uint32_t waitSemaphoreCount) override {
        VkPresentInfoKHR presentInfo{
            .sType = VK_STRUCTURE_TYPE_PRESENT_INFO_KHR,
            .waitSemaphoreCount = waitSemaphoreCount,
            .pWaitSemaphores = waitSemaphores,
            .swapchainCount = 1,
            .pSwapchains = &m_Swapchain,
            .pImageIndices = &imageIndex
        };

        return vkQueuePresentKHR(queue, &presentInfo);
    }

    void Recreate(uint32_t width, uint32_t height) override {
        m_Config.Width = width;
        m_Config.Height = height;

        vkDeviceWaitIdle(config.pContext->GetDevice());

        Shutdown();
        Initialize(m_Config);
    }

    [[nodiscard]] const std::vector<SwapchainImage>& GetImages() const noexcept override { return m_Images; }
    [[nodiscard]] VkFormat GetFormat() const noexcept override { return m_SurfaceFormat.format; }
    [[nodiscard]] VkExtent2D GetExtent() const noexcept override { return m_Extent; }
    [[nodiscard]] VkSurfaceKHR GetSurface() const noexcept override { return m_Config.Surface; }
    [[nodiscard]] uint32_t GetImageCount() const noexcept override { return m_ImageCount; }

    void SetContext(VulkanContext* context) { config.pContext = context; }

private:
    struct Config {
        VulkanContext* pContext = nullptr;
    } config;

    SwapchainConfig m_Config;
    VkSurfaceCapabilitiesKHR m_SurfaceCapabilities{};
    VkSurfaceFormatKHR m_SurfaceFormat{};
    VkPresentModeKHR m_PresentMode{};
    VkExtent2D m_Extent{};
    VkSwapchainKHR m_Swapchain = VK_NULL_HANDLE;
    uint32_t m_ImageCount = 0;
    std::vector<SwapchainImage> m_Images{};

    VkSurfaceFormatKHR ChooseSurfaceFormat(
        VkPhysicalDevice device,
        VkSurfaceKHR surface,
        VkFormat preferredFormat,
        VkColorSpaceKHR preferredColorSpace
    ) {
        uint32_t formatCount = 0;
        vkGetPhysicalDeviceSurfaceFormatsKHR(device, surface, &formatCount, nullptr);

        if (formatCount == 0) {
            throw std::runtime_error("Failed to get surface formats");
        }

        std::vector<VkSurfaceFormatKHR> formats(formatCount);
        vkGetPhysicalDeviceSurfaceFormatsKHR(device, surface, &formatCount, formats.data());

        if (formatCount == 1 && formats[0].format == VK_FORMAT_UNDEFINED) {
            return { preferredFormat, preferredColorSpace };
        }

        for (const auto& format : formats) {
            if (format.format == preferredFormat &&
                format.colorSpace == preferredColorSpace) {
                return format;
            }
        }

        return formats[0];
    }

    VkPresentModeKHR ChoosePresentMode(
        VkPhysicalDevice device,
        VkSurfaceKHR surface,
        VkPresentModeKHR preferredMode
    ) {
        uint32_t presentModeCount = 0;
        vkGetPhysicalDeviceSurfacePresentModesKHR(device, surface, &presentModeCount, nullptr);

        if (presentModeCount == 0) {
            throw std::runtime_error("Failed to get surface present modes");
        }

        std::vector<VkPresentModeKHR> modes(presentModeCount);
        vkGetPhysicalDeviceSurfacePresentModesKHR(device, surface, &presentModeCount, modes.data());

        // Prefer mailbox mode (low latency, no tearing)
        for (const auto& mode : modes) {
            if (mode == VK_PRESENT_MODE_MAILBOX_KHR) {
                return mode;
            }
        }

        // Fallback to fifo (guaranteed to be available)
        for (const auto& mode : modes) {
            if (mode == VK_PRESENT_MODE_FIFO_KHR) {
                return mode;
            }
        }

        return modes[0];
    }

    VkExtent2D ChooseExtent(
        uint32_t width,
        uint32_t height,
        const VkSurfaceCapabilitiesKHR& capabilities
    ) {
        if (capabilities.currentExtent.width != UINT32_MAX) {
            return capabilities.currentExtent;
        }

        VkExtent2D actualExtent = { width, height };
        actualExtent.width = std::max(
            capabilities.minImageExtent.width,
            std::min(capabilities.maxImageExtent.width, actualExtent.width)
        );
        actualExtent.height = std::max(
            capabilities.minImageExtent.height,
            std::min(capabilities.maxImageExtent.height, actualExtent.height)
        );

        return actualExtent;
    }

    void CreateSwapchain() {
        VkSwapchainCreateInfoKHR createInfo{
            .sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR,
            .surface = m_Config.Surface,
            .minImageCount = m_ImageCount,
            .imageFormat = m_SurfaceFormat.format,
            .imageColorSpace = m_SurfaceFormat.colorSpace,
            .imageExtent = m_Extent,
            .imageArrayLayers = 1,
            .imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT,
            .preTransform = m_SurfaceCapabilities.currentTransform,
            .compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR,
            .presentMode = m_PresentMode,
            .clipped = VK_TRUE
        };

        // Check if we need to share images between queues
        uint32_t queueFamilyIndices[] = {
            config.pContext->GetGraphicsQueueFamily(),
            config.pContext->GetPresentQueueFamily()
        };

        if (queueFamilyIndices[0] != queueFamilyIndices[1]) {
            createInfo.imageSharingMode = VK_SHARING_MODE_CONCURRENT;
            createInfo.queueFamilyIndexCount = 2;
            createInfo.pQueueFamilyIndices = queueFamilyIndices;
        } else {
            createInfo.imageSharingMode = VK_SHARING_MODE_EXCLUSIVE;
        }

        if (vkCreateSwapchainKHR(
                config.pContext->GetDevice(),
                &createInfo,
                nullptr,
                &m_Swapchain) != VK_SUCCESS) {
            throw std::runtime_error("Failed to create swapchain");
        }

        // Get swapchain images
        vkGetSwapchainImagesKHR(
            config.pContext->GetDevice(),
            m_Swapchain,
            &m_ImageCount,
            nullptr
        );

        std::vector<VkImage> images(m_ImageCount);
        vkGetSwapchainImagesKHR(
            config.pContext->GetDevice(),
            m_Swapchain,
            &m_ImageCount,
            images.data()
        );

        m_Images.resize(m_ImageCount);
        for (size_t i = 0; i < m_ImageCount; ++i) {
            m_Images[i].Image = images[i];
        }
    }

    void DestroySwapchain() {
        if (m_Swapchain != VK_NULL_HANDLE) {
            vkDestroySwapchainKHR(config.pContext->GetDevice(), m_Swapchain, nullptr);
            m_Swapchain = VK_NULL_HANDLE;
        }
    }

    void CreateImageViews() {
        m_Images.clear();
        m_Images.resize(m_ImageCount);

        for (size_t i = 0; i < m_ImageCount; ++i) {
            VkImageViewCreateInfo viewInfo{
                .sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO,
                .image = m_Images[i].Image,
                .viewType = VK_IMAGE_VIEW_TYPE_2D,
                .format = m_SurfaceFormat.format,
                .components = {
                    .r = VK_COMPONENT_SWIZZLE_IDENTITY,
                    .g = VK_COMPONENT_SWIZZLE_IDENTITY,
                    .b = VK_COMPONENT_SWIZZLE_IDENTITY,
                    .a = VK_COMPONENT_SWIZZLE_IDENTITY
                },
                .subresourceRange = {
                    .aspectMask = VK_IMAGE_ASPECT_COLOR_BIT,
                    .baseMipLevel = 0,
                    .levelCount = 1,
                    .baseArrayLayer = 0,
                    .layerCount = 1
                }
            };

            if (vkCreateImageView(
                    config.pContext->GetDevice(),
                    &viewInfo,
                    nullptr,
                    &m_Images[i].View) != VK_SUCCESS) {
                throw std::runtime_error("Failed to create image view");
            }
        }
    }

    void DestroyImageViews() {
        for (auto& image : m_Images) {
            if (image.View != VK_NULL_HANDLE) {
                vkDestroyImageView(config.pContext->GetDevice(), image.View, nullptr);
                image.View = VK_NULL_HANDLE;
            }
            if (image.Framebuffer != VK_NULL_HANDLE) {
                vkDestroyFramebuffer(config.pContext->GetDevice(), image.Framebuffer, nullptr);
                image.Framebuffer = VK_NULL_HANDLE;
            }
        }
        m_Images.clear();
    }
};

} // namespace Vanguard::RHI