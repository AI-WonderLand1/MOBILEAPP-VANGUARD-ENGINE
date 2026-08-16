import React from "react";
import Link from "next/link";
import { Terminal, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="w-screen h-screen bg-[#0a0d14] flex items-center justify-center p-6 text-slate-200">
      <div className="max-w-md w-full bg-[#13171f] border border-slate-700/80 rounded-xl p-6 shadow-2xl flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 mb-4">
          <Terminal className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold font-mono text-slate-100 mb-2">
          404 - Subsystem Route Not Found
        </h2>
        <p className="text-xs text-slate-400 font-mono mb-6 leading-relaxed">
          The requested path or engine viewport component does not exist.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-mono text-xs font-semibold flex items-center gap-2 transition"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return to Vanguard Editor</span>
        </Link>
      </div>
    </div>
  );
}
