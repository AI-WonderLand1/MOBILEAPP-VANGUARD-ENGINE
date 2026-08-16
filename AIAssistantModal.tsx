"use client";

import React, { useState } from "react";
import {
  Bot,
  Check,
  Code2,
  Copy,
  MessageSquare,
  Send,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Greetings, Lead Architect. I am your Vanguard Engine Architecture Copilot. 

Ask me anything regarding:
• Custom Vulkan 1.3 Synchronization2 barrier generation & render graph scheduling
• Macro reflection pointer offsets and Dear ImGui property inspector bindings
• Jolt Physics multi-threaded job systems & collision filtering
• Memory arena allocators, SIMD glm math, or Tracy profiler instrumentation hooks.`,
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = [
    "Explain Vulkan 1.3 Synchronization2 pipeline barriers vs legacy VkCmdPipelineBarrier",
    "How does offsetof() allow ImGui to edit C++ struct memory directly?",
    "How to configure Jolt Physics contact listener with Actor/Component callbacks?",
    "How does the Render Graph compute resource aliasing to minimize VRAM?",
  ];

  const handleSendMessage = async (promptToSend?: string) => {
    const query = promptToSend || inputPrompt;
    if (!query.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });

      const data = await res.json();
      const assistantReply = data.text || "Architectural query processed successfully.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantReply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to connect to the Vanguard AI Engine service. Please check your environment configuration.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[650px] bg-[#11151f] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden text-xs font-sans text-slate-200">
        {/* Modal Header */}
        <div className="p-3.5 bg-[#171c2a] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 font-mono text-sm">
                Vanguard Engine Architect AI Copilot
              </h3>
              <p className="text-[11px] text-slate-400">
                Specialized in Modern C++23, Vulkan 1.3, Jolt Physics, and Dear ImGui Engine Tools
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Topics Pills */}
        <div className="p-2.5 bg-slate-950/60 border-b border-slate-800/80 flex overflow-x-auto gap-1.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp)}
              className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-sky-500/50 transition whitespace-nowrap text-[11px] font-mono flex items-center gap-1 shrink-0"
            >
              <span>{qp}</span>
            </button>
          ))}
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded bg-sky-600/30 border border-sky-500/50 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-xl max-w-[85%] leading-relaxed ${
                    isUser
                      ? "bg-sky-600 text-white font-sans font-medium shadow-md"
                      : "bg-slate-900/90 text-slate-200 border border-slate-800 text-[11px] whitespace-pre-wrap select-text"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 font-mono text-xs p-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
              <span>Architect reasoning in progress...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#171c2a] border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask about custom C++ engine architecture, Vulkan barriers, Jolt physics, or memory layout..."
            className="flex-1 bg-slate-950 px-3 py-2 rounded-lg border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500 placeholder:text-slate-500"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputPrompt.trim()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-1.5 transition text-xs shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
