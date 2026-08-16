#pragma once
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <vulkan/vulkan.h>
#include "RenderGraph/RenderGraphHandle.h"

namespace Vanguard {

class VulkanContext;
class RenderGraphBuilder;
class RenderGraphContext;

struct RGTextureDesc {
    uint32_t Width = 1920;
    uint32_t Height = 1080;
    VkFormat Format = VK_FORMAT_R8G8B8A8_UNORM;
    VkImageUsageFlags Usage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT | VK_IMAGE_USAGE_SAMPLED_BIT;
};

class IRenderPass {
public:
    virtual ~IRenderPass() = default;
    virtual const std::string& GetName() const = 0;
    virtual void Setup(RenderGraphBuilder& builder) = 0;
    virtual void Execute(RenderGraphContext& context) = 0;
};

class RenderGraph {
public:
    RenderGraph(VulkanContext& rhi);
    ~RenderGraph();

    // Pass Registration
    template<typename PassData, typename SetupFn, typename ExecFn>
    const PassData& AddPass(const std::string& name, SetupFn&& setup, ExecFn&& exec);

    // Frame Compilation & Execution
    void Compile();
    void Execute(VkCommandBuffer cmdBuffer);

    // Resource Management
    RGTextureHandle CreateTransientTexture(const std::string& name, const RGTextureDesc& desc);

private:
    VulkanContext& m_RHI;
    std::vector<std::unique_ptr<IRenderPass>> m_Passes;
    std::vector<RGTextureDesc> m_TextureDescs;

    // Transient Memory Aliasing Pools
    void ResolveResourceLifetimes();
    void InsertVulkanBarriers(VkCommandBuffer cmdBuffer, size_t passIndex);
};

} // namespace Vanguard