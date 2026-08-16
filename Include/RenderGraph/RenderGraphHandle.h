#pragma once
#include <cstdint>
#include <string>
#include <vulkan/vulkan.h>

namespace Vanguard {

// ==========================================
// Render Graph Resource Handles
// ==========================================
// Opaque index-based handles returned by RenderGraph::CreateTransientTexture().
// Handles are stable for the lifetime of the frame they were created in and
// resolve to concrete VkImage objects during RenderGraph::Execute().

struct RGTextureHandle {
    uint32_t Index = UINT32_MAX;

    [[nodiscard]] bool IsValid() const noexcept { return Index != UINT32_MAX; }

    bool operator==(const RGTextureHandle& other) const noexcept { return Index == other.Index; }
    bool operator!=(const RGTextureHandle& other) const noexcept { return Index != other.Index; }
};

struct RGBufferHandle {
    uint32_t Index = UINT32_MAX;

    [[nodiscard]] bool IsValid() const noexcept { return Index != UINT32_MAX; }

    bool operator==(const RGBufferHandle& other) const noexcept { return Index == other.Index; }
    bool operator!=(const RGBufferHandle& other) const noexcept { return Index != other.Index; }
};

} // namespace Vanguard