#pragma once
#include <cstdint>
#include <vector>
#include <vulkan/vulkan.h>
#include <memory>

namespace Vanguard::RHI {
    class ISwapchain;
}

namespace Vanguard {

// ==========================================
// Vulkan Context (Device/Queue/Instance)
// ==========================================
// Owns the VkInstance, VkPhysicalDevice, VkDevice, and queue families used by
// the RenderGraph and the editor. RAII-managed so shutdown order is
// deterministic (swapchain -> device -> instance).
struct VulkanContextConfig {
    const char* AppName = "Vanguard Engine";
    uint32_t AppVersion = VK_MAKE_API_VERSION(1, 3, 0, 0);
    bool bEnableValidation = true;
};

class VulkanContext {
public:
    VulkanContext() = default;
    ~VulkanContext();

    VulkanContext(const VulkanContext&) = delete;
    VulkanContext& operator=(const VulkanContext&) = delete;
    VulkanContext(VulkanContext&&) noexcept = delete;
    VulkanContext& operator=(VulkanContext&&) noexcept = delete;

    void Initialize(const VulkanContextConfig& config);
    void Shutdown();

    // Surface Management
    void CreateSurface(void* nativeWindow);
    void SetSurface(VkSurfaceKHR surface) { m_Surface = surface; }
    void DestroySurface();
    [[nodiscard]] VkSurfaceKHR GetSurface() const noexcept { return m_Surface; }

    // Swapchain Management
    void CreateSwapchain(uint32_t width, uint32_t height);
    void DestroySwapchain();
    void RecreateSwapchain(uint32_t width, uint32_t height);
    [[nodiscard]] RHI::ISwapchain& GetSwapchain() noexcept { return *m_Swapchain; }
    [[nodiscard]] const RHI::ISwapchain& GetSwapchain() const noexcept { return *m_Swapchain; }

    // Render Pass
    [[nodiscard]] VkRenderPass GetRenderPass() const noexcept { return m_RenderPass; }
    void CreateRenderPass();
    void DestroyRenderPass();

    // Device Selection
    bool PickPhysicalDevice();
    uint32_t FindGraphicsQueueFamily() const noexcept { return m_GraphicsQueueFamily; }
    uint32_t FindPresentQueueFamily() const noexcept { return m_PresentQueueFamily; }

    // Accessors
    [[nodiscard]] VkInstance GetInstance() const noexcept { return m_Instance; }
    [[nodiscard]] VkPhysicalDevice GetPhysicalDevice() const noexcept { return m_PhysicalDevice; }
    [[nodiscard]] VkDevice GetDevice() const noexcept { return m_Device; }
    [[nodiscard]] VkQueue GetGraphicsQueue() const noexcept { return m_GraphicsQueue; }
    [[nodiscard]] VkQueue GetPresentQueue() const noexcept { return m_PresentQueue; }
    [[nodiscard]] VkQueue GetComputeQueue() const noexcept { return m_ComputeQueue; }

    // Command Pool
    VkCommandPool CreateCommandPool(uint32_t queueFamily) const;

    // Raw allocation-free helpers
    VkCommandBuffer BeginSingleTimeCommand() const;
    void EndSingleTimeCommand(VkCommandBuffer cmdBuffer) const;

private:
    void CreateInstance(const VulkanContextConfig& config);
    void CreateDevice();
    void CreateCommandPool();
    void DestroyDebugMessenger() const;

    VkInstance m_Instance = VK_NULL_HANDLE;
    VkPhysicalDevice m_PhysicalDevice = VK_NULL_HANDLE;
    VkDevice m_Device = VK_NULL_HANDLE;
    VkQueue m_GraphicsQueue = VK_NULL_HANDLE;
    VkQueue m_PresentQueue = VK_NULL_HANDLE;
    VkQueue m_ComputeQueue = VK_NULL_HANDLE;
    VkCommandPool m_CommandPool = VK_NULL_HANDLE;

    uint32_t m_GraphicsQueueFamily = UINT32_MAX;
    uint32_t m_PresentQueueFamily = UINT32_MAX;
    uint32_t m_ComputeQueueFamily = UINT32_MAX;

    VkSurfaceKHR m_Surface = VK_NULL_HANDLE;
    std::unique_ptr<RHI::ISwapchain> m_Swapchain;
    VkRenderPass m_RenderPass = VK_NULL_HANDLE;

    VkDebugUtilsMessengerEXT m_DebugMessenger = VK_NULL_HANDLE;
};

} // namespace Vanguard