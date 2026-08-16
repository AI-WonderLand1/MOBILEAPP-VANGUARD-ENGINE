"use client";

import React, { useState, useRef, useEffect } from "react";
import { EngineActor } from "@/lib/engine-data/types";
import { REFLECTED_CLASSES, ENGINE_SCENE_PRESETS } from "@/lib/engine-data/reflection-system";
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  Copy,
  Check,
  CornerDownLeft,
  Filter,
  Layers,
  HelpCircle,
  Sparkles,
  Zap,
  Sliders,
  ChevronRight,
  Code2,
} from "lucide-react";

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  type: "command" | "info" | "success" | "warning" | "error" | "reflection";
  message: string;
  details?: string[];
  executionTimeMs?: number;
}

interface ConsoleSystemPanelProps {
  actors: EngineActor[];
  onUpdateActorProperty: (actorId: string, componentId: string, propertyName: string, value: any) => void;
  onLoadScene: (sceneName: string) => void;
  onSpawnActor: (name: string, type?: string) => void;
  onDestroyActor: (actorId: string) => void;
  onSetGizmoMode: (mode: "translate" | "rotate" | "scale") => void;
  onTeleportActor: (actorId: string, position: [number, number, number]) => void;
}

const COMMAND_SUGGESTIONS = [
  { cmd: "list_objects", desc: "Print all active actors, components, and coordinates in current scene" },
  { cmd: "set_variable <object>.<property> <value>", desc: "Modify reflected actor property at byte offset (e.g. set_variable HeroVanguardMech.m_MaxWalkSpeed 35.0)" },
  { cmd: "load_scene <scene_name>", desc: "Load scene preset: SciFiHangar, PhysicsLab, CyberCity, VulkanPBRShowcase, EmptyScene" },
  { cmd: "spawn_actor <name> [mesh_type]", desc: "Spawn a new actor entity in the 3D scene (e.g. spawn_actor Drone_Alpha SM_Crate)" },
  { cmd: "destroy_actor <name>", desc: "Delete an actor entity from current scene" },
  { cmd: "teleport <object> <x> <y> <z>", desc: "Instantly translate actor position in world space" },
  { cmd: "dump_reflection <class_name>", desc: "Print memory struct byte offsets and types (e.g. dump_reflection TransformComponent)" },
  { cmd: "stat <fps|memory|jolt|rendergraph>", desc: "Display real-time telemetry diagnostics in console" },
  { cmd: "toggle_gizmo <translate|rotate|scale>", desc: "Switch active viewport manipulation gizmo" },
  { cmd: "r.wireframe <0|1>", desc: "Toggle Vulkan rasterizer polygon wireframe mode" },
  { cmd: "r.shadows <0|1>", desc: "Toggle directional shadow map render pass" },
  { cmd: "help [command]", desc: "Show syntax and documentation for all console commands" },
  { cmd: "clear", desc: "Clear console log output buffer" },
];

export const ConsoleSystemPanel: React.FC<ConsoleSystemPanelProps> = ({
  actors,
  onUpdateActorProperty,
  onLoadScene,
  onSpawnActor,
  onDestroyActor,
  onSetGizmoMode,
  onTeleportActor,
}) => {
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<string[]>([
    "list_objects",
    "set_variable HeroVanguardMech.m_MaxWalkSpeed 32.5",
    "dump_reflection CharacterMovementComponent",
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [filterType, setFilterType] = useState<"all" | "command" | "info" | "success" | "warning" | "error">("all");
  const [copied, setCopied] = useState(false);
  const [showAutoComplete, setShowAutoComplete] = useState(false);

  const [logs, setLogs] = useState<ConsoleLogEntry[]>([
    {
      id: "log-init-1",
      timestamp: "00:00:00.120",
      type: "info",
      message: "[Vanguard Console Subsystem] Initialized. Type 'help' for command manual, 'list_objects' to enumerate scene entities.",
    },
    {
      id: "log-init-2",
      timestamp: "00:00:00.122",
      type: "info",
      message: "[Reflection Registry] 6 Classes registered (TransformComponent, StaticMeshComponent, PointLightComponent, JoltRigidBodyComponent, CharacterMovementComponent, CameraComponent).",
    },
  ]);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on logs update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (
    type: ConsoleLogEntry["type"],
    message: string,
    details?: string[],
    executionTimeMs?: number
  ) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: timeStr,
        type,
        message,
        details,
        executionTimeMs,
      },
    ]);
  };

  // Execute Command Core
  const executeCommand = (cmdString: string) => {
    const trimmed = cmdString.trim();
    if (!trimmed) return;

    const startTime = performance.now();

    // Add to history
    setHistory((prev) => [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 50));
    setHistoryIndex(-1);

    // Echo command in logs
    addLog("command", `> ${trimmed}`);

    // Parse tokens respecting quotes
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    const tokens: string[] = [];
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
      tokens.push(match[1] || match[2] || match[0]);
    }

    if (tokens.length === 0) return;

    const primaryCmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    switch (primaryCmd) {
      case "help":
      case "?":
      case "man": {
        if (args.length > 0) {
          const target = args[0].toLowerCase();
          const found = COMMAND_SUGGESTIONS.find((c) => c.cmd.toLowerCase().startsWith(target));
          if (found) {
            addLog("info", `Manual for '${found.cmd}':`, [
              `Description: ${found.desc}`,
              `Syntax: ${found.cmd}`,
              `Examples:`,
              found.cmd.includes("set_variable") ? "  set_variable HeroVanguardMech.m_MaxWalkSpeed 32.5\n  set_variable Physics_Crate_Heavy.m_MassKg 200.0" :
              found.cmd.includes("load_scene") ? "  load_scene SciFiHangar\n  load_scene PhysicsLab\n  load_scene CyberCity" :
              found.cmd.includes("teleport") ? "  teleport HeroVanguardMech 0 5 0" : "  Run without arguments to test.",
            ]);
          } else {
            addLog("warning", `No manual entry found for command '${args[0]}'. Type 'help' for full command index.`);
          }
        } else {
          addLog("info", "=== VANGUARD ENGINE CONSOLE COMMAND REFERENCE ===", [
            "  list_objects                          - Enumerate all actors, IDs, coordinates, and components in the active scene",
            "  set_variable <Obj>.<Prop> <Value>     - Mutate reflected property byte offset via reflection system",
            "  load_scene <SceneName>                - Load preset: SciFiHangar, PhysicsLab, CyberCity, VulkanPBRShowcase, EmptyScene",
            "  spawn_actor <Name> [Type]             - Create and spawn new actor entity in viewport",
            "  destroy_actor <Name>                  - Remove actor entity from active scene graph",
            "  teleport <Obj> <X> <Y> <Z>            - Instantly set world transform translation vector",
            "  dump_reflection <ClassName>           - Print struct memory layout, byte offsets, and type descriptors",
            "  stat <fps|memory|jolt|rendergraph>    - Query engine performance metrics and GPU memory allocations",
            "  toggle_gizmo <translate|rotate|scale> - Switch viewport manipulation mode",
            "  r.wireframe <0|1>                     - Enable/disable rasterizer wireframe debug render mode",
            "  r.shadows <0|1>                       - Toggle real-time directional shadow mapping pass",
            "  clear / cls                           - Clear terminal log output",
          ]);
        }
        break;
      }

      case "clear":
      case "cls": {
        setLogs([]);
        break;
      }

      case "list_objects":
      case "list":
      case "ls": {
        const actorDetails = actors.map((a) => {
          const comps = a.components.map((c) => c.type).join(", ");
          const pos = `[${a.transform.position[0].toFixed(1)}, ${a.transform.position[1].toFixed(1)}, ${a.transform.position[2].toFixed(1)}]`;
          return `• [${a.id}] "${a.name}" (Tag: ${a.tag}, Layer: ${a.layer}) Pos: ${pos}\n    Components: [${comps}]`;
        });
        const elapsed = (performance.now() - startTime).toFixed(2);
        addLog(
          "success",
          `[Scene Graph] Found ${actors.length} active Actor entities in current scene graph:`,
          actorDetails,
          parseFloat(elapsed)
        );
        break;
      }

      case "set_variable":
      case "set":
      case "cvar": {
        if (args.length < 2) {
          addLog("error", "Syntax Error: set_variable requires <object_name>.<property_name> <value>", [
            "Example: set_variable HeroVanguardMech.m_MaxWalkSpeed 35.0",
            "Example: set_variable Physics_Crate_Heavy.m_MassKg 250.0",
            "Example: set_variable PointLight_Cyber_Neon.m_LightColor [0.2, 0.9, 1.0]",
          ]);
          return;
        }

        const path = args[0];
        const rawValue = args.slice(1).join(" ");
        const dotIndex = path.indexOf(".");

        if (dotIndex === -1) {
          addLog("error", `Invalid path '${path}'. Expected format '<ObjectName>.<PropertyName>' (e.g. HeroVanguardMech.m_MaxWalkSpeed)`);
          return;
        }

        const objIdentifier = path.substring(0, dotIndex);
        const propIdentifier = path.substring(dotIndex + 1);

        // Find target Actor
        const targetActor = actors.find(
          (a) =>
            a.name.toLowerCase() === objIdentifier.toLowerCase() ||
            a.id.toLowerCase() === objIdentifier.toLowerCase() ||
            a.name.toLowerCase().includes(objIdentifier.toLowerCase())
        );

        if (!targetActor) {
          addLog("error", `Target Actor '${objIdentifier}' not found in current scene graph. Type 'list_objects' to view available names.`);
          return;
        }

        // Search through components of target actor for matching property
        let matchedComponent = null;
        let matchedPropMeta = null;
        let matchedClassMeta = null;

        for (const comp of targetActor.components) {
          const classMeta = REFLECTED_CLASSES[comp.type];
          if (classMeta) {
            const propMeta = classMeta.properties.find(
              (p) => p.name.toLowerCase() === propIdentifier.toLowerCase()
            );
            if (propMeta) {
              matchedComponent = comp;
              matchedPropMeta = propMeta;
              matchedClassMeta = classMeta;
              break;
            }
          }
          // Also check direct component property keys if not registered in class metadata
          if (comp.properties && comp.properties[propIdentifier] !== undefined) {
            matchedComponent = comp;
            break;
          }
        }

        if (!matchedComponent) {
          addLog("error", `Property '${propIdentifier}' not found in any component of actor '${targetActor.name}'.`, [
            `Checked components: ${targetActor.components.map((c) => c.type).join(", ")}`,
            "Type 'dump_reflection <ClassName>' to inspect available property names.",
          ]);
          return;
        }

        // Parse value based on target property type or auto-cast
        let parsedValue: any = rawValue;
        const oldVal = matchedComponent.properties[propIdentifier];

        if (rawValue.toLowerCase() === "true") parsedValue = true;
        else if (rawValue.toLowerCase() === "false") parsedValue = false;
        else if (!isNaN(Number(rawValue))) parsedValue = Number(rawValue);
        else if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
          try {
            parsedValue = JSON.parse(rawValue);
          } catch {
            // Fallback comma split
            parsedValue = rawValue.slice(1, -1).split(",").map((s) => parseFloat(s.trim()));
          }
        }

        // Execute property mutation in live state
        onUpdateActorProperty(targetActor.id, matchedComponent.id, propIdentifier, parsedValue);

        const elapsed = (performance.now() - startTime).toFixed(2);
        const offsetInfo = matchedPropMeta ? ` [Offset: 0x${matchedPropMeta.offset.toString(16).padStart(4, "0")}, Size: ${matchedPropMeta.size}B, Type: ${matchedPropMeta.type}]` : "";

        addLog(
          "reflection",
          `[Reflection Engine] Mutated '${targetActor.name}.${matchedComponent.type}::${propIdentifier}'${offsetInfo}`,
          [
            `Previous Value: ${JSON.stringify(oldVal)}`,
            `New Value:      ${JSON.stringify(parsedValue)}`,
            `Actor Sync:     Applied immediately to 3D Viewport & Jolt / Vulkan RHI pipeline`,
          ],
          parseFloat(elapsed)
        );
        break;
      }

      case "load_scene":
      case "open_scene": {
        if (args.length === 0) {
          addLog("info", "Available scene presets to load:", [
            "  load_scene SciFiHangar       - Mech assembly hangar with directional & cyber neon lighting",
            "  load_scene PhysicsLab        - Jolt physics testbed with stacking boxes and bouncing spheres",
            "  load_scene CyberCity         - Cyberpunk wet street with cyan/magenta neon lights & drone",
            "  load_scene VulkanPBRShowcase - Calibration stage with Gold, Chrome, & Ceramic PBR spheres",
            "  load_scene EmptyScene        - Blank canvas with default grid and sunlight",
          ]);
          return;
        }

        const requestedScene = args[0];
        const matchedKey = Object.keys(ENGINE_SCENE_PRESETS).find(
          (k) => k.toLowerCase() === requestedScene.toLowerCase()
        );

        if (matchedKey) {
          onLoadScene(matchedKey);
          const scene = ENGINE_SCENE_PRESETS[matchedKey];
          const elapsed = (performance.now() - startTime).toFixed(2);
          addLog(
            "success",
            `[Scene Loader] Successfully loaded scene '${matchedKey}' (${scene.actors.length} actors initialized)`,
            [
              `Description: ${scene.description}`,
              `Render Graph: Recompiled Vulkan 1.3 frame passes`,
              `Physics: Rebuilt Jolt Broadphase Bounding Volume Hierarchy (BVH)`,
            ],
            parseFloat(elapsed)
          );
        } else {
          addLog("error", `Scene preset '${requestedScene}' not found. Available scenes: ${Object.keys(ENGINE_SCENE_PRESETS).join(", ")}`);
        }
        break;
      }

      case "spawn_actor":
      case "spawn": {
        const actorName = args[0] || `Spawned_Entity_${Date.now().toString().slice(-4)}`;
        const meshType = args[1] || "SM_Industrial_Crate";
        onSpawnActor(actorName, meshType);
        const elapsed = (performance.now() - startTime).toFixed(2);
        addLog(
          "success",
          `[Scene Subsystem] Spawned new Actor '${actorName}' with Mesh '${meshType}' at world origin [0, 2, 0].`,
          undefined,
          parseFloat(elapsed)
        );
        break;
      }

      case "destroy_actor":
      case "destroy":
      case "kill": {
        if (args.length === 0) {
          addLog("error", "Syntax: destroy_actor <name_or_id>");
          return;
        }
        const target = actors.find(
          (a) => a.name.toLowerCase() === args[0].toLowerCase() || a.id.toLowerCase() === args[0].toLowerCase()
        );
        if (target) {
          onDestroyActor(target.id);
          addLog("warning", `[Scene Subsystem] Destroyed Actor '${target.name}' (ID: ${target.id}).`);
        } else {
          addLog("error", `Actor '${args[0]}' not found.`);
        }
        break;
      }

      case "teleport":
      case "tp": {
        if (args.length < 4) {
          addLog("error", "Syntax: teleport <object_name> <x> <y> <z>");
          return;
        }
        const target = actors.find(
          (a) => a.name.toLowerCase() === args[0].toLowerCase() || a.id.toLowerCase() === args[0].toLowerCase()
        );
        if (target) {
          const x = parseFloat(args[1]);
          const y = parseFloat(args[2]);
          const z = parseFloat(args[3]);
          if (isNaN(x) || isNaN(y) || isNaN(z)) {
            addLog("error", "Coordinates X, Y, Z must be valid floating point numbers.");
            return;
          }
          onTeleportActor(target.id, [x, y, z]);
          addLog("success", `[Transform] Teleported '${target.name}' to [${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}].`);
        } else {
          addLog("error", `Actor '${args[0]}' not found.`);
        }
        break;
      }

      case "dump_reflection":
      case "reflect": {
        const className = args[0];
        if (!className) {
          addLog("info", "Registered reflected classes:", Object.keys(REFLECTED_CLASSES).map((k) => `• ${k} (Size: ${REFLECTED_CLASSES[k].size} bytes)`));
          return;
        }
        const matched = Object.keys(REFLECTED_CLASSES).find((k) => k.toLowerCase() === className.toLowerCase());
        if (matched) {
          const meta = REFLECTED_CLASSES[matched];
          const lines = meta.properties.map(
            (p) =>
              `  +0x${p.offset.toString(16).padStart(4, "0")} | ${p.name.padEnd(26)} | Type: ${p.type.padEnd(12)} | Size: ${p.size}B | Cat: ${p.category}`
          );
          addLog("info", `[Reflection Struct Layout] Class '${meta.className}' (Total Size: ${meta.size} bytes):`, lines);
        } else {
          addLog("error", `Class '${className}' is not registered in Reflection Registry. Available: ${Object.keys(REFLECTED_CLASSES).join(", ")}`);
        }
        break;
      }

      case "stat": {
        const sub = (args[0] || "fps").toLowerCase();
        if (sub === "fps") {
          addLog("info", "[Telemetry: Frame Time & Framerate]", [
            "  Framerate:          60.0 FPS (VSync Locked)",
            "  Frame Delta:        16.66 ms",
            "  CPU Main Thread:    3.24 ms",
            "  Render Graph GPU:   4.85 ms",
            "  Jolt Physics Step:  1.12 ms",
          ]);
        } else if (sub === "memory" || sub === "vma") {
          addLog("info", "[Telemetry: VMA Vulkan Memory Allocator]", [
            "  VMA Heap Total:     128.00 MB",
            "  VMA Heap Used:      42.35 MB (33.1%)",
            "  Allocations Count:  248 active handles",
            "  Device Local VRAM:  38.10 MB",
            "  Host Visible RAM:   4.25 MB",
          ]);
        } else if (sub === "jolt" || sub === "physics") {
          addLog("info", "[Telemetry: Jolt Physics Engine]", [
            "  Active Rigid Bodies:  8 (3 Dynamic, 5 Static)",
            "  Active Contacts:      4 manifold pairs",
            "  Collision Layers:     MOVING, NON_MOVING, SENSOR",
            "  Gravity Vector:       [0.0, -9.81, 0.0] m/s²",
            "  Sub-steps Per Frame:  2 (60 Hz tick rate)",
          ]);
        } else if (sub === "rendergraph" || sub === "rg") {
          addLog("info", "[Telemetry: Vulkan Render Graph]", [
            "  Passes Compiled:      6 active passes (DepthPrepass, ShadowMap, GBuffer, LightingPBR, PostProcess, ImGuiDocking)",
            "  Aliased Textures:     3 pooled render targets",
            "  Pipeline Barriers:    7 vkCmdPipelineBarrier2 transitions with zero redundant bubbles",
          ]);
        } else {
          addLog("warning", `Unknown stat category '${sub}'. Options: fps, memory, jolt, rendergraph`);
        }
        break;
      }

      case "toggle_gizmo":
      case "gizmo": {
        const mode = (args[0] || "translate").toLowerCase();
        if (mode === "translate" || mode === "rotate" || mode === "scale") {
          onSetGizmoMode(mode);
          addLog("success", `[Viewport] Switched active ImGuizmo mode to '${mode.toUpperCase()}'.`);
        } else {
          addLog("error", "Valid gizmo modes: translate, rotate, scale");
        }
        break;
      }

      case "r.wireframe": {
        const flag = args[0] === "1" || args[0] === "true";
        addLog("info", `[Vulkan Pipeline] Wireframe polygon rasterization mode set to: ${flag ? "ENABLED" : "DISABLED"}`);
        break;
      }

      case "r.shadows": {
        const flag = args[0] === "1" || args[0] === "true";
        addLog("info", `[Render Graph] Directional Shadow Mapping pass set to: ${flag ? "ENABLED" : "DISABLED"}`);
        break;
      }

      case "echo": {
        addLog("info", args.join(" "));
        break;
      }

      default: {
        addLog(
          "error",
          `Unknown command '${primaryCmd}'. Type 'help' to view the list of recognized console commands.`,
          [`Suggestion: Did you mean 'list_objects', 'set_variable', or 'load_scene'?`]
        );
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(inputVal);
      setInputVal("");
      setShowAutoComplete(false);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const match = COMMAND_SUGGESTIONS.find((c) =>
        c.cmd.toLowerCase().startsWith(inputVal.toLowerCase())
      );
      if (match) {
        const commandName = match.cmd.split(" ")[0];
        setInputVal(commandName + " ");
      }
    } else if (e.key === "Escape") {
      setInputVal("");
      setShowAutoComplete(false);
    }
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}${l.details ? "\n" + l.details.join("\n") : ""}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered logs
  const filteredLogs = logs.filter((log) => {
    if (filterType === "all") return true;
    return log.type === filterType;
  });

  return (
    <div id="vanguard-console-system" className="h-full flex flex-col bg-[#0b0e14] text-xs font-mono text-slate-300 border-t border-slate-800">
      {/* 1. Console Header Toolbar */}
      <div className="h-8 bg-[#121622] border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-sky-400">
            <TerminalIcon className="w-3.5 h-3.5" />
            <span className="tracking-wide">VANGUARD CONSOLE CLI</span>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-1 ml-2">
            {(["all", "command", "info", "success", "reflection", "error"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f === "reflection" ? "info" : f)}
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition ${
                  (filterType === f || (f === "reflection" && filterType === "info"))
                    ? "bg-slate-700 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyLogs}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition flex items-center gap-1 text-[10px]"
            title="Copy Logs to Clipboard"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            onClick={() => setLogs([])}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition flex items-center gap-1 text-[10px]"
            title="Clear Console Output"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Command Preset Chips */}
      <div className="bg-[#0f131d] px-3 py-1.5 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px] shrink-0">
        <span className="text-slate-500 text-[10px] uppercase font-bold shrink-0 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          Quick Exec:
        </span>
        <button
          onClick={() => executeCommand("list_objects")}
          className="px-2 py-0.5 bg-slate-800/90 hover:bg-sky-900/60 hover:text-sky-300 rounded border border-slate-700/60 text-slate-300 whitespace-nowrap transition"
        >
          list_objects
        </button>
        <button
          onClick={() => executeCommand("set_variable HeroVanguardMech.m_MaxWalkSpeed 35.0")}
          className="px-2 py-0.5 bg-slate-800/90 hover:bg-violet-900/60 hover:text-violet-300 rounded border border-slate-700/60 text-slate-300 whitespace-nowrap transition"
        >
          set_variable Mech.Speed 35
        </button>
        <button
          onClick={() => executeCommand("set_variable Physics_Crate_Heavy.m_MassKg 250.0")}
          className="px-2 py-0.5 bg-slate-800/90 hover:bg-amber-900/60 hover:text-amber-300 rounded border border-slate-700/60 text-slate-300 whitespace-nowrap transition"
        >
          set_variable Crate.Mass 250
        </button>
        <button
          onClick={() => executeCommand("load_scene PhysicsLab")}
          className="px-2 py-0.5 bg-slate-800/90 hover:bg-emerald-900/60 hover:text-emerald-300 rounded border border-slate-700/60 text-slate-300 whitespace-nowrap transition"
        >
          load_scene PhysicsLab
        </button>
        <button
          onClick={() => executeCommand("load_scene CyberCity")}
          className="px-2 py-0.5 bg-slate-800/90 hover:bg-fuchsia-900/60 hover:text-fuchsia-300 rounded border border-slate-700/60 text-slate-300 whitespace-nowrap transition"
        >
          load_scene CyberCity
        </button>
        <button
          onClick={() => executeCommand("dump_reflection CharacterMovementComponent")}
          className="px-2 py-0.5 bg-slate-800/90 hover:bg-cyan-900/60 hover:text-cyan-300 rounded border border-slate-700/60 text-slate-300 whitespace-nowrap transition"
        >
          dump_reflection Movement
        </button>
        <button
          onClick={() => executeCommand("stat fps")}
          className="px-2 py-0.5 bg-slate-800/90 hover:bg-slate-700 rounded border border-slate-700/60 text-slate-300 whitespace-nowrap transition"
        >
          stat fps
        </button>
      </div>

      {/* 3. Log Output Stream */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[11px] leading-relaxed select-text"
      >
        {filteredLogs.map((log) => {
          let badgeColor = "bg-slate-800 text-slate-400 border-slate-700";
          let textColor = "text-slate-300";

          if (log.type === "command") {
            badgeColor = "bg-sky-950 text-sky-400 border-sky-800";
            textColor = "text-sky-300 font-semibold";
          } else if (log.type === "success") {
            badgeColor = "bg-emerald-950 text-emerald-400 border-emerald-800";
            textColor = "text-emerald-300";
          } else if (log.type === "reflection") {
            badgeColor = "bg-violet-950 text-violet-400 border-violet-800";
            textColor = "text-violet-300";
          } else if (log.type === "warning") {
            badgeColor = "bg-amber-950 text-amber-400 border-amber-800";
            textColor = "text-amber-300";
          } else if (log.type === "error") {
            badgeColor = "bg-rose-950 text-rose-400 border-rose-800";
            textColor = "text-rose-300";
          }

          return (
            <div key={log.id} className="flex items-start gap-2.5 hover:bg-slate-900/40 p-1 rounded transition">
              <span className="text-slate-600 text-[10px] shrink-0 select-none pt-0.5">{log.timestamp}</span>
              <span className={`text-[9px] uppercase px-1 py-0.2 rounded border font-semibold shrink-0 select-none ${badgeColor}`}>
                {log.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`${textColor} whitespace-pre-wrap break-words`}>{log.message}</p>
                {log.details && log.details.length > 0 && (
                  <div className="mt-1 pl-3 border-l-2 border-slate-700/60 space-y-0.5 text-slate-400 text-[10.5px]">
                    {log.details.map((d, idx) => (
                      <div key={idx} className="whitespace-pre-wrap font-mono">{d}</div>
                    ))}
                  </div>
                )}
              </div>
              {log.executionTimeMs !== undefined && (
                <span className="text-[10px] text-slate-500 shrink-0 select-none">
                  {log.executionTimeMs}ms
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Command Input Form Bar */}
      <div className="p-2 bg-[#121622] border-t border-slate-800 relative flex items-center gap-2">
        <span className="text-sky-400 font-bold pl-1 select-none flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5" />
          <span>vanguard&gt;</span>
        </span>

        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setShowAutoComplete(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type command ('list_objects', 'set_variable <Obj>.<Prop> <Val>', 'load_scene <Name>', 'help')..."
            className="w-full bg-[#0b0e14] text-slate-100 text-xs px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-sky-500 font-mono"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Auto-Complete Popup Suggestions */}
          {showAutoComplete && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#151a26] border border-slate-700 rounded-md shadow-2xl overflow-hidden z-30 max-h-48 overflow-y-auto">
              <div className="p-1 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-800 flex justify-between">
                <span>Tab / Click to auto-complete</span>
                <span>ESC to dismiss</span>
              </div>
              {COMMAND_SUGGESTIONS.filter((c) =>
                c.cmd.toLowerCase().includes(inputVal.toLowerCase())
              ).slice(0, 6).map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const baseCmd = s.cmd.split(" ")[0];
                    setInputVal(baseCmd + " ");
                    setShowAutoComplete(false);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-sky-900/40 hover:text-sky-300 border-b border-slate-800/40 flex items-center justify-between text-xs transition font-mono"
                >
                  <span className="text-sky-400 font-bold">{s.cmd}</span>
                  <span className="text-slate-500 text-[10px] truncate max-w-xs">{s.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            executeCommand(inputVal);
            setInputVal("");
            setShowAutoComplete(false);
          }}
          className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Exec</span>
        </button>
      </div>
    </div>
  );
};
