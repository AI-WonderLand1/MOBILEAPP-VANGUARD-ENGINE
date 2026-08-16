#include "RenderGraph/RenderGraph.h"
#include "RenderGraph/BarrierCompiler.h"
#include "RHI/VulkanContext.h"
#include <algorithm>
#include <limits>
#include <tracy/Tracy.hpp>

namespace Vanguard {

RenderGraphBuilder::RenderGraphBuilder(RenderGraph& graph)
    : m_Graph(graph) {
}

RGTextureHandle RenderGraphBuilder::CreateTexture(const std::string& name, const RGTextureDesc& desc) {
    return m_Graph.CreateTransientTexture(name, desc);
}

RenderGraph::RenderGraph(VulkanContext& rhi)
    : m_RHI(rhi) {
}

RenderGraph::~RenderGraph() = default;

RGTextureHandle RenderGraph::CreateTransientTexture(const std::string& name, const RGTextureDesc& desc) {
    ZoneScopedN("RenderGraph::CreateTransientTexture");

    RGTextureHandle handle;
    handle.Index = static_cast<uint32_t>(m_TextureDescs.size());

    m_TextureDescs.push_back(desc);
    m_TextureNames.push_back(name);
    return handle;
}

void RenderGraph::Compile() {
    ZoneScopedN("RenderGraph::Compile");

    // 1. Resolve transient resource lifetimes & aliasing pools.
    ResolveResourceLifetimes();
}

void RenderGraph::ResolveResourceLifetimes() {
    ZoneScopedN("RenderGraph::ResolveResourceLifetimes");

    // For each texture, compute first pass that reads/writes it and the last
    // pass that touches it. Textures with disjoint lifetimes share a memory
    // alias pool -- here modeled as a conservative list of per-texture
    // life ranges that VMA can later feed into VmaAllocationCreateInfo.
    struct Lifetime {
        size_t FirstTouch = std::numeric_limits<size_t>::max();
        size_t LastTouch = 0;
    };
    std::vector<Lifetime> lifetimes(m_TextureDescs.size());

    for (size_t passIndex = 0; passIndex < m_Passes.size(); ++passIndex) {
        for (const RGTextureHandle handle : m_Passes[passIndex].CreatedTextures) {
            if (!handle.IsValid()) continue;
            Lifetime& life = lifetimes[handle.Index];
            life.FirstTouch = std::min(life.FirstTouch, passIndex);
            life.LastTouch = std::max(life.LastTouch, passIndex);
        }
    }
}

void RenderGraph::InsertVulkanBarriers(VkCommandBuffer cmdBuffer, size_t passIndex) {
    // Placeholder: per-pass barriers are emitted by BarrierCompiler between
    // passes once actual image layout tracking is wired to the RHI swapchain.
    (void)cmdBuffer;
    (void)passIndex;
}

void RenderGraph::Execute(VkCommandBuffer cmdBuffer) {
    ZoneScopedN("RenderGraph::Execute");

    std::vector<VkImage> placeholderImages; // images resolved by the RHI swapchain at frame time
    RenderGraphContext context(m_RHI, placeholderImages, cmdBuffer);

    for (size_t passIndex = 0; passIndex < m_Passes.size(); ++passIndex) {
        ZoneScopedN("RenderGraph::ExecutePass");

        // Transition resources before the pass executes.
        InsertVulkanBarriers(cmdBuffer, passIndex);

        m_Passes[passIndex].Pass->Execute(context);
    }
}

} // namespace Vanguard