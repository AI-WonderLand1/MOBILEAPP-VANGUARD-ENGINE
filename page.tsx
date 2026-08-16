"use client";

import React, { useState } from "react";
import { EditorWorkbench } from "@/components/EditorWorkbench";
import { CodebaseExplorer } from "@/components/CodebaseExplorer";
import { ReflectedComponentGenerator } from "@/components/ReflectedComponentGenerator";
import { AIAssistantModal } from "@/components/AIAssistantModal";
import { X, Code2, Wrench, Sparkles, BookOpen, Layers } from "lucide-react";

export default function EngineStudioPage() {
  const [isCodebaseOpen, setIsCodebaseOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0a0d14] text-slate-100 flex flex-col">
      {/* Main Game Engine Editor Workbench */}
      <div className="flex-1 w-full h-full">
        <EditorWorkbench
          onOpenCodebase={() => setIsCodebaseOpen(true)}
          onOpenComponentGenerator={() => setIsGeneratorOpen(true)}
          onOpenAIConsultant={() => setIsAIOpen(true)}
        />
      </div>

      {/* Codebase Explorer Modal / Fullscreen Drawer */}
      {isCodebaseOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-7xl h-full mx-auto bg-[#0d1017] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3.5 bg-[#141824] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
                  Vanguard Engine Architecture Blueprint & C++23 Codebase
                </h2>
              </div>
              <button
                onClick={() => setIsCodebaseOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <CodebaseExplorer />
            </div>
          </div>
        </div>
      )}

      {/* Reflected Component Generator Modal */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl h-full mx-auto bg-[#0d1017] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3.5 bg-[#141824] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-sky-400" />
                <h2 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
                  Reflected Component Designer & Code Generator
                </h2>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <ReflectedComponentGenerator />
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      <AIAssistantModal isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
