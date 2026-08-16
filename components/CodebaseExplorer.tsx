"use client";

import React, { useState } from "react";
import { ENGINE_CODEBASE } from "@/lib/engine-data/codebase-data";
import { CodeFile } from "@/lib/engine-data/types";
import {
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  FileCode,
  FolderCode,
  Layers,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";

export const CodebaseExplorer: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState<number>(1);
  const [selectedFileId, setSelectedFileId] = useState<string>("phase1-cmake");
  const [copied, setCopied] = useState(false);

  const phaseNames = [
    { phase: 1, title: "Phase 1: Setup & Environment", subtitle: "CMake, SDL3, GLM, Jolt" },
    { phase: 2, title: "Phase 2: Core & Reflection", subtitle: "Actor/Component, Reflection Macros" },
    { phase: 3, title: "Phase 3: Render Graph & RHI", subtitle: "Vulkan 1.3 Sync2, RenderGraph DAG" },
    { phase: 4, title: "Phase 4: Editor & ImGui", subtitle: "Docking, ImGuizmo, Viewports" },
    { phase: 5, title: "Phase 5: Asset Baker", subtitle: "Binary .vmesh, GUID Registry" },
    { phase: 6, title: "Phase 6: Profiling & Tracy", subtitle: "ZoneScopedN, RenderDoc Hooks" },
  ];

  const phaseFiles = ENGINE_CODEBASE.filter((f) => f.phase === selectedPhase);
  const selectedFile = ENGINE_CODEBASE.find((f) => f.id === selectedFileId) || phaseFiles[0] || ENGINE_CODEBASE[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="codebase-architecture-explorer" className="h-full flex flex-col bg-[#0d1017] text-xs font-sans text-slate-300">
      {/* Top Phase Navigation Bar */}
      <div className="p-2 bg-[#131722] border-b border-slate-800 flex overflow-x-auto gap-1 text-xs">
        {phaseNames.map((p) => {
          const isSelected = selectedPhase === p.phase;
          return (
            <button
              key={p.phase}
              onClick={() => {
                setSelectedPhase(p.phase);
                const firstInPhase = ENGINE_CODEBASE.find((f) => f.phase === p.phase);
                if (firstInPhase) setSelectedFileId(firstInPhase.id);
              }}
              className={`px-3 py-2 rounded-lg text-left transition whitespace-nowrap flex flex-col font-mono ${
                isSelected
                  ? "bg-sky-600 text-white font-semibold shadow-md shadow-sky-600/20"
                  : "bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <span className="text-xs">{p.title}</span>
              <span className={`text-[10px] ${isSelected ? "text-sky-100" : "text-slate-500"}`}>{p.subtitle}</span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace: File Tree on Left, Code Viewer on Right */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Files in Current Phase */}
        <div className="w-full md:w-72 border-r border-slate-800 bg-[#0f131c] overflow-y-auto p-3 space-y-2">
          <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider px-1">
            Modular Target Files
          </div>

          <div className="space-y-1">
            {phaseFiles.map((file) => {
              const isSelected = file.id === selectedFile.id;
              const isHeader = file.filename.endsWith(".h");
              const isCMake = file.filename.endsWith(".txt");

              return (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full text-left p-2 rounded-lg font-mono transition flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-800 text-sky-400 border border-sky-500/40 shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isCMake ? (
                      <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : isHeader ? (
                      <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Code2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    )}
                    <span className="text-xs truncate font-medium">{file.filename.split("/").pop()}</span>
                  </div>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                    {file.type.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code & Architectural Commentary */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1017]">
          {/* File Header Bar */}
          <div className="p-3 bg-[#131722] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono">
              <FolderCode className="w-4 h-4 text-sky-400" />
              <span className="font-semibold text-slate-100 text-xs">{selectedFile.filename}</span>
              <span className="text-slate-500 text-[11px]">({selectedFile.category})</span>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Code"}</span>
            </button>
          </div>

          {/* Architectural Notes Banner */}
          {selectedFile.architecturalNotes && selectedFile.architecturalNotes.length > 0 && (
            <div className="p-3 bg-sky-950/30 border-b border-sky-900/40 text-[11px] font-mono space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sky-400 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lead Architect Design Rationale:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                {selectedFile.architecturalNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Syntax Code Box */}
          <div className="flex-1 overflow-auto p-4 bg-[#0a0d14]">
            <pre className="font-mono text-xs text-slate-200 leading-relaxed tab-4 select-text">
              <code>{selectedFile.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
