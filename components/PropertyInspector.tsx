"use client";

import React, { useState } from "react";
import {
  EngineActor,
  EngineComponent,
  PropertyMetadata,
  TypeKind,
} from "@/lib/engine-data/types";
import { REFLECTED_CLASSES } from "@/lib/engine-data/reflection-system";
import {
  Binary,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Cpu,
  Eye,
  HelpCircle,
  Layers,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";

interface PropertyInspectorProps {
  actor: EngineActor | null;
  onUpdateComponentProperty: (
    actorId: string,
    componentId: string,
    propertyName: string,
    value: any
  ) => void;
  onAddComponent: (actorId: string, componentType: string) => void;
  onRemoveComponent: (actorId: string, componentId: string) => void;
  onUpdateActorDetails: (actorId: string, updates: Partial<EngineActor>) => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  actor,
  onUpdateComponentProperty,
  onAddComponent,
  onRemoveComponent,
  onUpdateActorDetails,
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [showMemoryHexViewer, setShowMemoryHexViewer] = useState(false);
  const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
  const [showAddComponentMenu, setShowAddComponentMenu] = useState(false);

  if (!actor) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-[#13171f] font-mono text-xs">
        <Box className="w-8 h-8 text-slate-600 mb-2 stroke-1" />
        <p className="font-semibold text-slate-400">No Actor Selected</p>
        <p className="text-[11px] text-slate-500 mt-1">
          Select an entity in the Scene Outliner or Viewport to inspect its reflected properties.
        </p>
      </div>
    );
  }

  const toggleCategory = (key: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Render individual reflected property based on TypeKind
  const renderPropertyField = (
    component: EngineComponent,
    prop: PropertyMetadata
  ) => {
    const value = component.properties[prop.name];

    const handleChange = (newVal: any) => {
      onUpdateComponentProperty(actor.id, component.id, prop.name, newVal);
    };

    return (
      <div
        key={prop.name}
        onMouseEnter={() => setHoveredOffset(prop.offset)}
        onMouseLeave={() => setHoveredOffset(null)}
        className="group py-1.5 px-2 hover:bg-slate-800/40 rounded transition flex flex-col gap-1 border-b border-slate-800/40 last:border-0"
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span>{prop.displayName}</span>
            {prop.tooltip && (
              <span title={prop.tooltip} className="cursor-help text-slate-500 hover:text-slate-300">
                <HelpCircle className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Memory Offset & Size Badge */}
          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 group-hover:text-sky-400 transition">
            <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              +0x{prop.offset.toString(16).toUpperCase().padStart(4, "0")}
            </span>
            <span className="text-slate-600">({prop.size}B)</span>
          </div>
        </div>

        {/* Type Specific Control */}
        <div className="mt-0.5">
          {prop.type === TypeKind.Vec3 && Array.isArray(value) && (
            <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
              <div className="flex items-center bg-slate-900 rounded border border-rose-900/60 overflow-hidden focus-within:border-rose-500">
                <span className="bg-rose-950 text-rose-400 px-1.5 py-1 text-[10px] font-bold">X</span>
                <input
                  type="number"
                  step={prop.step || 0.1}
                  value={value[0]}
                  onChange={(e) => handleChange([parseFloat(e.target.value) || 0, value[1], value[2]])}
                  className="w-full bg-transparent px-1.5 py-0.5 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center bg-slate-900 rounded border border-emerald-900/60 overflow-hidden focus-within:border-emerald-500">
                <span className="bg-emerald-950 text-emerald-400 px-1.5 py-1 text-[10px] font-bold">Y</span>
                <input
                  type="number"
                  step={prop.step || 0.1}
                  value={value[1]}
                  onChange={(e) => handleChange([value[0], parseFloat(e.target.value) || 0, value[2]])}
                  className="w-full bg-transparent px-1.5 py-0.5 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center bg-slate-900 rounded border border-sky-900/60 overflow-hidden focus-within:border-sky-500">
                <span className="bg-sky-950 text-sky-400 px-1.5 py-1 text-[10px] font-bold">Z</span>
                <input
                  type="number"
                  step={prop.step || 0.1}
                  value={value[2]}
                  onChange={(e) => handleChange([value[0], value[1], parseFloat(e.target.value) || 0])}
                  className="w-full bg-transparent px-1.5 py-0.5 text-slate-200 focus:outline-none"
                />
              </div>
            </div>
          )}

          {prop.type === TypeKind.Float && (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={prop.min ?? 0}
                max={prop.max ?? 100}
                step={prop.step ?? 0.1}
                value={value ?? 0}
                onChange={(e) => handleChange(parseFloat(e.target.value))}
                className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <span className="font-mono text-xs text-slate-300 min-w-[45px] text-right bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                {typeof value === "number" ? value.toFixed(2) : "0.00"}
              </span>
            </div>
          )}

          {prop.type === TypeKind.Bool && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => handleChange(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-xs text-slate-400 font-mono">
                {value ? "true (0x01)" : "false (0x00)"}
              </span>
            </label>
          )}

          {(prop.type === TypeKind.Color3 || prop.type === TypeKind.Color4) && Array.isArray(value) && (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={`#${Math.floor((value[0] || 0) * 255).toString(16).padStart(2, "0")}${Math.floor(
                  (value[1] || 0) * 255
                )
                  .toString(16)
                  .padStart(2, "0")}${Math.floor((value[2] || 0) * 255)
                  .toString(16)
                  .padStart(2, "0")}`}
                onChange={(e) => {
                  const hex = e.target.value;
                  const r = parseInt(hex.slice(1, 3), 16) / 255;
                  const g = parseInt(hex.slice(3, 5), 16) / 255;
                  const b = parseInt(hex.slice(5, 7), 16) / 255;
                  handleChange(prop.type === TypeKind.Color4 ? [r, g, b, value[3] ?? 1.0] : [r, g, b]);
                }}
                className="w-7 h-7 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0"
              />
              <div className="flex-1 font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                RGB: ({(value[0] || 0).toFixed(2)}, {(value[1] || 0).toFixed(2)}, {(value[2] || 0).toFixed(2)})
              </div>
            </div>
          )}

          {prop.type === TypeKind.Enum && prop.enumOptions && (
            <select
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-sky-500"
            >
              {prop.enumOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {prop.type === TypeKind.AssetHandle && (
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded border border-slate-800 font-mono text-xs text-slate-300">
              <span className="text-[10px] bg-sky-950 text-sky-400 px-1 py-0.5 rounded border border-sky-800">
                GUID
              </span>
              <span className="truncate text-slate-400">{value || "None (nullptr)"}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="dear-imgui-property-inspector" className="h-full flex flex-col bg-[#13171f] overflow-hidden text-xs">
      {/* Header Bar */}
      <div className="p-3 bg-[#171c26] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Inspector (Reflected)
          </span>
        </div>

        <button
          onClick={() => setShowMemoryHexViewer(!showMemoryHexViewer)}
          className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 border transition ${
            showMemoryHexViewer
              ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
          }`}
          title="Inspect C++ struct memory offsets & byte layout"
        >
          <Binary className="w-3.5 h-3.5" />
          <span>Hex Memory</span>
        </button>
      </div>

      {/* Actor Header Card */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={actor.name}
            onChange={(e) => onUpdateActorDetails(actor.id, { name: e.target.value })}
            className="font-semibold text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-sky-500 focus:outline-none px-1 text-sm"
          />
          <span className="text-[10px] font-mono bg-sky-950/80 text-sky-400 px-1.5 py-0.5 rounded border border-sky-800/50">
            Actor ID: {actor.id}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
          <div>
            <span className="text-slate-500">Tag: </span>
            <span className="text-slate-300">{actor.tag}</span>
          </div>
          <div>
            <span className="text-slate-500">Layer: </span>
            <span className="text-slate-300">{actor.layer}</span>
          </div>
        </div>
      </div>

      {/* Memory Hex Visualizer Modal / Panel */}
      {showMemoryHexViewer && (
        <div className="p-3 bg-slate-950 border-b border-sky-950 font-mono text-[11px] flex flex-col gap-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-sky-400 font-bold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Runtime Struct Memory Layout (C++23 Standard Layout)
            </span>
            <span className="text-[10px] text-slate-500">
              Offset dereference: *(T*)((char*)instance + offset)
            </span>
          </div>

          <div className="grid grid-cols-8 gap-1 text-center text-[10px]">
            {Array.from({ length: 16 }).map((_, i) => {
              const byteOffset = i * 4;
              const isTargeted = hoveredOffset !== null && hoveredOffset === byteOffset;
              return (
                <div
                  key={i}
                  className={`p-1 rounded border transition ${
                    isTargeted
                      ? "bg-sky-500 text-white border-sky-400 font-bold shadow-lg shadow-sky-500/20"
                      : "bg-slate-900 text-slate-400 border-slate-800"
                  }`}
                >
                  <div className="text-[8px] opacity-60">0x{byteOffset.toString(16).padStart(2, "0")}</div>
                  <div>3F 80 00 00</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Component List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {actor.components.map((comp) => {
          const classMeta = REFLECTED_CLASSES[comp.type];
          if (!classMeta) return null;

          // Group properties by category
          const categories: Record<string, PropertyMetadata[]> = {};
          classMeta.properties.forEach((p) => {
            if (!categories[p.category]) categories[p.category] = [];
            categories[p.category].push(p);
          });

          return (
            <div
              key={comp.id}
              className="bg-slate-900/70 rounded-lg border border-slate-800 overflow-hidden shadow-sm"
            >
              {/* Component Title Header */}
              <div className="p-2.5 bg-slate-800/80 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-sky-400"></div>
                  <span className="font-semibold text-slate-200 font-mono text-xs">
                    {comp.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ({classMeta.size} Bytes)
                  </span>
                </div>

                {comp.type !== "TransformComponent" && (
                  <button
                    onClick={() => onRemoveComponent(actor.id, comp.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                    title="Remove Component"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Grouped Categories & Properties */}
              <div className="p-2 space-y-2">
                {Object.entries(categories).map(([category, props]) => {
                  const catKey = `${comp.id}_${category}`;
                  const isCollapsed = collapsedCategories[catKey];

                  return (
                    <div key={category} className="border border-slate-800/60 rounded bg-slate-950/40">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(catKey)}
                        className="w-full px-2 py-1 bg-slate-900/60 flex items-center justify-between text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200"
                      >
                        <span className="uppercase tracking-wider">{category}</span>
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Property Fields */}
                      {!isCollapsed && (
                        <div className="p-1 space-y-0.5">
                          {props.map((p) => renderPropertyField(comp, p))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Add Component Action */}
        <div className="relative pt-2">
          <button
            onClick={() => setShowAddComponentMenu(!showAddComponentMenu)}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition text-xs shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Component</span>
          </button>

          {showAddComponentMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-1 text-xs z-20 space-y-0.5">
              {Object.keys(REFLECTED_CLASSES)
                .filter((type) => type !== "TransformComponent")
                .map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      onAddComponent(actor.id, type);
                      setShowAddComponentMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-sky-600 hover:text-white text-slate-300 font-mono transition flex items-center justify-between"
                  >
                    <span>{type}</span>
                    <span className="text-[10px] opacity-70">
                      {REFLECTED_CLASSES[type].category}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
