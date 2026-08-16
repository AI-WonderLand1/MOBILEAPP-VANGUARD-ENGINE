"use client";

import React, { useState, useEffect } from "react";
import { TRACY_FRAME_ZONES } from "@/lib/engine-data/physics-data";
import { TracyZone } from "@/lib/engine-data/types";
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";

export const TracyProfilerPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(true);
  const [targetFps, setTargetFps] = useState<60 | 120>(60);
  const [currentZones, setCurrentZones] = useState<TracyZone[]>(TRACY_FRAME_ZONES);
  const [selectedZone, setSelectedZone] = useState<TracyZone | null>(TRACY_FRAME_ZONES[0]);
  const [artificalLoadMs, setArtificialLoadMs] = useState(0);

  // Microsecond jitter simulation for live engine pulse
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setCurrentZones((prev) =>
        prev.map((zone) => {
          const jitter = (Math.random() - 0.5) * 0.15;
          const newDuration = Math.max(
            0.05,
            Number((zone.durationMs + jitter + (zone.category === "Physics" ? artificalLoadMs * 0.4 : 0)).toFixed(2))
          );
          return {
            ...zone,
            durationMs: newDuration,
          };
        })
      );
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning, artificalLoadMs]);

  const totalFrameTimeMs = currentZones.reduce((acc, z) => (z.name === "Engine::MainLoopTick" ? acc : acc + z.durationMs), 0);
  const currentFps = (1000 / Math.max(1, totalFrameTimeMs)).toFixed(1);
  const frameBudgetMs = 1000 / targetFps;
  const isBudgetExceeded = totalFrameTimeMs > frameBudgetMs;

  return (
    <div id="tracy-profiler-panel" className="h-full flex flex-col bg-[#0e1117] text-xs font-sans text-slate-300">
      {/* Profiler Toolbar */}
      <div className="p-3 bg-[#131722] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Tracy Profiler 0.11 (Embedded Server)
          </span>
          <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-800/60">
            ZoneScopedN Hooks Active
          </span>
        </div>

        {/* Play / Pause & FPS Lock Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800 font-mono text-[11px]">
            <button
              onClick={() => setTargetFps(60)}
              className={`px-2 py-0.5 rounded ${targetFps === 60 ? "bg-emerald-600 text-white" : "text-slate-400"}`}
            >
              60 FPS (16.6ms)
            </button>
            <button
              onClick={() => setTargetFps(120)}
              className={`px-2 py-0.5 rounded ${targetFps === 120 ? "bg-emerald-600 text-white" : "text-slate-400"}`}
            >
              120 FPS (8.3ms)
            </button>
          </div>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-2.5 py-1 rounded font-mono text-xs flex items-center gap-1.5 transition ${
              isRunning
                ? "bg-amber-950 text-amber-300 border border-amber-800"
                : "bg-emerald-950 text-emerald-300 border border-emerald-800"
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? "Pause Capture" : "Resume"}</span>
          </button>
        </div>
      </div>

      {/* Frame Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#11151e] border-b border-slate-800 font-mono">
        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-500 text-[10px] block">Frame Time (CPU):</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-lg font-bold ${isBudgetExceeded ? "text-rose-400" : "text-emerald-400"}`}>
              {totalFrameTimeMs.toFixed(2)} ms
            </span>
            <span className="text-[10px] text-slate-500">/ {frameBudgetMs.toFixed(1)}ms</span>
          </div>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-500 text-[10px] block">Render Frequency:</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-sky-400">{currentFps} FPS</span>
            <span className="text-[10px] text-slate-500">V-Sync: Off</span>
          </div>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-500 text-[10px] block">Active Tracy Zones:</span>
          <span className="text-lg font-bold text-violet-400">{currentZones.length} Zones</span>
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-500 text-[10px] block">Frame Allocations:</span>
          <span className="text-lg font-bold text-amber-400">0 heap allocs</span>
        </div>
      </div>

      {/* Main Microsecond Timeline Visualizer */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            ZoneScoped Hierarchical Execution Timeline
          </span>
          <span className="text-[10px] text-slate-500">Click any block to inspect callstack</span>
        </div>

        {/* Stacked Timeline Bar */}
        <div className="h-9 w-full bg-slate-900 rounded-lg overflow-hidden flex border border-slate-800 p-0.5">
          {currentZones
            .filter((z) => z.name !== "Engine::MainLoopTick")
            .map((zone) => {
              const widthPct = Math.max(2, (zone.durationMs / totalFrameTimeMs) * 100);
              const isSelected = selectedZone?.name === zone.name;

              return (
                <div
                  key={zone.name}
                  onClick={() => setSelectedZone(zone)}
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: zone.color,
                  }}
                  className={`h-full cursor-pointer transition relative group hover:brightness-125 ${
                    isSelected ? "ring-2 ring-white z-10" : ""
                  }`}
                  title={`${zone.name}: ${zone.durationMs.toFixed(2)}ms (${widthPct.toFixed(1)}%)`}
                >
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900 text-white font-mono text-[10px] px-2 py-1 rounded shadow-xl border border-slate-700 whitespace-nowrap z-20 pointer-events-none">
                    <p className="font-bold text-sky-300">{zone.name}</p>
                    <p>
                      {zone.durationMs.toFixed(2)}ms ({widthPct.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Zone Detail Inspector */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {selectedZone && (
          <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Selected Zone</span>
                <h4 className="text-sm font-bold text-slate-100">{selectedZone.name}</h4>
              </div>
              <span
                style={{ backgroundColor: `${selectedZone.color}25`, borderColor: selectedZone.color }}
                className="px-2 py-1 rounded text-xs border font-semibold text-slate-200"
              >
                {selectedZone.durationMs.toFixed(2)} ms (
                {((selectedZone.durationMs / totalFrameTimeMs) * 100).toFixed(1)}%)
              </span>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <div>
                <span className="text-slate-500">Subsystem Category: </span>
                <span className="text-slate-200 font-semibold">{selectedZone.category}</span>
              </div>
              <div>
                <span className="text-slate-500">Callstack Origin: </span>
                <span className="text-sky-400">{selectedZone.callstack}</span>
              </div>
              <div>
                <span className="text-slate-500">C++ Macro: </span>
                <span className="text-emerald-400">ZoneScopedN(&quot;{selectedZone.name}&quot;)</span>
              </div>
            </div>
          </div>
        )}

        {/* Zone Breakdown Table */}
        <div className="bg-slate-900/60 rounded-lg border border-slate-800 overflow-hidden font-mono text-xs">
          <div className="p-2.5 bg-slate-800/80 font-semibold text-slate-300 border-b border-slate-800 grid grid-cols-12">
            <span className="col-span-6">Zone Name</span>
            <span className="col-span-2 text-right">Time (ms)</span>
            <span className="col-span-2 text-right">Frame %</span>
            <span className="col-span-2 text-right">Category</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {currentZones.map((z) => (
              <div
                key={z.name}
                onClick={() => setSelectedZone(z)}
                className={`p-2.5 grid grid-cols-12 cursor-pointer hover:bg-slate-800/50 transition ${
                  selectedZone?.name === z.name ? "bg-slate-800/80 text-white" : "text-slate-300"
                }`}
              >
                <div className="col-span-6 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: z.color }}></span>
                  <span className="truncate">{z.name}</span>
                </div>
                <span className="col-span-2 text-right font-semibold">{z.durationMs.toFixed(2)}</span>
                <span className="col-span-2 text-right text-slate-400">
                  {((z.durationMs / totalFrameTimeMs) * 100).toFixed(1)}%
                </span>
                <span className="col-span-2 text-right text-slate-500 text-[10px]">{z.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
