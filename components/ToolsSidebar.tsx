"use client";

import React, { useState } from "react";
import {
  Move,
  RotateCw,
  Scaling,
  MousePointer,
  Globe,
  Compass,
  Magnet,
  Eye,
  Box,
  Circle,
  Lightbulb,
  Camera,
  Play,
  Zap,
  Terminal,
  Layers,
  Sparkles,
  Layout,
  Code2,
  Info,
} from "lucide-react";

interface ToolsSidebarProps {
  gizmoMode: "translate" | "rotate" | "scale";
  onSetGizmoMode: (mode: "translate" | "rotate" | "scale") => void;
  onSpawnPreset: (type: "crate" | "sphere" | "light" | "camera" | "mech") => void;
  onApplyImpulse: () => void;
  onOpenConsole: () => void;
  onShowDockLayoutModal: () => void;
}

export const ToolsSidebar: React.FC<ToolsSidebarProps> = ({
  gizmoMode,
  onSetGizmoMode,
  onSpawnPreset,
  onApplyImpulse,
  onOpenConsole,
  onShowDockLayoutModal,
}) => {
  const [coordSpace, setCoordSpace] = useState<"world" | "local">("world");
  const [gridSnap, setGridSnap] = useState<number>(0.5);
  const [shadingMode, setShadingMode] = useState<"lit" | "wireframe" | "unlit" | "normals">("lit");

  return (
    <aside
      id="vanguard-editor-tools-sidebar"
      className="w-full h-full bg-[#121622] border-r border-slate-800 flex flex-col text-xs font-mono text-slate-300 overflow-y-auto select-none"
    >
      {/* Tools Sidebar Header */}
      <div className="p-2.5 bg-[#171d2b] border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 font-bold text-sky-400">
          <Layout className="w-3.5 h-3.5" />
          <span className="tracking-wider uppercase text-[11px]">Toolbox</span>
        </div>
        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
          15% Dock
        </span>
      </div>

      <div className="p-2.5 space-y-4 flex-1">
        {/* 1. Transform / Gizmo Mode Section */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
            Gizmo Mode
          </span>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => onSetGizmoMode("translate")}
              className={`p-1.5 rounded flex flex-col items-center gap-1 transition ${
                gizmoMode === "translate"
                  ? "bg-sky-600 text-white font-bold shadow-sm"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-400"
              }`}
              title="Translate Gizmo (W)"
            >
              <Move className="w-4 h-4" />
              <span className="text-[9px]">Move (W)</span>
            </button>

            <button
              onClick={() => onSetGizmoMode("rotate")}
              className={`p-1.5 rounded flex flex-col items-center gap-1 transition ${
                gizmoMode === "rotate"
                  ? "bg-sky-600 text-white font-bold shadow-sm"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-400"
              }`}
              title="Rotate Gizmo (E)"
            >
              <RotateCw className="w-4 h-4" />
              <span className="text-[9px]">Rotate (E)</span>
            </button>

            <button
              onClick={() => onSetGizmoMode("scale")}
              className={`p-1.5 rounded flex flex-col items-center gap-1 transition ${
                gizmoMode === "scale"
                  ? "bg-sky-600 text-white font-bold shadow-sm"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-400"
              }`}
              title="Scale Gizmo (R)"
            >
              <Scaling className="w-4 h-4" />
              <span className="text-[9px]">Scale (R)</span>
            </button>
          </div>
        </div>

        {/* 2. Coordinate Space & Snapping */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
            Coordinate Space
          </span>
          <div className="grid grid-cols-2 gap-1 mb-2">
            <button
              onClick={() => setCoordSpace("world")}
              className={`p-1.5 rounded flex items-center justify-center gap-1 text-[10px] transition ${
                coordSpace === "world"
                  ? "bg-slate-700 text-sky-400 font-bold border border-sky-500/40"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>World</span>
            </button>
            <button
              onClick={() => setCoordSpace("local")}
              className={`p-1.5 rounded flex items-center justify-center gap-1 text-[10px] transition ${
                coordSpace === "local"
                  ? "bg-slate-700 text-sky-400 font-bold border border-sky-500/40"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>Local</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/80 p-1.5 rounded border border-slate-800">
            <span className="flex items-center gap-1">
              <Magnet className="w-3 h-3 text-amber-400" />
              Grid Snap:
            </span>
            <select
              value={gridSnap}
              onChange={(e) => setGridSnap(parseFloat(e.target.value))}
              className="bg-slate-800 text-slate-200 rounded px-1.5 py-0.5 border border-slate-700 text-[10px]"
            >
              <option value="0">Off</option>
              <option value="0.1">0.1 m</option>
              <option value="0.5">0.5 m</option>
              <option value="1.0">1.0 m</option>
              <option value="5.0">5.0 m</option>
            </select>
          </div>
        </div>

        {/* 3. Viewport Shading Buffer Mode */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
            Render Mode
          </span>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <button
              onClick={() => setShadingMode("lit")}
              className={`p-1 rounded text-center transition ${
                shadingMode === "lit"
                  ? "bg-sky-950 text-sky-300 font-bold border border-sky-600"
                  : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              Vulkan PBR
            </button>
            <button
              onClick={() => setShadingMode("wireframe")}
              className={`p-1 rounded text-center transition ${
                shadingMode === "wireframe"
                  ? "bg-sky-950 text-sky-300 font-bold border border-sky-600"
                  : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              Wireframe
            </button>
            <button
              onClick={() => setShadingMode("unlit")}
              className={`p-1 rounded text-center transition ${
                shadingMode === "unlit"
                  ? "bg-sky-950 text-sky-300 font-bold border border-sky-600"
                  : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              Unlit Albedo
            </button>
            <button
              onClick={() => setShadingMode("normals")}
              className={`p-1 rounded text-center transition ${
                shadingMode === "normals"
                  ? "bg-sky-950 text-sky-300 font-bold border border-sky-600"
                  : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              Normals MRT
            </button>
          </div>
        </div>

        {/* 4. Entity Spawner Quick Palette */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
            Quick Spawner
          </span>
          <div className="space-y-1">
            <button
              onClick={() => onSpawnPreset("crate")}
              className="w-full px-2 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center justify-between text-[11px] transition group"
            >
              <span className="flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-amber-400" />
                <span>Physics Crate</span>
              </span>
              <span className="text-[9px] text-slate-500 group-hover:text-slate-300">+Spawn</span>
            </button>

            <button
              onClick={() => onSpawnPreset("sphere")}
              className="w-full px-2 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center justify-between text-[11px] transition group"
            >
              <span className="flex items-center gap-1.5">
                <Circle className="w-3.5 h-3.5 text-emerald-400" />
                <span>PBR Sphere</span>
              </span>
              <span className="text-[9px] text-slate-500 group-hover:text-slate-300">+Spawn</span>
            </button>

            <button
              onClick={() => onSpawnPreset("light")}
              className="w-full px-2 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center justify-between text-[11px] transition group"
            >
              <span className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-sky-400" />
                <span>Point Light</span>
              </span>
              <span className="text-[9px] text-slate-500 group-hover:text-slate-300">+Spawn</span>
            </button>

            <button
              onClick={() => onSpawnPreset("mech")}
              className="w-full px-2 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center justify-between text-[11px] transition group"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>Mech Unit</span>
              </span>
              <span className="text-[9px] text-slate-500 group-hover:text-slate-300">+Spawn</span>
            </button>
          </div>
        </div>

        {/* 5. Jolt Physics Quick Impulse */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
            Physics Actions
          </span>
          <button
            onClick={onApplyImpulse}
            className="w-full py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded flex items-center justify-center gap-1.5 text-[11px] shadow-sm transition"
            title="Apply Physics Impulse to Dynamic Crate"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Apply +10 m/s Impulse</span>
          </button>
        </div>

        {/* 6. Console Shortcut & DockBuilder Blueprint */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <button
            onClick={onOpenConsole}
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold rounded border border-slate-700 flex items-center justify-center gap-1.5 text-[11px] transition"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Console CLI</span>
          </button>

          <button
            onClick={onShowDockLayoutModal}
            className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 flex items-center justify-center gap-1.5 text-[10.5px] transition"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>DockBuilder Blueprint</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
