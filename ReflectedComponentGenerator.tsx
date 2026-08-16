"use client";

import React, { useState } from "react";
import { TypeKind } from "@/lib/engine-data/types";
import {
  Check,
  Code2,
  Copy,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";

interface FieldDraft {
  id: string;
  name: string;
  displayName: string;
  type: TypeKind;
  category: string;
  tooltip: string;
  min?: number;
  max?: number;
  step?: number;
}

export const ReflectedComponentGenerator: React.FC = () => {
  const [componentName, setComponentName] = useState("VanguardCharacterMotorComponent");
  const [parentClassName, setParentClassName] = useState("Component");
  const [fields, setFields] = useState<FieldDraft[]>([
    {
      id: "f1",
      name: "m_MaxWalkSpeed",
      displayName: "Max Walk Speed",
      type: TypeKind.Float,
      category: "Movement",
      tooltip: "Maximum ground locomotion velocity (m/s)",
      min: 0,
      max: 50,
      step: 0.5,
    },
    {
      id: "f2",
      name: "m_JumpImpulseForce",
      displayName: "Jump Force",
      type: TypeKind.Vec3,
      category: "Movement",
      tooltip: "Linear vertical impulse vector on jump",
      step: 10.0,
    },
    {
      id: "f3",
      name: "m_bEnableAirControl",
      displayName: "Air Control",
      type: TypeKind.Bool,
      category: "Physics Overrides",
      tooltip: "Allows steering momentum mid-air",
    },
    {
      id: "f4",
      name: "m_SkeletalMeshAsset",
      displayName: "Skeletal Rig",
      type: TypeKind.AssetHandle,
      category: "Animation",
      tooltip: "GUID reference to compiled skeleton .vskel",
    },
  ]);

  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        id: `f_${Date.now()}`,
        name: `m_CustomProp${prev.length + 1}`,
        displayName: `Property ${prev.length + 1}`,
        type: TypeKind.Float,
        category: "General",
        tooltip: "Custom gameplay variable",
        min: 0,
        max: 100,
        step: 0.1,
      },
    ]);
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FieldDraft>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  // Generate C++ Header (.h)
  const headerCode = `#pragma once
#include "Scene/Component.h"
#include "Reflection/Macros.h"
#include <glm/glm.hpp>
#include <string>

namespace Vanguard {

class ${componentName} : public ${parentClassName} {
    REFLECT_CLASS(${componentName}, ${parentClassName})

public:
    ${componentName}();
    virtual ~${componentName}() override;

    virtual void OnInitialize() override;
    virtual void OnTick(float deltaTime) override;

public:
${fields
  .map((f) => {
    let typeStr = "float";
    if (f.type === TypeKind.Int32) typeStr = "int32_t";
    else if (f.type === TypeKind.Bool) typeStr = "bool";
    else if (f.type === TypeKind.Vec2) typeStr = "glm::vec2";
    else if (f.type === TypeKind.Vec3) typeStr = "glm::vec3";
    else if (f.type === TypeKind.Vec4) typeStr = "glm::vec4";
    else if (f.type === TypeKind.Color3) typeStr = "glm::vec3";
    else if (f.type === TypeKind.Color4) typeStr = "glm::vec4";
    else if (f.type === TypeKind.String || f.type === TypeKind.AssetHandle) typeStr = "std::string";
    return `    ${typeStr} ${f.name};`;
  })
  .join("\n")}
};

} // namespace Vanguard`;

  // Generate C++ Source (.cpp) with Reflection Registration
  const sourceCode = `#include "Scene/Components/${componentName}.h"
#include "Reflection/ReflectionRegistry.h"

namespace Vanguard {

BEGIN_CLASS_REFLECTION(${componentName}, ${parentClassName})
${fields
  .map((f) => {
    if (f.type === TypeKind.Float && f.max !== undefined && f.min !== undefined) {
      return `    REFLECT_PROPERTY_RANGE(${componentName}, ${f.name}, "${f.displayName}", "${f.category}", ${f.min}.0f, ${f.max}.0f, ${f.step || 0.1}f)`;
    }
    return `    REFLECT_PROPERTY(${componentName}, ${f.name}, "${f.displayName}", "${f.category}", "${f.tooltip}")`;
  })
  .join("\n")}
END_CLASS_REFLECTION()

${componentName}::${componentName}() = default;
${componentName}::~${componentName}() = default;

void ${componentName}::OnInitialize() {
    // Component startup initialization
}

void ${componentName}::OnTick(float deltaTime) {
    // Per-frame game logic tick
}

} // namespace Vanguard`;

  return (
    <div id="reflected-component-generator" className="h-full flex flex-col bg-[#0f131c] text-xs font-sans text-slate-300">
      {/* Header */}
      <div className="p-3 bg-[#151a26] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-100 uppercase tracking-wider font-mono">
            Reflected Component Generator (C++20/C++23)
          </span>
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Auto-injects StaticClass() & offsetof registration
        </span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Designer Form */}
        <div className="w-full lg:w-1/2 p-4 border-r border-slate-800 overflow-y-auto space-y-4 bg-[#0d1017]">
          {/* Class Config Card */}
          <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-3 font-mono">
            <h3 className="font-semibold text-slate-200 text-xs uppercase">Class Definition</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Component Name:</label>
                <input
                  type="text"
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                  className="w-full bg-slate-950 px-2.5 py-1.5 rounded border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Parent Class:</label>
                <input
                  type="text"
                  value={parentClassName}
                  onChange={(e) => setParentClassName(e.target.value)}
                  className="w-full bg-slate-950 px-2.5 py-1.5 rounded border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Properties Designer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono">
              <span className="font-semibold text-slate-300 text-xs uppercase">Reflected Fields</span>
              <button
                onClick={addField}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded flex items-center gap-1 transition text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Property</span>
              </button>
            </div>

            <div className="space-y-2">
              {fields.map((field) => (
                <div key={field.id} className="p-3 bg-slate-900/70 rounded-lg border border-slate-800 space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateField(field.id, { name: e.target.value })}
                        className="bg-slate-950 px-2 py-1 rounded border border-slate-700 text-slate-100 text-xs w-44 font-semibold"
                        placeholder="m_VariableName"
                      />
                      <input
                        type="text"
                        value={field.displayName}
                        onChange={(e) => updateField(field.id, { displayName: e.target.value })}
                        className="bg-slate-950 px-2 py-1 rounded border border-slate-700 text-slate-300 text-xs flex-1"
                        placeholder="Display Label"
                      />
                    </div>

                    <button
                      onClick={() => removeField(field.id)}
                      className="text-slate-500 hover:text-rose-400 transition p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Type Kind:</span>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(field.id, { type: e.target.value as TypeKind })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                      >
                        {Object.values(TypeKind).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] block">Category:</span>
                      <input
                        type="text"
                        value={field.category}
                        onChange={(e) => updateField(field.id, { category: e.target.value })}
                        className="w-full bg-slate-950 px-2 py-1 rounded border border-slate-700 text-slate-200 text-xs"
                        placeholder="Category Name"
                      />
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] block">Tooltip:</span>
                      <input
                        type="text"
                        value={field.tooltip}
                        onChange={(e) => updateField(field.id, { tooltip: e.target.value })}
                        className="w-full bg-slate-950 px-2 py-1 rounded border border-slate-700 text-slate-200 text-xs"
                        placeholder="Editor tooltip text"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Real-time C++ Code Outputs (.h and .cpp) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1017]">
          {/* Header Code Section */}
          <div className="flex-1 flex flex-col border-b border-slate-800 overflow-hidden">
            <div className="p-2.5 bg-[#151a26] border-b border-slate-800 flex items-center justify-between font-mono">
              <span className="text-sky-400 font-semibold text-xs flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                Include/Scene/Components/{componentName}.h
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(headerCode);
                  setCopiedHeader(true);
                  setTimeout(() => setCopiedHeader(false), 2000);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 border border-slate-700"
              >
                {copiedHeader ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHeader ? "Copied" : "Copy .h"}</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 bg-[#0a0d14]">
              <pre className="font-mono text-xs text-slate-200 leading-relaxed select-text">
                <code>{headerCode}</code>
              </pre>
            </div>
          </div>

          {/* Source Code Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2.5 bg-[#151a26] border-b border-slate-800 flex items-center justify-between font-mono">
              <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                Source/Scene/Components/{componentName}.cpp
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sourceCode);
                  setCopiedSource(true);
                  setTimeout(() => setCopiedSource(false), 2000);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 border border-slate-700"
              >
                {copiedSource ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSource ? "Copied" : "Copy .cpp"}</span>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 bg-[#0a0d14]">
              <pre className="font-mono text-xs text-slate-200 leading-relaxed select-text">
                <code>{sourceCode}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
