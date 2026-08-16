"use client";

import React, { useState } from "react";
import { INITIAL_PHYSICS_BODIES } from "@/lib/engine-data/physics-data";
import { PhysicsBodyState } from "@/lib/engine-data/types";
import {
  Activity,
  ArrowUp,
  Boxes,
  CircleDot,
  Compass,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

interface JoltPhysicsPanelProps {
  onApplyImpulseToBox?: (impulseY: number) => void;
}

export const JoltPhysicsPanel: React.FC<JoltPhysicsPanelProps> = ({ onApplyImpulseToBox }) => {
  const [bodies, setBodies] = useState<PhysicsBodyState[]>(INITIAL_PHYSICS_BODIES);
  const [gravity, setGravity] = useState(-9.81);
  const [substeps, setSubsteps] = useState(2);
  const [activeLayerFilter, setActiveLayerFilter] = useState<string>("ALL");
  const [lastImpulseMsg, setLastImpulseMsg] = useState<string | null>(null);

  const handleApplyImpulse = (bodyId: string) => {
    const impulse = [0, 1500, 0];
    setLastImpulseMsg(`Applied Linear Impulse [0, 1500, 0] N·s to Body: ${bodyId}`);
    if (onApplyImpulseToBox) {
      onApplyImpulseToBox(1.5);
    }
    setTimeout(() => setLastImpulseMsg(null), 3000);
  };

  return (
    <div id="jolt-physics-debugger" className="h-full flex flex-col bg-[#10141d] text-xs font-sans text-slate-300">
      {/* Header */}
      <div className="p-3 bg-[#161c28] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Jolt Physics 5.2.0 (JobSystem Substepped)
          </span>
        </div>

        <span className="bg-amber-950 text-amber-400 px-2 py-0.5 rounded text-[10px] font-mono border border-amber-800/60">
          60Hz Fixed Timestep (Substeps: {substeps})
        </span>
      </div>

      {/* Physics World Global Parameters */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>World Gravity (Y):</span>
            <span className="text-amber-400 font-bold">{gravity.toFixed(2)} m/s²</span>
          </div>
          <input
            type="range"
            min={-25}
            max={5}
            step={0.5}
            value={gravity}
            onChange={(e) => setGravity(parseFloat(e.target.value))}
            className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Physics Substeps:</span>
            <span className="text-sky-400 font-bold">{substeps} Substeps</span>
          </div>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={substeps}
            onChange={(e) => setSubsteps(parseInt(e.target.value))}
            className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-center">
          <span className="text-slate-500 text-[10px]">TempAllocator Pool:</span>
          <span className="text-emerald-400 font-bold text-sm">16.0 MB (Preallocated)</span>
        </div>
      </div>

      {/* Impulse Feedback Toast */}
      {lastImpulseMsg && (
        <div className="mx-4 mt-3 p-2 bg-emerald-950/80 border border-emerald-500 text-emerald-300 rounded font-mono text-[11px] flex items-center gap-2 animate-in fade-in duration-150">
          <Zap className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
          <span>{lastImpulseMsg}</span>
        </div>
      )}

      {/* Body List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span className="font-semibold uppercase tracking-wider">
            Active Rigid Bodies ({bodies.length})
          </span>
          <span>Collision Layers: NON_MOVING, MOVING, DEBRIS, SENSOR</span>
        </div>

        <div className="space-y-2">
          {bodies.map((body) => (
            <div
              key={body.id}
              className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      body.motionType === "Dynamic" ? "bg-amber-400" : "bg-slate-500"
                    }`}
                  ></div>
                  <span className="font-bold text-slate-100">{body.id}</span>
                  <span className="text-slate-500 text-[10px]">({body.shape} Shape)</span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    body.motionType === "Dynamic"
                      ? "bg-amber-950 text-amber-300 border border-amber-800"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {body.motionType}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block text-[10px]">Mass:</span>
                  <span className="text-slate-200">{body.massKg > 0 ? `${body.massKg} kg` : "Infinite (Static)"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Friction:</span>
                  <span className="text-slate-200">{body.friction}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Restitution:</span>
                  <span className="text-slate-200">{body.restitution}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Layer:</span>
                  <span className="text-sky-400">{body.collisionLayer}</span>
                </div>
              </div>

              {/* Action Buttons for Dynamic bodies */}
              {body.motionType === "Dynamic" && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleApplyImpulse(body.id)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded flex items-center gap-1.5 transition text-[11px]"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Apply Upward Impulse (+1500 N·s)</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
