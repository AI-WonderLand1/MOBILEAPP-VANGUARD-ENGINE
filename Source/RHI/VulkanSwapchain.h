#pragma once
#include "RHI/ISwapchain.h"
#include <vulkan/vulkan.h>
#include <vector>

namespace Vanguard::RHI {

class VulkanSwapchain final : public ISwapchain {
public:
    VulkanSwapchain(VkDevice device, VkPhysicalDevice physicalDevice);
    ~VulkanSwapchain() override;

    bool Initialize(const SwapchainConfig& config) override;
    void Shutdown() override;

    VkResult AcquireNextImage(uint64_t timeout, VkSemaphore semaphore, VkFence fence, uint32_t* imageIndex) override;
    VkResult Present(VkQueue queue, uint32_t imageIndex, const VkSemaphore* waitSemaphores, uint32_t waitSemaphoreCount) override;

    void Recreate(uint32_t width, uint32_t height) override;

    [[nodiscard]] const std::vector<SwapchainImage>& GetImages() const noexcept override { return m_Images; }
    [[nodiscard]] VkFormat GetFormat() const noexcept override { return m_Format; }
    [[nodiscard]] VkExtent2D GetExtent() const noexcept override { return m_Extent; }
    [[nodiscard]] VkSurfaceKHR GetSurface() const noexcept override { return m_Surface; }
    [[nodiscard]] uint32_t GetImageCount() const noexcept override { return static_cast<uint32_t>(m_Images.size()); }

    [[nodiscard]] VkImage GetImage(uint32_t index) const noexcept override { return m_Images[index].Image; }

private:
    void CreateSwapchain(uint32_t width, uint32_t height);
    void CreateImageViews();
    void Cleanup();

    VkDevice m_Device = VK_NULL_HANDLE;
    VkPhysicalDevice m_PhysicalDevice = VK_NULL_HANDLE;
    VkSwapchainKHR m_Swapchain = VK_NULL_HANDLE;
    VkSurfaceKHR m_Surface = VK_NULL_HANDLE;
    VkFormat m_Format = VK_FORMAT_UNDEFINED;
    VkExtent2D m_Extent = {0, 0};

    std::vector<SwapchainImage> m_Images;
    SwapchainConfig m_Config;
};

} // namespace Vanguard::RHI
