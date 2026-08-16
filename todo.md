# Vanguard Engine — Review & Task Tracking

## Status Legend
- [ ] = pending, [x] = done, [~] = in progress

## A. C++ Engine — Missing Headers (8)
- [ ] `Include/Reflection/TypeTraits.h` — `ResolveTypeKind<T>()` template specializations (needed by `Macros.h`)
- [ ] `Include/Reflection/ReflectionRegistry.h` — registry singleton (needed by `Macros.h` + `PropertyInspector.cpp`)
- [ ] `Include/Scene/Actor.h` — Actor class (needed by `EditorLayer.h`)
- [ ] `Include/Scene/Components/StaticMeshComponent.h` — reflected component (needed by `StaticMeshComponent.cpp`)
- [ ] `Include/RenderGraph/RenderGraphHandle.h` — RGTextureHandle (needed by `RenderGraph.h`)
- [ ] `Include/RenderGraph/BarrierCompiler.h` — barrier compiler API (needed by `BarrierCompiler.cpp`)
- [ ] `Include/Editor/PropertyInspector.h` — inspector API (needed by `PropertyInspector.cpp`)
- [ ] `Include/Asset/MeshBaker.h` — mesh baker API (needed by `MeshBaker.cpp`)

## B. C++ Engine — Missing Sources (12)
- [ ] `Source/Core/Engine.cpp` — Engine::Initialize/Run/Shutdown/Tick/RenderFrame
- [ ] `Source/Reflection/ReflectionRegistry.cpp`
- [ ] `Source/Scene/Actor.cpp`
- [ ] `Source/Scene/SceneGraph.cpp`
- [ ] `Source/Physics/PhysicsSystem.cpp` (also add missing `<Jolt/Core/TempAllocator.h>` include)
- [ ] `Source/RHI/VulkanContext.cpp`
- [ ] `Source/RenderGraph/RenderGraph.cpp`
- [ ] `Source/Asset/AssetRegistry.cpp`
- [ ] `Source/Editor/Main.cpp`
- [ ] `Source/Editor/EditorLayer.cpp` — ImGui::DockBuilder Unreal-style layout per AGENTS.md
- [ ] `Source/Editor/GizmoController.cpp`
- [ ] `Source/Editor/NodeEditorGraph.cpp`

## C. C++ Engine — Structural Fixes
- [ ] Wire `StaticMeshComponent.cpp`, `FilamentViewport.cpp`, `FilamentSceneSetup.cpp` into CMake targets
- [ ] Add Google Filament dependency to CMakeLists.txt (or document as editor-only)
- [ ] Provide `STANDARD_PBR_PACKAGE` binary (compiled `standard_pbr.mat`) or guard its usage
- [ ] Add `ReflectionRegistry.h` include to `Macros.h`
- [ ] RenderGraph: define `RenderGraphBuilder`/`RenderGraphContext` (forward-declared types)
- [ ] Replace `JPH::TempAllocatorImpl` include issue in `PhysicsSystem.h`

## D. Web App — Structure & Build
- [ ] Fix 29 `@/components/*` and `@/lib/engine-data/*` imports — move files into `components/` and `lib/engine-data/` (or add path aliases)
- [ ] Create `app/` directory structure (Next.js App Router) — move `page.tsx`, `layout.tsx`, `route.ts`, `globals.css`, `error.tsx`, `not-found.tsx`
- [ ] Install web dependencies (`npm install`; bun.lock exists but bun is not available)
- [ ] Add `GEMINI_API_KEY` runtime config note (`.env.example`)

## E. Toolchain & Dependencies
- [ ] Install C++ toolchain (cmake, g++/clang) via Nix
- [ ] Install engine third-party deps (Vulkan SDK, SDL3, glm, Jolt, imgui, Tracy) via Nix/vcpkg
- [ ] Verify a full `cmake --build` succeeds
- [ ] Verify web app `npm run build` succeeds

## F. Docs & Polish
- [ ] Fill in empty `README.md`
- [ ] Update `codebase-data.ts` if new files are added to the engine codebase
