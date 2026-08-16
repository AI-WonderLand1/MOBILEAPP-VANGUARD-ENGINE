import { PassType, RenderGraphPass, RenderGraphResource, ResourceType } from "./types";

export const RENDER_GRAPH_RESOURCES: RenderGraphResource[] = [
  {
    id: "res-shadow-map",
    name: "Directional_Shadow_Atlas",
    type: ResourceType.DepthStencil,
    format: "VK_FORMAT_D32_SFLOAT (DXGI_FORMAT_D32_FLOAT)",
    width: 2048,
    height: 2048,
    sizeBytes: 2048 * 2048 * 4,
    aliasPoolId: "pool-depth-transient",
  },
  {
    id: "res-gbuffer-albedo",
    name: "GBuffer_Albedo_Metallic",
    type: ResourceType.Texture2D,
    format: "VK_FORMAT_R8G8B8A8_SRGB (DXGI_FORMAT_R8G8B8A8_UNORM)",
    width: 1920,
    height: 1080,
    sizeBytes: 1920 * 1080 * 4,
    aliasPoolId: "pool-gbuffer",
  },
  {
    id: "res-gbuffer-normal",
    name: "GBuffer_WorldNormal_Roughness",
    type: ResourceType.Texture2D,
    format: "VK_FORMAT_R16G16B16A16_SFLOAT (DXGI_FORMAT_R16G16B16A16_FLOAT)",
    width: 1920,
    height: 1080,
    sizeBytes: 1920 * 1080 * 8,
    aliasPoolId: "pool-gbuffer",
  },
  {
    id: "res-gbuffer-depth",
    name: "GBuffer_Scene_Depth",
    type: ResourceType.DepthStencil,
    format: "VK_FORMAT_D32_SFLOAT_S8_UINT",
    width: 1920,
    height: 1080,
    sizeBytes: 1920 * 1080 * 4,
    aliasPoolId: "pool-depth-main",
  },
  {
    id: "res-ssao-target",
    name: "SSAO_Raw_Ambient_Mask",
    type: ResourceType.Texture2D,
    format: "VK_FORMAT_R8_UNORM",
    width: 960,
    height: 540,
    sizeBytes: 960 * 540 * 1,
    aliasPoolId: "pool-post-transient", // Aliased with Bloom Scratchpad!
  },
  {
    id: "res-hdr-lighting",
    name: "HDR_Accumulation_Buffer",
    type: ResourceType.Texture2D,
    format: "VK_FORMAT_R16G16B16A16_SFLOAT",
    width: 1920,
    height: 1080,
    sizeBytes: 1920 * 1080 * 8,
    aliasPoolId: "pool-hdr-scene",
  },
  {
    id: "res-bloom-halfres",
    name: "Bloom_Blur_Chain_Output",
    type: ResourceType.Texture2D,
    format: "VK_FORMAT_B10G11R11_UFLOAT_PACK32",
    width: 960,
    height: 540,
    sizeBytes: 960 * 540 * 4,
    aliasPoolId: "pool-post-transient", // Reuses SSAO memory after SSAO is discarded!
  },
  {
    id: "res-swapchain-backbuffer",
    name: "Swapchain_Final_Backbuffer",
    type: ResourceType.Texture2D,
    format: "VK_FORMAT_B8G8R8A8_SRGB",
    width: 1920,
    height: 1080,
    sizeBytes: 1920 * 1080 * 4,
  },
];

export const RENDER_GRAPH_PASSES: RenderGraphPass[] = [
  {
    id: "pass-shadow",
    name: "ShadowDepthPass",
    type: PassType.Raster,
    reads: [],
    writes: ["res-shadow-map"],
    description: "Renders cascading shadow maps from directional light viewpoint into depth atlas.",
    queue: "Graphics",
    inputLayouts: {
      "res-shadow-map": "VK_IMAGE_LAYOUT_UNDEFINED",
    },
    outputLayouts: {
      "res-shadow-map": "VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL",
    },
    pipelineState: {
      depthTest: true,
      depthWrite: true,
      cullMode: "VK_CULL_MODE_FRONT_BIT (Slope Bias)",
      blendMode: "Disabled",
      shader: "ShadowMap.vert / Null.frag",
    },
    sampleCodeSnippet: `struct ShadowPassData {
    RGTextureHandle shadowAtlasDepth;
};

auto& pass = builder.AddPass<ShadowPassData>("ShadowDepthPass",
    [&](RenderGraphBuilder& b, ShadowPassData& data) {
        data.shadowAtlasDepth = b.CreateDepthStencil("Directional_Shadow_Atlas", {2048, 2048, VK_FORMAT_D32_SFLOAT});
        b.WriteDepthStencil(data.shadowAtlasDepth, VK_ATTACHMENT_LOAD_OP_CLEAR);
    },
    [=](const ShadowPassData& data, RenderGraphContext& ctx) {
        ctx.BeginDynamicRendering({ .depthAttachment = data.shadowAtlasDepth });
        // Draw shadow caster instances with push constants...
        ctx.EndDynamicRendering();
    }
);`,
  },
  {
    id: "pass-gbuffer",
    name: "GBufferPass",
    type: PassType.Raster,
    reads: [],
    writes: ["res-gbuffer-albedo", "res-gbuffer-normal", "res-gbuffer-depth"],
    description: "Draws opaque geometry writing diffuse albedo, world-space normals, roughness, metallic, and depth buffer.",
    queue: "Graphics",
    inputLayouts: {
      "res-gbuffer-albedo": "VK_IMAGE_LAYOUT_UNDEFINED",
      "res-gbuffer-normal": "VK_IMAGE_LAYOUT_UNDEFINED",
      "res-gbuffer-depth": "VK_IMAGE_LAYOUT_UNDEFINED",
    },
    outputLayouts: {
      "res-gbuffer-albedo": "VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL",
      "res-gbuffer-normal": "VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL",
      "res-gbuffer-depth": "VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL",
    },
    pipelineState: {
      depthTest: true,
      depthWrite: true,
      cullMode: "VK_CULL_MODE_BACK_BIT",
      blendMode: "Disabled (Opaque)",
      shader: "GBuffer.vert / GBuffer.frag",
    },
    sampleCodeSnippet: `auto& pass = builder.AddPass<GBufferPassData>("GBufferPass",
    [&](RenderGraphBuilder& b, GBufferPassData& data) {
        data.albedo = b.CreateColorTarget("GBuffer_Albedo_Metallic", {1920, 1080, VK_FORMAT_R8G8B8A8_SRGB});
        data.normal = b.CreateColorTarget("GBuffer_WorldNormal_Roughness", {1920, 1080, VK_FORMAT_R16G16B16A16_SFLOAT});
        data.depth  = b.CreateDepthStencil("GBuffer_Scene_Depth", {1920, 1080, VK_FORMAT_D32_SFLOAT_S8_UINT});
        b.WriteColorAttachment(0, data.albedo, VK_ATTACHMENT_LOAD_OP_CLEAR);
        b.WriteColorAttachment(1, data.normal, VK_ATTACHMENT_LOAD_OP_CLEAR);
        b.WriteDepthStencil(data.depth, VK_ATTACHMENT_LOAD_OP_CLEAR);
    },
    [=](const GBufferPassData& data, RenderGraphContext& ctx) {
        ctx.BindPipeline(m_GBufferPipeline);
        // Bind Descriptor Sets & Execute Indirect Batches
    }
);`,
  },
  {
    id: "pass-ssao",
    name: "SSAOComputePass",
    type: PassType.Compute,
    reads: ["res-gbuffer-depth", "res-gbuffer-normal"],
    writes: ["res-ssao-target"],
    description: "Evaluates screen-space ambient occlusion hemisphere samples using depth and normals on Async Compute.",
    queue: "AsyncCompute",
    inputLayouts: {
      "res-gbuffer-depth": "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
      "res-gbuffer-normal": "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
      "res-ssao-target": "VK_IMAGE_LAYOUT_UNDEFINED",
    },
    outputLayouts: {
      "res-ssao-target": "VK_IMAGE_LAYOUT_GENERAL (Storage Image)",
    },
    pipelineState: {
      depthTest: false,
      depthWrite: false,
      cullMode: "None",
      blendMode: "None",
      shader: "SSAO.comp (16x16 threadgroups)",
    },
    sampleCodeSnippet: `auto& pass = builder.AddPass<SSAOPassData>("SSAOComputePass",
    [&](RenderGraphBuilder& b, SSAOPassData& data) {
        data.depth  = b.ReadTexture(gbuffer.depth, VK_PIPELINE_STAGE_2_COMPUTE_SHADER_BIT, VK_ACCESS_2_SHADER_READ_BIT);
        data.normal = b.ReadTexture(gbuffer.normal, VK_PIPELINE_STAGE_2_COMPUTE_SHADER_BIT, VK_ACCESS_2_SHADER_READ_BIT);
        data.ssaoOut = b.CreateStorageTexture("SSAO_Raw_Ambient_Mask", {960, 540, VK_FORMAT_R8_UNORM});
        b.WriteStorageTexture(data.ssaoOut);
    },
    [=](const SSAOPassData& data, RenderGraphContext& ctx) {
        ctx.DispatchCompute(60, 34, 1); // 960/16 x 540/16
    }
);`,
  },
  {
    id: "pass-deferred-lighting",
    name: "DeferredLightingPass",
    type: PassType.Raster,
    reads: ["res-shadow-map", "res-gbuffer-albedo", "res-gbuffer-normal", "res-gbuffer-depth", "res-ssao-target"],
    writes: ["res-hdr-lighting"],
    description: "Combines PBR Cook-Torrance BRDF, clustered point lights, analytical sun shadow PCF, and SSAO into HDR buffer.",
    queue: "Graphics",
    inputLayouts: {
      "res-shadow-map": "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
      "res-gbuffer-albedo": "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
      "res-gbuffer-normal": "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
      "res-gbuffer-depth": "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
      "res-ssao-target": "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
      "res-hdr-lighting": "VK_IMAGE_LAYOUT_UNDEFINED",
    },
    outputLayouts: {
      "res-hdr-lighting": "VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL",
    },
    pipelineState: {
      depthTest: false,
      depthWrite: false,
      cullMode: "None",
      blendMode: "Disabled (Fullscreen Quad)",
      shader: "FullscreenQuad.vert / DeferredLighting.frag",
    },
  },
  {
    id: "pass-bloom",
    name: "BloomDownsamplePass",
    type: PassType.Compute,
    reads: ["res-hdr-lighting"],
    writes: ["res-bloom-halfres"],
    description: "Karis average 13-tap threshold downsampling and Gaussian upsample blur chain for physical HDR bloom.",
    queue: "Graphics",
    inputLayouts: {
      "res-hdr-lighting": "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
      "res-bloom-halfres": "VK_IMAGE_LAYOUT_UNDEFINED",
    },
    outputLayouts: {
      "res-bloom-halfres": "VK_IMAGE_LAYOUT_GENERAL",
    },
    pipelineState: {
      depthTest: false,
      depthWrite: false,
      cullMode: "None",
      blendMode: "Additive Upsample",
      shader: "BloomDualFilter.comp",
    },
  },
  {
    id: "pass-tonemapping",
    name: "TonemapColorGradePass",
    type: PassType.Raster,
    reads: ["res-hdr-lighting", "res-bloom-halfres"],
    writes: ["res-swapchain-backbuffer"],
    description: "ACES filmic tonemapping, LUT color grading, chromatic aberration, and dithering output to SDR swapchain.",
    queue: "Graphics",
    inputLayouts: {
      "res-hdr-lighting": "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
      "res-bloom-halfres": "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
      "res-swapchain-backbuffer": "VK_IMAGE_LAYOUT_UNDEFINED",
    },
    outputLayouts: {
      "res-swapchain-backbuffer": "VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL",
    },
    pipelineState: {
      depthTest: false,
      depthWrite: false,
      cullMode: "None",
      blendMode: "Disabled",
      shader: "TonemapACES.frag",
    },
  },
  {
    id: "pass-imgui-overlay",
    name: "DearImGuiEditorPass",
    type: PassType.Raster,
    reads: [],
    writes: ["res-swapchain-backbuffer"],
    description: "Renders the Dear ImGui Docking UI, ImGuizmo 3D gizmos, Profiler overlays, and inspector windows on top.",
    queue: "Graphics",
    inputLayouts: {
      "res-swapchain-backbuffer": "VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL",
    },
    outputLayouts: {
      "res-swapchain-backbuffer": "VK_IMAGE_LAYOUT_PRESENT_SRC_KHR",
    },
    pipelineState: {
      depthTest: false,
      depthWrite: false,
      cullMode: "None",
      blendMode: "Alpha Blending",
      shader: "ImGui_Vulkan_Backend",
    },
  },
];

export const VULKAN_BARRIER_RULES = [
  {
    sourcePass: "ShadowDepthPass",
    destPass: "DeferredLightingPass",
    resource: "Directional_Shadow_Atlas",
    oldLayout: "VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL",
    newLayout: "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
    srcStage: "VK_PIPELINE_STAGE_2_LATE_FRAGMENT_TESTS_BIT",
    dstStage: "VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT",
    srcAccess: "VK_ACCESS_2_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT",
    dstAccess: "VK_ACCESS_2_SHADER_READ_BIT",
    subresource: "Aspect: VK_IMAGE_ASPECT_DEPTH_BIT",
  },
  {
    sourcePass: "GBufferPass",
    destPass: "SSAOComputePass",
    resource: "GBuffer_Scene_Depth",
    oldLayout: "VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL",
    newLayout: "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
    srcStage: "VK_PIPELINE_STAGE_2_LATE_FRAGMENT_TESTS_BIT",
    dstStage: "VK_PIPELINE_STAGE_2_COMPUTE_SHADER_BIT",
    srcAccess: "VK_ACCESS_2_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT",
    dstAccess: "VK_ACCESS_2_SHADER_READ_BIT",
    subresource: "Aspect: VK_IMAGE_ASPECT_DEPTH_BIT",
  },
  {
    sourcePass: "DeferredLightingPass",
    destPass: "BloomDownsamplePass",
    resource: "HDR_Accumulation_Buffer",
    oldLayout: "VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL",
    newLayout: "VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL",
    srcStage: "VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT",
    dstStage: "VK_PIPELINE_STAGE_2_COMPUTE_SHADER_BIT",
    srcAccess: "VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT",
    dstAccess: "VK_ACCESS_2_SHADER_READ_BIT",
    subresource: "Aspect: VK_IMAGE_ASPECT_COLOR_BIT",
  },
  {
    sourcePass: "TonemapColorGradePass",
    destPass: "DearImGuiEditorPass",
    resource: "Swapchain_Final_Backbuffer",
    oldLayout: "VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL",
    newLayout: "VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL",
    srcStage: "VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT",
    dstStage: "VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT",
    srcAccess: "VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT",
    dstAccess: "VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT | VK_ACCESS_2_COLOR_ATTACHMENT_READ_BIT",
    subresource: "Aspect: VK_IMAGE_ASPECT_COLOR_BIT",
  },
  {
    sourcePass: "DearImGuiEditorPass",
    destPass: "Vulkan_Present_Engine",
    resource: "Swapchain_Final_Backbuffer",
    oldLayout: "VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL",
    newLayout: "VK_IMAGE_LAYOUT_PRESENT_SRC_KHR",
    srcStage: "VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT",
    dstStage: "VK_PIPELINE_STAGE_2_BOTTOM_OF_PIPE_BIT",
    srcAccess: "VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT",
    dstAccess: "0 (Host Present Barrier)",
    subresource: "Aspect: VK_IMAGE_ASPECT_COLOR_BIT",
  },
];
