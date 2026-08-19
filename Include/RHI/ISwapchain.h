#pragma once
#include <vulkan/vulkan.h>
#include <vector>
#include <cstdint>

namespace Vanguard::RHI {

struct SwapchainConfig {
    VkSurfaceKHR Surface = VK_NULL_HANDLE;
    uint32_t Width = 1920;
    uint32_t Height = 1080;
    VkFormat PreferredFormat = VK_FORMAT_R8G8B8A8_UNORM;
    VkColorSpaceKHR PreferredColorSpace = VK_COLOR_SPACE_SRGB_NONLINEAR_KHR;
    VkPresentModeKHR PreferredPresentMode = VK_PRESENT_MODE_MAILBOX_KHR;
    uint32_t MinImageCount = 3;
    bool bEnableVsync = false;
};

struct SwapchainImage {
    VkImage Image = VK_NULL_HANDLE;
    VkImageView View = VK_NULL_HANDLE;
    VkFramebuffer Framebuffer = VK_NULL_HANDLE;
};

class ISwapchain {
public:
    virtual ~ISwapchain() = default;

    virtual bool Initialize(const SwapchainConfig& config) = 0;
    virtual void Shutdown() = 0;

    virtual VkResult AcquireNextImage(uint64_t timeout, VkSemaphore semaphore, VkFence fence, uint32_t* imageIndex) = 0;
    virtual VkResult Present(VkQueue queue, uint32_t imageIndex, const VkSemaphore* waitSemaphores, uint32_t waitSemaphoreCount) = 0;

    virtual void Recreate(uint32_t width, uint32_t height) = 0;

    [[nodiscard]] virtual const std::vector<SwapchainImage>& GetImages() const noexcept = 0;
    [[nodiscard]] virtual VkFormat GetFormat() const noexcept = 0;
    [[nodiscard]] virtual VkExtent2D GetExtent() const noexcept = 0;
    [[nodiscard]] virtual VkSurfaceKHR GetSurface() const noexcept = 0;
    [[nodiscard]] virtual uint32_t GetImageCount() const noexcept = 0;
    
    [[nodiscard]] virtual VkImage GetImage(uint32_t index) const noexcept = 0;
};

} // namespace Vanguard::RHI