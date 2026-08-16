# Vanguard Engine

A custom 3D game engine and editor built from scratch in C++20/23, architected to mirror Unreal Engine 5's Actor/Component design (without using any UE code). Ships with a Next.js "Engine Architect Studio" web app for designing subsystems and AI-assisted consultation.

## Architecture

UE5-style object model with a macro-based reflection registry, a stateless Vulkan 1.3 render graph, and a fixed-timestep physics simulation.

- **Actor/Component World** — `Vanguard::Actor` (transform + hierarchy + component list) and `Vanguard::Component` (attach/detach/tick lifecycle), managed by `Vanguard::SceneGraph` (the `UWorld` analogue).
- **Reflection System** — `REFLECT_CLASS`, `REFLECT_PROPERTY`, `REFLECT_PROPERTY_RANGE` macros register runtime class metadata (offsets via `offsetof`, categories, ranges, tooltips) into a global `ReflectionRegistry`, powering the editor's Property Inspector and Console.
- **Stateless Render Graph** — passes declare transient resources in `Setup()`, the graph resolves lifetimes/aliasing in `Compile()`, and `BarrierCompiler` emits `VkImageMemoryBarrier2` transitions at execution time.
- **Physics** — Jolt Physics with a fixed 60 Hz accumulator; collision layers via custom `BroadPhaseLayerInterface` / `ObjectLayerPairFilter`.
- **Editor** — Dear ImGui (docking) with a locked Unreal-style `ImGui::DockBuilder` layout: bottom 25% (Content Browser / Console / Diagnostic panels), right 28% (Scene Outliner 45% / Details 55%), center 3D Viewport. ImGuizmo gizmos, ImGuiNodeEditor visual graphs.
- **Profiling** — Tracy instrumentation (`ZoneScoped`, `FrameMark`) throughout.

## Tech Stack

| Layer      | Technology                                          |
|------------|-----------------------------------------------------|
| Language   | C++20/23                                            |
| Windowing  | SDL3                                                |
| Rendering  | Vulkan 1.3 + VMA                                   |
| Math       | GLM                                                |
| Physics    | Jolt Physics                                       |
| UI         | Dear ImGui (docking), ImGuizmo, ImGuiNodeEditor     |
| 3D Preview | Google Filament (editor-only, optional)            |
| Profiling  | Tracy Profiler                                     |
| Web Studio | Next.js 15 (App Router), React 19, Three.js         |

## Directory Layout

```
Include/            Engine public headers
  Asset/            .vmesh baking + asset registry
  Core/             Engine, Window
  Editor/           EditorLayer, PropertyInspector, GizmoController, Filament viewport
  Physics/          Jolt binding
  Reflection/       TypeTraits, Macros, ReflectionRegistry
  RenderGraph/      RenderGraph, BarrierCompiler, handles
  RHI/              VulkanContext
  Scene/            Actor, SceneGraph, Components
Source/             Engine implementation (one .cpp per header)
components/         Web studio UI panels
lib/engine-data/    Web studio engine schemas/data
app/                Next.js App Router (page, layout, /api/gemini route)
```

## Build

### C++ (engine + editor)

Dependencies (via vcpkg/Conan/system): Vulkan, SDL3, glm, Jolt, imgui, Tracy. Google Filament is optional (`-DVANGUARD_ENABLE_FILAMENT_VIEWPORT=OFF` to disable).

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
./build/VanguardEditor
```

Note: the standard PBR package (`STANDARD_PBR_PACKAGE`) is an empty placeholder until compiled with `matc -p all -a opengl -a vulkan standard_pbr.mat`.

### Web studio

```bash
npm install
cp .env.example .env.local   # set GEMINI_API_KEY for the AI consultant
npm run dev                  # or: npm run build && npm start
```

## Status

- All 20 C++ translation units pass `g++ -fsyntax-only -std=c++23` with 0 errors / 0 warnings (verified against API stubs for SDL3/Jolt/imgui/Tracy/Filament).
- Web app `next build` and `eslint` pass clean.
- A full `cmake --build` still requires the third-party packages (see `todo.md`).

See `todo.md` for the live task tracker.# MOBILEAPP-VANGUARD-ENGINE
