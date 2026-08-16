#pragma once
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <unordered_map>
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

// ---------------------------------------------------------------------------
// Per-Pass Builder: registers transient resources during IRenderPass::Setup().
// ---------------------------------------------------------------------------
class RenderGraphBuilder {
public:
    explicit RenderGraphBuilder(RenderGraph& graph) : m_Graph(graph) {}

    RGTextureHandle CreateTexture(const std::string& name, const RGTextureDesc& desc);

private:
    RenderGraph& m_Graph;
};

// ---------------------------------------------------------------------------
// Per-Pass Execution Context: resolves handles to concrete GPU objects.
// ---------------------------------------------------------------------------
class RenderGraphContext {
public:
    RenderGraphContext(VulkanContext& rhi, const std::vector<VkImage>& images, VkCommandBuffer cmdBuffer)
        : m_RHI(rhi), m_Images(images), m_CommandBuffer(cmdBuffer) {}

    [[nodiscard]] VulkanContext& GetVulkanContext() const noexcept { return m_RHI; }
    [[nodiscard]] VkCommandBuffer GetCommandBuffer() const noexcept { return m_CommandBuffer; }
    [[nodiscard]] VkImage GetImage(RGTextureHandle handle) const {
        return handle.IsValid() && handle.Index < m_Images.size() ? m_Images[handle.Index] : VK_NULL_HANDLE;
    }

private:
    VulkanContext& m_RHI;
    const std::vector<VkImage>& m_Images;
    VkCommandBuffer m_CommandBuffer;
};

// ---------------------------------------------------------------------------
// Pass Interface
// ---------------------------------------------------------------------------
class IRenderPass {
public:
    virtual ~IRenderPass() = default;
    virtual const std::string& GetName() const = 0;
    virtual void Setup(RenderGraphBuilder& builder) = 0;
    virtual void Execute(RenderGraphContext& context) = 0;
};

// ---------------------------------------------------------------------------
// Stateless Render Graph
// ---------------------------------------------------------------------------
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

    [[nodiscard]] size_t GetPassCount() const noexcept { return m_Passes.size(); }

private:
    // Concrete storage for one registered pass instance.
    struct PassInstance {
        std::unique_ptr<IRenderPass> Pass;
        std::vector<RGTextureHandle> CreatedTextures; // handles created in Setup()
    };

    VulkanContext& m_RHI;
    std::vector<PassInstance> m_Passes;
    std::vector<RGTextureDesc> m_TextureDescs;
    std::vector<std::string> m_TextureNames;

    // Transient Memory Aliasing Pools
    void ResolveResourceLifetimes();
    void InsertVulkanBarriers(VkCommandBuffer cmdBuffer, size_t passIndex);
};

// ===========================================================================
// Template Implementation (must be visible at instantiation site)
// ===========================================================================

template<typename PassData, typename SetupFn, typename ExecFn>
const PassData& RenderGraph::AddPass(const std::string& name, SetupFn&& setup, ExecFn&& exec) {
    struct ConcretePass final : IRenderPass {
        std::string Name;
        PassData Data;
        SetupFn SetupFn_;
        ExecFn ExecFn_;

        ConcretePass(std::string name, PassData data, SetupFn setup, ExecFn exec)
            : Name(std::move(name)), Data(std::move(data)),
              SetupFn_(std::move(setup)), ExecFn_(std::move(exec)) {}

        const std::string& GetName() const override { return Name; }

        void Setup(RenderGraphBuilder& builder) override {
            SetupFn_(builder, Data);
        }

        void Execute(RenderGraphContext& context) override {
            ExecFn_(context, Data);
        }
    };

    PassData data{};
    auto pass = std::make_unique<ConcretePass>(name, std::move(data), std::forward<SetupFn>(setup), std::forward<ExecFn>(exec));

    RenderGraphBuilder builder(*this);
    pass->Setup(builder);

    PassInstance instance;
    instance.Pass = std::move(pass);
    m_Passes.push_back(std::move(instance));
    return static_cast<ConcretePass*>(m_Passes.back().Pass.get())->Data;
}

} // namespace Vanguard