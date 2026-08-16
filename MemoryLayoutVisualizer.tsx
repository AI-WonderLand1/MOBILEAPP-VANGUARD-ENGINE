"use client";

import React, { useState } from "react";
import { Binary, Cpu, Info, Layers, Sparkles } from "lucide-react";

interface StructMember {
  name: string;
  type: string;
  size: number;
  alignment: number;
  color: string;
}

export const MemoryLayoutVisualizer: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<"TransformComponent" | "StaticMeshComponent" | "Custom">("TransformComponent");

  const presets: Record<string, StructMember[]> = {
    TransformComponent: [
      { name: "m_LocalPosition", type: "glm::vec3 (float[3])", size: 12, alignment: 4, color: "#38bdf8" },
      { name: "m_LocalRotation", type: "glm::vec3 (float[3])", size: 12, alignment: 4, color: "#818cf8" },
      { name: "m_LocalScale", type: "glm::vec3 (float[3])", size: 12, alignment: 4, color: "#34d399" },
      { name: "m_bIsStatic", type: "bool", size: 1, alignment: 1, color: "#f472b6" },
      { name: "[Padding / Alignment]", type: "Padding (uint8_t[3])", size: 3, alignment: 1, color: "#475569" },
    ],
    StaticMeshComponent: [
      { name: "m_MeshAssetGUID", type: "GUID (uint64_t[2])", size: 16, alignment: 8, color: "#38bdf8" },
      { name: "m_MaterialAssetGUID", type: "GUID (uint64_t[2])", size: 16, alignment: 8, color: "#818cf8" },
      { name: "m_bCastShadows", type: "bool", size: 1, alignment: 1, color: "#f472b6" },
      { name: "m_bReceiveDecals", type: "bool", size: 1, alignment: 1, color: "#fb923c" },
      { name: "[Padding Bytes]", type: "Padding", size: 2, alignment: 1, color: "#475569" },
      { name: "m_RoughnessMultiplier", type: "float", size: 4, alignment: 4, color: "#e879f9" },
      { name: "m_MetallicMultiplier", type: "float", size: 4, alignment: 4, color: "#a78bfa" },
      { name: "m_BaseColorTint", type: "glm::vec4 (float[4])", size: 16, alignment: 16, color: "#2dd4bf" },
    ],
  };

  const currentMembers = presets[selectedPreset] || presets.TransformComponent;

  // Calculate layout offsets purely
  const { layoutEntries, totalStructSize } = currentMembers.reduce<{
    layoutEntries: Array<StructMember & { offset: number }>;
    totalStructSize: number;
  }>(
    (acc, m) => {
      acc.layoutEntries.push({
        ...m,
        offset: acc.totalStructSize,
      });
      acc.totalStructSize += m.size;
      return acc;
    },
    { layoutEntries: [], totalStructSize: 0 }
  );

  return (
    <div id="memory-layout-visualizer" className="h-full flex flex-col bg-[#0e121a] text-xs font-sans text-slate-300">
      {/* Header */}
      <div className="p-3 bg-[#141924] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Memory Offset & Struct Alignment Engine
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-500">Preset:</span>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
          >
            <option value="TransformComponent">TransformComponent (48 Bytes)</option>
            <option value="StaticMeshComponent">StaticMeshComponent (60 Bytes)</option>
          </select>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Theory Callout */}
        <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-[11px] font-mono leading-relaxed text-slate-300">
            <span className="font-bold text-sky-300">How Macro Reflection Works in C++23:</span>
            <p className="mt-1">
              By adhering to Standard Layout constraints, the engine computes compile-time member byte offsets using{" "}
              <code className="text-sky-300 bg-slate-950 px-1 py-0.5 rounded">offsetof(ClassType, member)</code>. At runtime, the Dear ImGui Property Inspector computes the exact raw pointer:
              <br />
              <code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded mt-1 inline-block">
                void* propPtr = static_cast&lt;char*&gt;(instance) + propMeta.Offset;
              </code>
            </p>
          </div>
        </div>

        {/* Visual Memory Block Bar */}
        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2 font-mono">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Struct Memory Span (0 to {totalStructSize} Bytes)</span>
            <span className="text-emerald-400 font-bold">Total Size: {totalStructSize} Bytes</span>
          </div>

          <div className="h-14 w-full bg-slate-900 rounded-lg overflow-hidden flex border border-slate-800 p-0.5">
            {layoutEntries.map((m) => {
              const widthPct = (m.size / totalStructSize) * 100;
              return (
                <div
                  key={m.name}
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: m.color,
                  }}
                  className="h-full border-r border-slate-950/40 flex flex-col items-center justify-center p-1 text-slate-950 font-bold overflow-hidden cursor-default transition hover:brightness-110"
                  title={`${m.name}: Offset 0x${m.offset.toString(16).padStart(2, "0")} (${m.size} Bytes)`}
                >
                  <span className="text-[10px] truncate">{m.name}</span>
                  <span className="text-[8px] opacity-80">{m.size}B</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Offset Table */}
        <div className="bg-slate-900/80 rounded-lg border border-slate-800 overflow-hidden font-mono text-xs">
          <div className="p-2.5 bg-slate-800/80 font-semibold text-slate-300 border-b border-slate-800 grid grid-cols-12">
            <span className="col-span-3">Offset (Hex / Dec)</span>
            <span className="col-span-4">Member Name</span>
            <span className="col-span-3">C++ Data Type</span>
            <span className="col-span-2 text-right">Size (Bytes)</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {layoutEntries.map((m) => (
              <div key={m.name} className="p-2.5 grid grid-cols-12 items-center hover:bg-slate-800/40 transition">
                <span className="col-span-3 text-sky-400 font-bold">
                  +0x{m.offset.toString(16).toUpperCase().padStart(4, "0")} ({m.offset})
                </span>
                <span className="col-span-4 text-slate-200 font-medium">{m.name}</span>
                <span className="col-span-3 text-slate-400 text-[11px]">{m.type}</span>
                <span className="col-span-2 text-right font-semibold text-emerald-400">{m.size} B</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
