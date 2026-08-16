"use client";

import React, { useState } from "react";
import { X, Copy, Check, Layout, Code2, Layers, CheckCircle2 } from "lucide-react";

interface DockLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DOCK_BUILDER_CPP_CODE = `// ==============================================================================
// Vanguard Engine - Unreal Engine-Style Dear ImGui DockBuilder Implementation
// File: Source/Editor/EditorDockLayout.cpp
// Blueprint: 
//   - Root DockSpace: dockspace_id
//   - Bottom Dock (25%): Content Browser & Console / Diagnostics
//   - Right Sidebar (28%): Scene Outliner (Top 45%) & Details (Bottom 55%)
//   - Center Space: 3D Viewport Window (sits perfectly in the center)
// ==============================================================================
#include "Editor/EditorLayer.h"
#include <imgui.h>
#include <imgui_internal.h>

namespace Vanguard::Editor {

void EditorLayer::SetupDockspace(ImGuiID dockspace_id) {
    // Only configure default docking layout on first execution or explicit layout reset
    if (ImGui::DockBuilderGetNode(dockspace_id) != nullptr) {
        return;
    }

    // 1. Clear any pre-existing dock node hierarchy
    ImGui::DockBuilderRemoveNode(dockspace_id);
    ImGui::DockBuilderAddNode(dockspace_id, ImGuiDockNodeFlags_DockSpace);
    ImGui::DockBuilderSetNodeSize(dockspace_id, ImGui::GetMainViewport()->Size);

    // 2. Step 1: Split Root Node - Bottom 25% for Content Browser & Console
    ImGuiID dock_id_bottom = 0;
    ImGuiID dock_id_top = 0;
    ImGui::DockBuilderSplitNode(dockspace_id, ImGuiDir_Down, 0.25f, &dock_id_bottom, &dock_id_top);

    // 3. Step 2: Split Top Node - Right 28% for Outliner/Details, leaving Center for 3D Viewport
    ImGuiID dock_id_right = 0;
    ImGuiID dock_id_center = 0; // Dedicated 3D Viewport node sitting perfectly in the center
    ImGui::DockBuilderSplitNode(dock_id_top, ImGuiDir_Right, 0.28f, &dock_id_right, &dock_id_center);

    // 4. Step 3: Split Right Sidebar into Outliner (Top 45%) and Details / Properties (Bottom 55%)
    ImGuiID dock_id_right_top = 0;
    ImGuiID dock_id_right_bottom = 0;
    ImGui::DockBuilderSplitNode(dock_id_right, ImGuiDir_Up, 0.45f, &dock_id_right_top, &dock_id_right_bottom);

    // 5. Step 4: Dock Windows into respective Node IDs
    // Center Node: 3D Viewport
    ImGui::DockBuilderDockWindow("3D Viewport##MainViewport", dock_id_center);

    // Right Sidebar Nodes: Scene Outliner (Top) & Details Inspector (Bottom)
    ImGui::DockBuilderDockWindow("Scene Outliner##Hierarchy", dock_id_right_top);
    ImGui::DockBuilderDockWindow("Details##PropertyInspector", dock_id_right_bottom);

    // Bottom Node: Content Browser, Console CLI, and Engine Diagnostics Tabs
    ImGui::DockBuilderDockWindow("Content Browser##AssetBrowser", dock_id_bottom);
    ImGui::DockBuilderDockWindow("Console##CommandCLI", dock_id_bottom);
    ImGui::DockBuilderDockWindow("Render Graph Pipeline##Debug", dock_id_bottom);
    ImGui::DockBuilderDockWindow("Tracy Profiler##Timeline", dock_id_bottom);
    ImGui::DockBuilderDockWindow("Jolt Physics Debugger##Sim", dock_id_bottom);
    ImGui::DockBuilderDockWindow("Memory Struct Alignment##Layout", dock_id_bottom);

    // 6. Lock and finalize the layout
    ImGui::DockBuilderFinish(dockspace_id);
}

} // namespace Vanguard::Editor`;

export const DockLayoutModal: React.FC<DockLayoutModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(DOCK_BUILDER_CPP_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121622] border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="p-4 bg-[#171d2b] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                ImGui::DockBuilder Layout Blueprint Architecture
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Unreal Engine Layout: 3D Viewport in Center, Outliner (45%) / Details (55%) on Right Sidebar, Content Browser &amp; Console across Bottom (25%)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied C++" : "Copy C++ Code"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Blueprint Visual Diagram */}
        <div className="p-4 bg-[#0d1017] border-b border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2 font-mono">
            Optical Blueprint Layout Structure (Unreal Engine Architecture)
          </span>
          <div className="grid grid-cols-12 gap-2 h-44 font-mono text-[11px] text-center">
            {/* Center Viewport (9 cols) */}
            <div className="col-span-9 bg-sky-950/30 border-2 border-dashed border-sky-500/60 rounded-lg p-2 flex flex-col justify-center items-center text-sky-200 shadow-inner">
              <span className="font-bold text-sm">3D VIEWPORT WINDOW</span>
              <span className="text-[11px] text-slate-400">Dedicated Center Space (Remaining Node)</span>
              <span className="text-[9.5px] text-slate-500 mt-1">Vulkan 1.3 PBR Offscreen Framebuffer (ImGuizmo &amp; Viewport Overlay)</span>
            </div>

            {/* Right Sidebar (3 cols, split 45% top / 55% bottom) */}
            <div className="col-span-3 flex flex-col gap-2">
              <div className="h-[45%] bg-slate-800/80 border border-slate-700 rounded-lg p-1.5 flex flex-col justify-center items-center text-emerald-300">
                <span className="font-bold text-xs">SCENE OUTLINER</span>
                <span className="text-[9.5px] text-slate-400">Top 45%</span>
              </div>
              <div className="h-[55%] bg-slate-800/80 border border-slate-700 rounded-lg p-1.5 flex flex-col justify-center items-center text-amber-300">
                <span className="font-bold text-xs">DETAILS INSPECTOR</span>
                <span className="text-[9.5px] text-slate-400">Bottom 55%</span>
              </div>
            </div>

            {/* Bottom Dock (12 cols, 25% height) */}
            <div className="col-span-12 bg-slate-900 border border-slate-700/80 rounded-lg p-2 flex items-center justify-between text-slate-300 px-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-violet-400">BOTTOM DOCK (25%):</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-sky-300 font-bold">Content Browser</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-bold">Console / Output Log</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400">Render Graph</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400">Tracy Profiler</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400">Jolt Physics</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400">Memory Structs</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                ImGui::DockBuilderFinish()
              </span>
            </div>
          </div>
        </div>

        {/* C++ Code Display */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0a0d14] font-mono text-xs text-slate-300">
          <pre className="leading-relaxed text-emerald-400/90 whitespace-pre">
            {DOCK_BUILDER_CPP_CODE}
          </pre>
        </div>
      </div>
    </div>
  );
};
