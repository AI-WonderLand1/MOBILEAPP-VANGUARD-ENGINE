"use client";

import React, { useState } from "react";
import { Viewport3D } from "@/components/Viewport3D";
import { PropertyInspector } from "@/components/PropertyInspector";
import { RenderGraphVisualizer } from "@/components/RenderGraphVisualizer";
import { TracyProfilerPanel } from "@/components/TracyProfilerPanel";
import { JoltPhysicsPanel } from "@/components/JoltPhysicsPanel";
import { MemoryLayoutVisualizer } from "@/components/MemoryLayoutVisualizer";
import { ConsoleSystemPanel } from "@/components/ConsoleSystemPanel";
import { ContentBrowserPanel } from "@/components/ContentBrowserPanel";
import { DockLayoutModal } from "@/components/DockLayoutModal";
import { INITIAL_ACTORS, ENGINE_SCENE_PRESETS } from "@/lib/engine-data/reflection-system";
import { EngineActor, EngineComponent } from "@/lib/engine-data/types";
import {
  Activity,
  ArrowRight,
  Binary,
  Box,
  Boxes,
  Camera,
  ChevronDown,
  ChevronRight,
  Code2,
  Cpu,
  Eye,
  EyeOff,
  FolderOpen,
  FolderTree,
  Layers,
  Layout,
  Maximize2,
  Move,
  Network,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Scaling,
  Search,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";

interface EditorWorkbenchProps {
  onOpenCodebase: () => void;
  onOpenComponentGenerator: () => void;
  onOpenAIConsultant: () => void;
}

export const EditorWorkbench: React.FC<EditorWorkbenchProps> = ({
  onOpenCodebase,
  onOpenComponentGenerator,
  onOpenAIConsultant,
}) => {
  // Engine State
  const [actors, setActors] = useState<EngineActor[]>(INITIAL_ACTORS);
  const [selectedActorId, setSelectedActorId] = useState<string | null>("actor-hero-mech");
  const [gizmoMode, setGizmoMode] = useState<"translate" | "rotate" | "scale">("translate");
  const [engineState, setEngineState] = useState<"edit" | "play" | "pause">("edit");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDockModalOpen, setIsDockModalOpen] = useState(false);

  // Bottom dock active tab (Default to Content Browser or Console per blueprint)
  const [activeBottomTab, setActiveBottomTab] = useState<
    "content-browser" | "console" | "render-graph" | "tracy-profiler" | "jolt-physics" | "memory-layout"
  >("console");

  // Selected Actor object
  const selectedActor = actors.find((a) => a.id === selectedActorId) || null;

  // Handler: Update Transform
  const handleUpdateActorTransform = (
    actorId: string,
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }
  ) => {
    setActors((prev) =>
      prev.map((actor) => {
        if (actor.id === actorId) {
          return {
            ...actor,
            transform,
            components: actor.components.map((comp) => {
              if (comp.type === "TransformComponent") {
                return {
                  ...comp,
                  properties: {
                    ...comp.properties,
                    m_LocalPosition: transform.position,
                    m_LocalRotation: transform.rotation,
                    m_LocalScale: transform.scale,
                  },
                };
              }
              return comp;
            }),
          };
        }
        return actor;
      })
    );
  };

  // Handler: Update Component Property (reflection-driven)
  const handleUpdateComponentProperty = (
    actorId: string,
    componentId: string,
    propertyName: string,
    value: any
  ) => {
    setActors((prev) =>
      prev.map((actor) => {
        if (actor.id === actorId) {
          const updatedComponents = actor.components.map((comp) => {
            if (comp.id === componentId) {
              return {
                ...comp,
                properties: {
                  ...comp.properties,
                  [propertyName]: value,
                },
              };
            }
            return comp;
          });

          // If transform properties changed, also sync actor root transform
          let updatedTransform = { ...actor.transform };
          if (propertyName === "m_LocalPosition") updatedTransform.position = value;
          if (propertyName === "m_LocalRotation") updatedTransform.rotation = value;
          if (propertyName === "m_LocalScale") updatedTransform.scale = value;

          return {
            ...actor,
            transform: updatedTransform,
            components: updatedComponents,
          };
        }
        return actor;
      })
    );
  };

  // Handler: Load Scene Preset
  const handleLoadScene = (sceneName: string) => {
    const scene = ENGINE_SCENE_PRESETS[sceneName];
    if (scene) {
      setActors(scene.actors);
      if (scene.actors.length > 0) {
        setSelectedActorId(scene.actors[0].id);
      } else {
        setSelectedActorId(null);
      }
    }
  };

  // Handler: Spawn Dynamic Actor from Console or Quick Palettes
  const handleSpawnActor = (name: string, meshType: string = "SM_Industrial_Crate") => {
    const newId = `actor-${Date.now()}`;
    const newActor: EngineActor = {
      id: newId,
      name,
      tag: "Spawned",
      layer: "Default",
      isStatic: false,
      isVisible: true,
      parentId: null,
      childrenIds: [],
      transform: {
        position: [Math.random() * 4 - 2, 2.0, Math.random() * 4 - 2],
        rotation: [0, Math.random() * 360, 0],
        scale: [1, 1, 1],
      },
      components: [
        {
          id: `comp-t-${newId}`,
          type: "TransformComponent",
          name: "TransformComponent",
          enabled: true,
          properties: {
            m_LocalPosition: [0, 2, 0],
            m_LocalRotation: [0, 0, 0],
            m_LocalScale: [1, 1, 1],
            m_bIsStatic: false,
          },
        },
        {
          id: `comp-m-${newId}`,
          type: "StaticMeshComponent",
          name: `Mesh: ${meshType}`,
          enabled: true,
          properties: {
            m_MeshAssetHandle: `guid-mesh-${meshType.toLowerCase()}`,
            m_MaterialAssetHandle: "guid-mat-dark-alloy",
            m_bCastShadows: true,
            m_bReceiveDecals: true,
            m_RoughnessMultiplier: 0.3,
            m_MetallicMultiplier: 0.7,
            m_BaseColorTint: [0.2, 0.7, 0.9, 1.0],
          },
        },
        {
          id: `comp-p-${newId}`,
          type: "JoltRigidBodyComponent",
          name: "JoltRigidBodyComponent",
          enabled: true,
          properties: {
            m_MotionType: "Dynamic",
            m_MassKg: 45.0,
            m_Friction: 0.6,
            m_Restitution: 0.3,
            m_CollisionLayer: "MOVING",
          },
        },
      ],
    };

    setActors((prev) => [...prev, newActor]);
    setSelectedActorId(newId);
  };

  // Handler: Spawn Preset from Tools Sidebar
  const handleSpawnPreset = (type: "crate" | "sphere" | "light" | "camera" | "mech") => {
    const timestamp = Date.now().toString().slice(-4);
    if (type === "crate") {
      handleSpawnActor(`Spawned_Crate_${timestamp}`, "SM_Industrial_Crate");
    } else if (type === "sphere") {
      handleSpawnActor(`Spawned_Sphere_${timestamp}`, "SM_Calibration_Sphere");
    } else if (type === "mech") {
      handleSpawnActor(`Spawned_Mech_${timestamp}`, "SM_Vanguard_Mech");
    } else if (type === "light") {
      const newId = `actor-light-${timestamp}`;
      const newLight: EngineActor = {
        id: newId,
        name: `PointLight_${timestamp}`,
        tag: "Lighting",
        layer: "Default",
        parentId: null,
        childrenIds: [],
        transform: { position: [0, 3, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        isStatic: false,
        isVisible: true,
        components: [
          {
            id: `comp-l-${newId}`,
            type: "PointLightComponent",
            name: "PointLightComponent",
            enabled: true,
            properties: {
              m_LightColor: [0.2, 0.8, 1.0],
              m_IntensityLumens: 5000,
              m_AttenuationRadius: 15.0,
              m_bCastShadows: true,
            },
          },
        ],
      };
      setActors((prev) => [...prev, newLight]);
      setSelectedActorId(newId);
    } else if (type === "camera") {
      const newId = `actor-cam-${timestamp}`;
      const newCam: EngineActor = {
        id: newId,
        name: `Camera_${timestamp}`,
        tag: "Camera",
        layer: "Default",
        parentId: null,
        childrenIds: [],
        transform: { position: [0, 2, 5], rotation: [0, 0, 0], scale: [1, 1, 1] },
        isStatic: false,
        isVisible: true,
        components: [
          {
            id: `comp-c-${newId}`,
            type: "CameraComponent",
            name: "CameraComponent",
            enabled: true,
            properties: {
              m_FieldOfViewDegrees: 60.0,
              m_NearClipPlane: 0.1,
              m_FarClipPlane: 1000.0,
              m_bIsPrimaryCamera: false,
            },
          },
        ],
      };
      setActors((prev) => [...prev, newCam]);
      setSelectedActorId(newId);
    }
  };

  // Handler: Teleport Actor
  const handleTeleportActor = (actorId: string, position: [number, number, number]) => {
    setActors((prev) =>
      prev.map((a) => (a.id === actorId ? { ...a, transform: { ...a.transform, position } } : a))
    );
  };

  // Handler: Add Component to Actor
  const handleAddComponent = (actorId: string, componentType: string) => {
    setActors((prev) =>
      prev.map((actor) => {
        if (actor.id === actorId) {
          const newComp: EngineComponent = {
            id: `comp-${Date.now()}`,
            type: componentType,
            name: componentType,
            enabled: true,
            properties:
              componentType === "PointLightComponent"
                ? { m_LightColor: [0.0, 0.9, 1.0], m_IntensityLumens: 10000.0, m_AttenuationRadius: 15.0, m_bCastShadows: true }
                : componentType === "JoltRigidBodyComponent"
                ? { m_MotionType: "Dynamic", m_MassKg: 50.0, m_Friction: 0.5, m_Restitution: 0.2, m_CollisionLayer: "MOVING" }
                : componentType === "CameraComponent"
                ? { m_FieldOfViewDegrees: 60.0, m_NearClipPlane: 0.1, m_FarClipPlane: 1000.0, m_bIsPrimaryCamera: true }
                : componentType === "CharacterMovementComponent"
                ? { m_MaxWalkSpeed: 24.0, m_MaxAcceleration: 80.0, m_GravityZ: -9.81, m_bIsFlying: false }
                : {},
          };
          return {
            ...actor,
            components: [...actor.components, newComp],
          };
        }
        return actor;
      })
    );
  };

  // Handler: Remove Component
  const handleRemoveComponent = (actorId: string, componentId: string) => {
    setActors((prev) =>
      prev.map((actor) => {
        if (actor.id === actorId) {
          return {
            ...actor,
            components: actor.components.filter((c) => c.id !== componentId),
          };
        }
        return actor;
      })
    );
  };

  // Handler: Toggle Actor Visibility
  const handleToggleVisibility = (actorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActors((prev) =>
      prev.map((a) => (a.id === actorId ? { ...a, isVisible: !a.isVisible } : a))
    );
  };

  // Handler: Create New Empty Actor
  const handleCreateActor = () => {
    const newId = `actor-${Date.now()}`;
    const newActor: EngineActor = {
      id: newId,
      name: `Actor_Entity_${actors.length + 1}`,
      tag: "Default",
      layer: "Default",
      isStatic: false,
      isVisible: true,
      parentId: null,
      childrenIds: [],
      transform: {
        position: [0, 2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      components: [
        {
          id: `comp-t-${newId}`,
          type: "TransformComponent",
          name: "TransformComponent",
          enabled: true,
          properties: {
            m_LocalPosition: [0, 2, 0],
            m_LocalRotation: [0, 0, 0],
            m_LocalScale: [1, 1, 1],
            m_bIsStatic: false,
          },
        },
      ],
    };
    setActors((prev) => [...prev, newActor]);
    setSelectedActorId(newId);
  };

  // Handler: Delete Actor
  const handleDeleteActor = (actorId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActors((prev) => prev.filter((a) => a.id !== actorId));
    if (selectedActorId === actorId) {
      setSelectedActorId(null);
    }
  };

  // Handler: Jolt impulse to box
  const handleApplyPhysicsImpulse = (impulseY: number = 8.0) => {
    setActors((prev) =>
      prev.map((actor) => {
        if (actor.id === "actor-physics-box" || actor.name.includes("Crate")) {
          const newPos: [number, number, number] = [
            actor.transform.position[0],
            actor.transform.position[1] + impulseY * 0.25,
            actor.transform.position[2],
          ];
          return {
            ...actor,
            transform: {
              ...actor.transform,
              position: newPos,
            },
          };
        }
        return actor;
      })
    );
  };

  // Filtered actors for search
  const filteredActors = actors.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="vanguard-editor-dockspace" className="h-screen w-screen flex flex-col bg-[#0b0e14] text-slate-200 select-none overflow-hidden font-sans">
      {/* 1. Top ImGui Application Menu Bar */}
      <header className="h-10 bg-[#121622] border-b border-slate-800 flex items-center justify-between px-3 text-xs shrink-0 z-20">
        {/* Left: Engine Logo & Dropdowns */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2 font-mono font-bold text-sky-400">
            <Boxes className="w-5 h-5" />
            <span className="tracking-wider text-sm text-slate-100">VANGUARD</span>
            <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-800">
              v1.0.0-PROD
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1"></div>

          {/* Menu Dropdown Buttons */}
          <nav className="flex items-center space-x-1 text-slate-300 font-medium">
            <button className="px-2 py-1 rounded hover:bg-slate-800 hover:text-white transition">File</button>
            <button className="px-2 py-1 rounded hover:bg-slate-800 hover:text-white transition">Edit</button>
            <button className="px-2 py-1 rounded hover:bg-slate-800 hover:text-white transition">Rendering</button>
            <button className="px-2 py-1 rounded hover:bg-slate-800 hover:text-white transition">Physics</button>
            <button
              onClick={() => setIsDockModalOpen(true)}
              className="px-2 py-1 rounded hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition flex items-center gap-1"
            >
              <Layout className="w-3 h-3" />
              <span>Dock Layout</span>
            </button>
          </nav>
        </div>

        {/* Center: Play / Pause / Simulation Controls */}
        <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800 shadow-inner">
          <button
            onClick={() => setEngineState("play")}
            className={`px-3 py-1 rounded flex items-center gap-1.5 font-mono text-xs transition ${
              engineState === "play"
                ? "bg-emerald-600 text-white font-bold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Start Engine Tick Simulation (Play)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play</span>
          </button>

          <button
            onClick={() => setEngineState("pause")}
            className={`px-3 py-1 rounded flex items-center gap-1.5 font-mono text-xs transition ${
              engineState === "pause"
                ? "bg-amber-600 text-white font-bold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Pause Simulation"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>

          <button
            onClick={() => setEngineState("edit")}
            className={`px-3 py-1 rounded flex items-center gap-1.5 font-mono text-xs transition ${
              engineState === "edit"
                ? "bg-slate-800 text-sky-400 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Stop & Reset to Editor Mode"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>
        </div>

        {/* Right: Quick Tools & AI Consultant Launchers */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveBottomTab("console")}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-xs flex items-center gap-1.5 border border-slate-700 transition"
            title="Open Console CLI"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Console</span>
          </button>

          <button
            onClick={onOpenComponentGenerator}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 border border-slate-700 transition"
            title="Design Reflected C++ Component"
          >
            <Wrench className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Component Generator</span>
          </button>

          <button
            onClick={onOpenCodebase}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 border border-slate-700 transition"
            title="Explore Full C++ Engine Architecture"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">C++ Codebase</span>
          </button>

          <button
            onClick={onOpenAIConsultant}
            className="px-3 py-1 rounded bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition"
            title="Ask Vanguard Lead Engine Architect AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Architect</span>
          </button>
        </div>
      </header>

      {/* 2. Main Docking Layout Workspace (Adhering to Unreal Engine ImGui::DockBuilder Blueprint) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ========================================================================= */}
        {/* CENTER SPACE: Dedicated 3D Viewport sitting in the center & Bottom Dock    */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0c0f14]">
          {/* Top: Dedicated 3D Viewport Window */}
          <div className="flex-1 relative min-h-[300px] border-b border-slate-800">
            <Viewport3D
              actors={actors}
              selectedActorId={selectedActorId}
              onSelectActor={setSelectedActorId}
              onUpdateActorTransform={handleUpdateActorTransform}
              gizmoMode={gizmoMode}
              onSetGizmoMode={setGizmoMode}
              isPhysicsActive={engineState === "play"}
            />
          </div>

          {/* Bottom Dock (25% Height): Content Browser, Console, Render Graph, Tracy, Jolt, Memory */}
          <div className="h-[25%] min-h-[220px] max-h-[340px] bg-[#121620] flex flex-col shrink-0">
            {/* Dock Tabs Header */}
            <div className="h-9 bg-[#171d2b] border-b border-slate-800 flex items-center justify-between px-2 text-xs shrink-0 overflow-x-auto">
              <div className="flex items-center space-x-1 font-mono">
                {/* Content Browser Tab */}
                <button
                  onClick={() => setActiveBottomTab("content-browser")}
                  className={`px-3 py-1.5 rounded-t-md transition flex items-center gap-1.5 ${
                    activeBottomTab === "content-browser"
                      ? "bg-[#121620] text-sky-400 font-bold border-t-2 border-sky-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Content Browser</span>
                </button>

                {/* Console Tab */}
                <button
                  onClick={() => setActiveBottomTab("console")}
                  className={`px-3 py-1.5 rounded-t-md transition flex items-center gap-1.5 ${
                    activeBottomTab === "console"
                      ? "bg-[#121620] text-emerald-400 font-bold border-t-2 border-emerald-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Console / Output Log</span>
                </button>

                {/* Render Graph Pipeline Tab */}
                <button
                  onClick={() => setActiveBottomTab("render-graph")}
                  className={`px-3 py-1.5 rounded-t-md transition flex items-center gap-1.5 ${
                    activeBottomTab === "render-graph"
                      ? "bg-[#121620] text-violet-400 font-bold border-t-2 border-violet-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Render Graph</span>
                </button>

                {/* Tracy Profiler Tab */}
                <button
                  onClick={() => setActiveBottomTab("tracy-profiler")}
                  className={`px-3 py-1.5 rounded-t-md transition flex items-center gap-1.5 ${
                    activeBottomTab === "tracy-profiler"
                      ? "bg-[#121620] text-emerald-400 font-bold border-t-2 border-emerald-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Tracy Profiler</span>
                </button>

                {/* Jolt Physics Tab */}
                <button
                  onClick={() => setActiveBottomTab("jolt-physics")}
                  className={`px-3 py-1.5 rounded-t-md transition flex items-center gap-1.5 ${
                    activeBottomTab === "jolt-physics"
                      ? "bg-[#121620] text-amber-400 font-bold border-t-2 border-amber-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Jolt Physics</span>
                </button>

                {/* Memory Struct Alignment Tab */}
                <button
                  onClick={() => setActiveBottomTab("memory-layout")}
                  className={`px-3 py-1.5 rounded-t-md transition flex items-center gap-1.5 ${
                    activeBottomTab === "memory-layout"
                      ? "bg-[#121620] text-cyan-400 font-bold border-t-2 border-cyan-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Binary className="w-3.5 h-3.5" />
                  <span>Memory Structs</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSpawnPreset("crate")}
                  className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700"
                >
                  <Box className="w-3 h-3 text-amber-400" />
                  <span>+Crate</span>
                </button>
                <button
                  onClick={() => handleSpawnPreset("light")}
                  className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700"
                >
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>+Light</span>
                </button>
                <button
                  onClick={() => handleApplyPhysicsImpulse(10.0)}
                  className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900/90 text-amber-300 text-[11px] font-mono border border-amber-800/60"
                >
                  <Zap className="w-3 h-3" />
                  <span>+Impulse</span>
                </button>
                <div className="text-[10px] text-slate-500 font-mono hidden md:inline">
                  DockBuilder 25% Bottom Node
                </div>
              </div>
            </div>

            {/* Dock Content Area */}
            <div className="flex-1 overflow-hidden">
              {activeBottomTab === "content-browser" && (
                <ContentBrowserPanel
                  onLoadScene={handleLoadScene}
                  onSpawnMesh={(mesh) => handleSpawnActor(`Spawned_${mesh}`, mesh)}
                />
              )}
              {activeBottomTab === "console" && (
                <ConsoleSystemPanel
                  actors={actors}
                  onUpdateActorProperty={handleUpdateComponentProperty}
                  onLoadScene={handleLoadScene}
                  onSpawnActor={handleSpawnActor}
                  onDestroyActor={(id) => handleDeleteActor(id)}
                  onSetGizmoMode={setGizmoMode}
                  onTeleportActor={handleTeleportActor}
                />
              )}
              {activeBottomTab === "render-graph" && <RenderGraphVisualizer />}
              {activeBottomTab === "tracy-profiler" && <TracyProfilerPanel />}
              {activeBottomTab === "jolt-physics" && (
                <JoltPhysicsPanel onApplyImpulseToBox={handleApplyPhysicsImpulse} />
              )}
              {activeBottomTab === "memory-layout" && <MemoryLayoutVisualizer />}
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* RIGHT SIDEBAR: Split into Outliner (Top 45%) & Details (Bottom 55%)       */}
        {/* ========================================================================= */}
        <aside className="w-full md:w-[28%] min-w-[320px] max-w-[420px] bg-[#121622] border-l border-slate-800 flex flex-col shrink-0 overflow-hidden">
          {/* Top 45%: Scene Outliner Hierarchy */}
          <div className="h-[45%] min-h-[190px] border-b border-slate-800 flex flex-col overflow-hidden">
            {/* Outliner Header */}
            <div className="p-2.5 bg-[#171d2b] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-sky-400" />
                <span className="font-semibold text-slate-200 font-mono text-xs uppercase tracking-wider">
                  Scene Outliner (Top 45%)
                </span>
              </div>

              <button
                onClick={handleCreateActor}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-[10px]"
                title="Create Empty Actor"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="p-2 border-b border-slate-800/80 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search scene entities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 text-slate-200 text-xs rounded-md pl-8 pr-2 py-1 border border-slate-800 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            {/* Actor Hierarchy Tree */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
              {filteredActors.map((actor) => {
                const isSelected = actor.id === selectedActorId;
                return (
                  <div
                    key={actor.id}
                    onClick={() => setSelectedActorId(actor.id)}
                    className={`p-2 rounded-lg cursor-pointer transition flex items-center justify-between group ${
                      isSelected
                        ? "bg-sky-600 text-white font-semibold shadow-sm"
                        : "hover:bg-slate-800/60 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <Box className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white" : "text-sky-400"}`} />
                      <span className="truncate">{actor.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 shrink-0">
                      <button
                        onClick={(e) => handleToggleVisibility(actor.id, e)}
                        className="p-0.5 rounded hover:bg-black/20 text-slate-400 hover:text-white"
                        title={actor.isVisible ? "Hide Entity" : "Show Entity"}
                      >
                        {actor.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
                      </button>

                      {actor.id !== "actor-hero-mech" && (
                        <button
                          onClick={(e) => handleDeleteActor(actor.id, e)}
                          className="p-0.5 rounded hover:bg-black/20 text-slate-400 hover:text-rose-400"
                          title="Delete Entity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Outliner Footer */}
            <div className="p-1.5 bg-[#171d2b] border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between shrink-0">
              <span>Entities: {actors.length}</span>
              <span>Selected: {selectedActor ? selectedActor.name : "None"}</span>
            </div>
          </div>

          {/* Bottom 55%: Details / Property Inspector */}
          <div className="h-[55%] flex-1 flex flex-col overflow-hidden bg-[#131722]">
            <PropertyInspector
              actor={selectedActor}
              onUpdateComponentProperty={handleUpdateComponentProperty}
              onAddComponent={handleAddComponent}
              onRemoveComponent={handleRemoveComponent}
              onUpdateActorDetails={(id, updates) => {
                setActors((prev) =>
                  prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
                );
              }}
            />
          </div>
        </aside>
      </div>

      {/* 3. Bottom ImGui Status Bar */}
      <footer className="h-6 bg-[#0f1219] border-t border-slate-800 flex items-center justify-between px-3 text-[11px] font-mono text-slate-400 shrink-0 select-none">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>60.0 FPS (16.6 ms)</span>
          </span>

          <span className="text-slate-600">|</span>

          <span>Vulkan: 1.3.280 (NVIDIA Driver 550.54)</span>

          <span className="text-slate-600">|</span>

          <span>Tracy: Connected (Port 8086)</span>
        </div>

        <div className="flex items-center space-x-4">
          <span>VMA Allocations: 128 MB</span>
          <span className="text-slate-600">|</span>
          <span className="text-sky-400 font-bold">
            {engineState === "play" ? "SIMULATION RUNNING" : "EDITOR ACTIVE"}
          </span>
        </div>
      </footer>

      {/* DockBuilder Blueprint Architecture Modal */}
      <DockLayoutModal
        isOpen={isDockModalOpen}
        onClose={() => setIsDockModalOpen(false)}
      />
    </div>
  );
};
