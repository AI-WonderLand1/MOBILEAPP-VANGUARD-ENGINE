"use client";

import React, { useState } from "react";
import {
  RENDER_GRAPH_PASSES,
  RENDER_GRAPH_RESOURCES,
  VULKAN_BARRIER_RULES,
} from "@/lib/engine-data/render-graph-data";
import { PassType, RenderGraphPass } from "@/lib/engine-data/types";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  Layers,
  Network,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const RenderGraphVisualizer: React.FC = () => {
  const [selectedPassId, setSelectedPassId] = useState<string>("pass-deferred-lighting");
  const [viewMode, setViewMode] = useState<"dag" | "barriers" | "aliasing" | "cpp">("dag");

  const selectedPass = RENDER_GRAPH_PASSES.find((p) => p.id === selectedPassId) || RENDER_GRAPH_PASSES[0];

  // Group resources by transient alias pool
  const aliasPools: Record<string, typeof RENDER_GRAPH_RESOURCES> = {};
  RENDER_GRAPH_RESOURCES.forEach((res) => {
    if (res.aliasPoolId) {
      if (!aliasPools[res.aliasPoolId]) aliasPools[res.aliasPoolId] = [];
      aliasPools[res.aliasPoolId].push(res);
    }
  });

  return (
    <div id="render-graph-pipeline-studio" className="h-full flex flex-col bg-[#11141b] text-xs font-sans">
      {/* Header Toolbar */}
      <div className="p-3 bg-[#161a23] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-violet-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Stateless Render Graph Pipeline
          </span>
          <span className="bg-violet-950/80 text-violet-300 text-[10px] font-mono px-2 py-0.5 rounded border border-violet-800/60">
            Vulkan 1.3 Synchronization2
          </span>
        </div>

        {/* View Mode Tabs */}
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setViewMode("dag")}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
              viewMode === "dag" ? "bg-violet-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Pass DAG</span>
          </button>

          <button
            onClick={() => setViewMode("barriers")}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
              viewMode === "barriers" ? "bg-violet-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Barrier Compiler</span>
          </button>

          <button
            onClick={() => setViewMode("aliasing")}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
              viewMode === "aliasing" ? "bg-violet-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>VMA Memory Aliasing</span>
          </button>

          <button
            onClick={() => setViewMode("cpp")}
            className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
              viewMode === "cpp" ? "bg-violet-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>C++ Pass Code</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Interactive Node DAG Strip */}
        <div className="w-full md:w-5/12 border-r border-slate-800 overflow-y-auto p-4 space-y-3 bg-[#0d1017]">
          <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Pass Execution Graph ({RENDER_GRAPH_PASSES.length} Passes)</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              DAG Validated
            </span>
          </div>

          <div className="space-y-2">
            {RENDER_GRAPH_PASSES.map((pass, index) => {
              const isSelected = pass.id === selectedPassId;
              const isCompute = pass.type === PassType.Compute;

              return (
                <div
                  key={pass.id}
                  onClick={() => setSelectedPassId(pass.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition relative ${
                    isSelected
                      ? "bg-violet-950/40 border-violet-500 shadow-lg shadow-violet-500/10"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono flex items-center justify-center border border-slate-700">
                        {index + 1}
                      </span>
                      <span className="font-semibold font-mono text-slate-200 text-xs">
                        {pass.name}
                      </span>
                    </div>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        isCompute
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-sky-950 text-sky-300 border border-sky-800"
                      }`}
                    >
                      {pass.queue}
                    </span>
                  </div>

                  <p className="text-slate-400 text-[11px] mt-1 line-clamp-1">{pass.description}</p>

                  <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-slate-500">
                    <div>
                      <span className="text-slate-400 font-medium">Reads:</span> {pass.reads.length} res
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Writes:</span> {pass.writes.length} res
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Shader:</span> {pass.pipelineState.shader.split(" ")[0]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Inspector based on ViewMode */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#11141b] space-y-4">
          {viewMode === "dag" && (
            <div className="space-y-4">
              {/* Selected Pass Overview Card */}
              <div className="p-4 bg-slate-900/90 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="font-mono text-sm font-bold text-violet-400">{selectedPass.name}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">{selectedPass.description}</p>
                  </div>
                  <span className="px-2 py-1 rounded bg-violet-950 text-violet-300 font-mono text-xs border border-violet-800">
                    Queue: {selectedPass.queue}
                  </span>
                </div>

                {/* Pipeline State Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Depth Test:</span>
                    <span className={selectedPass.pipelineState.depthTest ? "text-emerald-400" : "text-slate-400"}>
                      {selectedPass.pipelineState.depthTest ? "Enabled (LESS_EQUAL)" : "Disabled"}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Depth Write:</span>
                    <span className={selectedPass.pipelineState.depthWrite ? "text-emerald-400" : "text-slate-400"}>
                      {selectedPass.pipelineState.depthWrite ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Cull Mode:</span>
                    <span className="text-slate-300">{selectedPass.pipelineState.cullMode}</span>
                  </div>

                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Blend Mode:</span>
                    <span className="text-slate-300">{selectedPass.pipelineState.blendMode}</span>
                  </div>
                </div>

                {/* Resource Reads & Writes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Inputs / Reads */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <h4 className="font-mono text-xs font-semibold text-sky-400 mb-2 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                      Read Resources (Inputs)
                    </h4>
                    {selectedPass.reads.length === 0 ? (
                      <p className="text-slate-500 font-mono text-[11px]">None (Root Generator)</p>
                    ) : (
                      <div className="space-y-1.5 font-mono text-[11px]">
                        {selectedPass.reads.map((rId) => {
                          const res = RENDER_GRAPH_RESOURCES.find((r) => r.id === rId);
                          return (
                            <div key={rId} className="bg-slate-900 p-1.5 rounded border border-slate-800 flex justify-between">
                              <span className="text-slate-300">{res?.name || rId}</span>
                              <span className="text-sky-400 text-[10px]">{selectedPass.inputLayouts?.[rId] || "SHADER_READ"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Outputs / Writes */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <h4 className="font-mono text-xs font-semibold text-rose-400 mb-2 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Written Resources (Outputs)
                    </h4>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {selectedPass.writes.map((rId) => {
                        const res = RENDER_GRAPH_RESOURCES.find((r) => r.id === rId);
                        return (
                          <div key={rId} className="bg-slate-900 p-1.5 rounded border border-slate-800 flex justify-between">
                            <span className="text-slate-300">{res?.name || rId}</span>
                            <span className="text-rose-400 text-[10px]">{selectedPass.outputLayouts?.[rId] || "ATTACHMENT_OPTIMAL"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === "barriers" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Automated Vulkan 1.3 Synchronization2 Barriers
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Total Active Sync2 Transitions: {VULKAN_BARRIER_RULES.length}
                </span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {VULKAN_BARRIER_RULES.map((rule, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-violet-400 font-semibold">{rule.resource}</span>
                      <span className="text-[10px] text-slate-500">{rule.subresource}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950 p-2 rounded border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Source Pass & Stage:</span>
                        <span className="text-sky-300 font-semibold">{rule.sourcePass}</span>
                        <div className="text-[10px] text-slate-400 truncate">{rule.srcStage}</div>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px]">Dest Pass & Stage:</span>
                        <span className="text-emerald-300 font-semibold">{rule.destPass}</span>
                        <div className="text-[10px] text-slate-400 truncate">{rule.dstStage}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded">
                      <span className="text-rose-400">{rule.oldLayout}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="text-emerald-400">{rule.newLayout}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === "aliasing" && (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <h3 className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Vulkan Memory Allocator (VMA) Transient Aliasing Pools
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Non-overlapping passes reuse the exact same physical VRAM allocations, reducing total frame memory footprint from 148MB down to 68MB.
                </p>
              </div>

              {Object.entries(aliasPools).map(([poolId, resList]) => (
                <div key={poolId} className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-emerald-400 font-bold">Pool: {poolId}</span>
                    <span className="text-[10px] text-slate-400">
                      Max Bound Size: {(Math.max(...resList.map((r) => r.sizeBytes)) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>

                  <div className="space-y-1">
                    {resList.map((r) => (
                      <div key={r.id} className="p-2 bg-slate-950 rounded border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-slate-200 font-medium">{r.name}</span>
                          <span className="text-slate-500 text-[10px] block">{r.format}</span>
                        </div>
                        <span className="text-[11px] text-sky-400">
                          {r.width}x{r.height} ({(r.sizeBytes / (1024 * 1024)).toFixed(2)}MB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === "cpp" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-xs text-slate-400">
                <span>C++ Render Pass Declaration: {selectedPass.name}</span>
                <span className="text-[10px] text-slate-500">RenderGraph.AddPass&lt;T&gt;()</span>
              </div>

              <pre className="p-3 bg-slate-950 text-slate-200 rounded-lg border border-slate-800 font-mono text-[11px] leading-relaxed overflow-x-auto">
                {selectedPass.sampleCodeSnippet ||
                  `// Auto-generated pass signature
auto& pass = builder.AddPass<${selectedPass.name}Data>("${selectedPass.name}",
    [&](RenderGraphBuilder& b, ${selectedPass.name}Data& data) {
        // Setup reads & writes
    },
    [=](const ${selectedPass.name}Data& data, RenderGraphContext& ctx) {
        // Execution code
    }
);`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
