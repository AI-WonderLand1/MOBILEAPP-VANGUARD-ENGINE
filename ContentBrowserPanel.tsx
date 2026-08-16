"use client";

import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  FileCode2,
  Box,
  ImageIcon,
  Sparkles,
  Layers,
  Search,
  Grid,
  List,
  ChevronRight,
  Database,
  ExternalLink,
  Plus,
  Play,
} from "lucide-react";

interface AssetEntry {
  id: string;
  name: string;
  folder: string;
  type: "mesh" | "texture" | "material" | "shader" | "scene" | "physics";
  format: string;
  sizeKb: number;
  guid: string;
  description: string;
}

const ASSET_REGISTRY: AssetEntry[] = [
  // Meshes
  { id: "mesh-1", name: "SM_Vanguard_Mech", folder: "Meshes", type: "mesh", format: ".vmesh (Vulkan Binary)", sizeKb: 1420, guid: "guid-mesh-hero-mech", description: "Rigged high-poly combat mech chassis with dual hardpoints." },
  { id: "mesh-2", name: "SM_Industrial_Crate", folder: "Meshes", type: "mesh", format: ".vmesh (Vulkan Binary)", sizeKb: 184, guid: "guid-mesh-crate", description: "Rigid physical storage container with collision hull." },
  { id: "mesh-3", name: "SM_Platform_Tile", folder: "Meshes", type: "mesh", format: ".vmesh (Vulkan Binary)", sizeKb: 92, guid: "guid-mesh-platform", description: "Modular hangar floor foundation platform." },
  { id: "mesh-4", name: "SM_Plasma_Cannon", folder: "Meshes", type: "mesh", format: ".vmesh (Vulkan Binary)", sizeKb: 340, guid: "guid-mesh-plasma-cannon", description: "Arm-mounted energy weapon weapon mesh." },
  { id: "mesh-5", name: "SM_Calibration_Sphere", folder: "Meshes", type: "mesh", format: ".vmesh (Vulkan Binary)", sizeKb: 64, guid: "guid-mesh-sphere-pbr", description: "Subdivided UV sphere for PBR material calibration." },

  // Textures
  { id: "tex-1", name: "T_DarkAlloy_Albedo", folder: "Textures", type: "texture", format: ".vtex (BC7_UNORM)", sizeKb: 4096, guid: "guid-tex-dark-albedo", description: "2048x2048 Linear Albedo Base Color texture." },
  { id: "tex-2", name: "T_DarkAlloy_Normal", folder: "Textures", type: "texture", format: ".vtex (BC5_SNORM)", sizeKb: 4096, guid: "guid-tex-dark-normal", description: "Tangent-space 2-channel reconstructed normal map." },
  { id: "tex-3", name: "T_DarkAlloy_RoughnessMetallic", folder: "Textures", type: "texture", format: ".vtex (BC7_UNORM)", sizeKb: 2048, guid: "guid-tex-dark-orm", description: "Packed Occlusion/Roughness/Metallic mask map." },

  // Materials
  { id: "mat-1", name: "M_DarkAlloy_PBR", folder: "Materials", type: "material", format: ".vmat (PBR Graph)", sizeKb: 12, guid: "guid-mat-dark-alloy", description: "High-specular military titanium PBR shader instance." },
  { id: "mat-2", name: "M_RustyIron_Industrial", folder: "Materials", type: "material", format: ".vmat (PBR Graph)", sizeKb: 14, guid: "guid-mat-rusty-iron", description: "Weathered ferrous metal with oxidation wear." },
  { id: "mat-3", name: "M_Gold_Reflective", folder: "Materials", type: "material", format: ".vmat (PBR Graph)", sizeKb: 8, guid: "guid-mat-gold", description: "Dielectric metal with zero roughness." },
  { id: "mat-4", name: "M_Grid_Concrete", folder: "Materials", type: "material", format: ".vmat (PBR Graph)", sizeKb: 10, guid: "guid-mat-grid-concrete", description: "Matte hangar concrete foundation floor." },

  // Shaders
  { id: "sh-1", name: "GBuffer.vert.spv", folder: "Shaders", type: "shader", format: ".spv (SPIR-V)", sizeKb: 24, guid: "guid-sh-gbuffer-vert", description: "Vulkan 1.3 Vertex shader with bindless transform buffer." },
  { id: "sh-2", name: "GBuffer.frag.spv", folder: "Shaders", type: "shader", format: ".spv (SPIR-V)", sizeKb: 36, guid: "guid-sh-gbuffer-frag", description: "Multiple Render Target (MRT) G-Buffer rasterization." },
  { id: "sh-3", name: "DeferredPBR.comp.spv", folder: "Shaders", type: "shader", format: ".spv (SPIR-V)", sizeKb: 48, guid: "guid-sh-pbr-comp", description: "Compute-driven Cook-Torrance GGX lighting evaluation." },
  { id: "sh-4", name: "DepthPrepass.vert.spv", folder: "Shaders", type: "shader", format: ".spv (SPIR-V)", sizeKb: 16, guid: "guid-sh-depth-vert", description: "Early-Z depth-only GPU culling prepass." },

  // Scenes
  { id: "sc-1", name: "SciFiHangar.vscene", folder: "Scenes", type: "scene", format: ".vscene (Vanguard Scene)", sizeKb: 56, guid: "guid-scene-hangar", description: "Complete industrial assembly hangar scene." },
  { id: "sc-2", name: "PhysicsLab.vscene", folder: "Scenes", type: "scene", format: ".vscene (Vanguard Scene)", sizeKb: 44, guid: "guid-scene-physlab", description: "Jolt physics stress-testing arena." },
  { id: "sc-3", name: "CyberCity.vscene", folder: "Scenes", type: "scene", format: ".vscene (Vanguard Scene)", sizeKb: 68, guid: "guid-scene-cyber", description: "Cyberpunk urban alleyway with volumetric neon." },
  { id: "sc-4", name: "VulkanPBRShowcase.vscene", folder: "Scenes", type: "scene", format: ".vscene (Vanguard Scene)", sizeKb: 38, guid: "guid-scene-pbr", description: "Material calibration test spheres." },

  // Physics
  { id: "ph-1", name: "PhysMat_HeavyMetal.jphys", folder: "Physics", type: "physics", format: ".jphys (Jolt Material)", sizeKb: 4, guid: "guid-jphys-metal", description: "Friction 0.8, Restitution 0.15, Density 7800 kg/m³." },
  { id: "ph-2", name: "PhysMat_RubberBouncy.jphys", folder: "Physics", type: "physics", format: ".jphys (Jolt Material)", sizeKb: 4, guid: "guid-jphys-rubber", description: "Friction 0.2, Restitution 0.85, Density 1200 kg/m³." },
];

interface ContentBrowserPanelProps {
  onLoadScene?: (sceneName: string) => void;
  onSpawnMesh?: (meshName: string) => void;
}

export const ContentBrowserPanel: React.FC<ContentBrowserPanelProps> = ({
  onLoadScene,
  onSpawnMesh,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedAsset, setSelectedAsset] = useState<AssetEntry | null>(ASSET_REGISTRY[0]);

  const folders = ["All", "Meshes", "Textures", "Materials", "Shaders", "Scenes", "Physics"];

  const filteredAssets = ASSET_REGISTRY.filter((asset) => {
    const matchesFolder = selectedFolder === "All" || asset.folder === selectedFolder;
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.format.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const getAssetIcon = (type: AssetEntry["type"]) => {
    switch (type) {
      case "mesh":
        return <Box className="w-5 h-5 text-sky-400" />;
      case "texture":
        return <ImageIcon className="w-5 h-5 text-emerald-400" />;
      case "material":
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case "shader":
        return <FileCode2 className="w-5 h-5 text-violet-400" />;
      case "scene":
        return <Layers className="w-5 h-5 text-rose-400" />;
      case "physics":
        return <Database className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div id="vanguard-content-browser" className="h-full flex flex-col bg-[#0b0e14] text-xs font-mono text-slate-300">
      {/* 1. Header Toolbar */}
      <div className="h-8 bg-[#121622] border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="flex items-center gap-1.5 font-bold text-sky-400">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>CONTENT BROWSER</span>
          </div>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400 text-[11px]">Assets / {selectedFolder}</span>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0b0e14] text-slate-200 text-[11px] rounded pl-7 pr-2 py-0.5 border border-slate-700 focus:outline-none focus:border-sky-500 w-36 sm:w-48 font-mono"
            />
          </div>

          <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded ${viewMode === "grid" ? "bg-slate-700 text-sky-400" : "text-slate-400 hover:text-slate-200"}`}
              title="Grid View"
            >
              <Grid className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded ${viewMode === "list" ? "bg-slate-700 text-sky-400" : "text-slate-400 hover:text-slate-200"}`}
              title="List View"
            >
              <List className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Browser Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Directory Tree */}
        <div className="w-36 sm:w-44 bg-[#101420] border-r border-slate-800/80 p-2 flex flex-col shrink-0">
          <span className="text-[10px] text-slate-500 uppercase font-bold px-1.5 py-1">Virtual Root</span>
          <div className="space-y-0.5">
            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-1.5 transition text-[11px] ${
                  selectedFolder === folder
                    ? "bg-sky-600/30 text-sky-300 font-bold border-l-2 border-sky-400"
                    : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Folder className={`w-3.5 h-3.5 ${selectedFolder === folder ? "text-sky-400" : "text-slate-500"}`} />
                <span>{folder}</span>
              </button>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="mt-auto p-2 bg-[#0c0f17] rounded border border-slate-800/60 text-[10px] text-slate-500">
            <div>Assets: {filteredAssets.length} / {ASSET_REGISTRY.length}</div>
            <div>Package: VFS Virtual Mount</div>
          </div>
        </div>

        {/* Center: Assets Container */}
        <div className="flex-1 p-3 overflow-y-auto bg-[#0b0e14]">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {filteredAssets.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id;
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-2 rounded-lg border cursor-pointer transition flex flex-col items-center text-center group relative ${
                      isSelected
                        ? "bg-sky-950/50 border-sky-500 shadow-md"
                        : "bg-[#121622]/80 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="w-12 h-12 rounded bg-[#0b0e14] border border-slate-800/80 flex items-center justify-center mb-1.5 group-hover:scale-105 transition shadow-inner">
                      {getAssetIcon(asset.type)}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200 truncate w-full" title={asset.name}>
                      {asset.name}
                    </span>
                    <span className="text-[9.5px] text-slate-500 truncate w-full mt-0.5">
                      {asset.format}
                    </span>
                    <span className="text-[9px] text-sky-400/80 font-mono mt-0.5">
                      {asset.sizeKb} KB
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredAssets.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id;
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-2 rounded border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? "bg-sky-950/50 border-sky-500 text-sky-200"
                        : "bg-[#121622]/80 border-slate-800/80 hover:bg-slate-800/60 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getAssetIcon(asset.type)}
                      <span className="font-semibold text-[11px] truncate">{asset.name}</span>
                      <span className="text-slate-500 text-[10px] hidden sm:inline">[{asset.format}]</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 shrink-0">
                      <span>{asset.folder}</span>
                      <span className="text-sky-400">{asset.sizeKb} KB</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Inspector Drawer for Selected Asset */}
        {selectedAsset && (
          <div className="w-64 sm:w-72 bg-[#121622] border-l border-slate-800/80 p-3 flex flex-col shrink-0 overflow-y-auto">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              {getAssetIcon(selectedAsset.type)}
              <div className="min-w-0">
                <h4 className="font-bold text-slate-200 text-xs truncate">{selectedAsset.name}</h4>
                <p className="text-[10px] text-slate-500">{selectedAsset.format}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Description</span>
                <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">{selectedAsset.description}</p>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Asset GUID</span>
                <code className="text-sky-400 text-[10px] bg-slate-900 px-1 py-0.5 rounded block truncate mt-0.5 border border-slate-800">
                  {selectedAsset.guid}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 text-[9px] block">Size On Disk</span>
                  <span className="text-slate-200 font-bold">{selectedAsset.sizeKb} KB</span>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-500 text-[9px] block">Compression</span>
                  <span className="text-emerald-400 font-bold">Vulkan VFS</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 space-y-1.5">
                {selectedAsset.type === "scene" && onLoadScene && (
                  <button
                    onClick={() => onLoadScene(selectedAsset.name.replace(".vscene", ""))}
                    className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded flex items-center justify-center gap-1.5 text-xs shadow-sm transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Load Scene Map</span>
                  </button>
                )}

                {selectedAsset.type === "mesh" && onSpawnMesh && (
                  <button
                    onClick={() => onSpawnMesh(selectedAsset.name)}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold rounded border border-slate-700 flex items-center justify-center gap-1.5 text-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Spawn in 3D Viewport</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
