#pragma once
#include <vulkan/vulkan.h>

namespace Vanguard {

// ==========================================
// Vulkan Synchronization2 Barrier Compiler
// ==========================================
// Stateless helper that emits VkImageMemoryBarrier2 / VkDependencyInfo records
// using the Vulkan 1.3 core synchronization2 API. The RenderGraph calls into
// this compiler to resolve pipeline stage and image layout transitions between
// passes without hand-written barrier code.
class BarrierCompiler {
public:
    BarrierCompiler() = default;
    ~BarrierCompiler() = default;

    // Emit a single image layout transition (with optional access mask change).
    // Skips emission entirely if oldLayout == newLayout and srcAccess == dstAccess.
    void EmitImageBarrier(
        VkCommandBuffer cmdBuffer,
        VkImage image,
        VkImageLayout oldLayout,
        VkImageLayout newLayout,
        VkPipelineStageFlags2 srcStage,
        VkPipelineStageFlags2 dstStage,
        VkAccessFlags2 srcAccess,
        VkAccessFlags2 dstAccess,
        VkImageAspectFlags aspectFlags = VK_IMAGE_ASPECT_COLOR_BIT
    );

    // Emit a full subresource range barrier over all mip levels and array layers.
    void EmitImageBarrierFull(
        VkCommandBuffer cmdBuffer,
        VkImage image,
        VkImageLayout oldLayout,
        VkImageLayout newLayout,
        VkPipelineStageFlags2 srcStage,
        VkPipelineStageFlags2 dstStage,
        VkAccessFlags2 srcAccess,
        VkAccessFlags2 dstAccess,
        VkImageAspectFlags aspectFlags
    );

    // Emit a global buffer memory barrier (transfer of ownership / host staging).
    void EmitBufferBarrier(
        VkCommandBuffer cmdBuffer,
        VkBuffer buffer,
        VkDeviceSize offset,
        VkDeviceSize size,
        VkPipelineStageFlags2 srcStage,
        VkPipelineStageFlags2 dstStage,
        VkAccessFlags2 srcAccess,
        VkAccessFlags2 dstAccess
    );
};

} // namespace Vanguard