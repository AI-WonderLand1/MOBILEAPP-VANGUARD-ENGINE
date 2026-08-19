# Vanguard Engine — Review & Task Tracking

## Status Legend
- [ ] = pending, [x] = done, [~] = in progress

## A. C++ Engine — Missing Headers (8)
- [x] `Include/Reflection/TypeTraits.h` — `ResolveTypeKind<T>()` template specializations (needed by `Macros.h`)
- [x] `Include/Reflection/ReflectionRegistry.h` — registry singleton (needed by `Macros.h` + `PropertyInspector.cpp`)
- [x] `Include/Scene/Actor.h` — Actor class (needed by `EditorLayer.h`)
- [x] `Include/Scene/Components/StaticMeshComponent.h` — reflected component (needed by `StaticMeshComponent.cpp`)
- [x] `Include/RenderGraph/RenderGraphHandle.h` — RGTextureHandle (needed by `RenderGraph.h`)
- [x] `Include/RenderGraph/BarrierCompiler.h` — barrier compiler API (needed by `BarrierCompiler.cpp`)
- [x] `Include/Editor/PropertyInspector.h` — inspector API (needed by `PropertyInspector.cpp`)
- [x] `Include/Asset/MeshBaker.h` — mesh baker API (needed by `MeshBaker.cpp`)

## B. C++ Engine — Missing Sources (12)
- [x] `Source/Core/Engine.cpp` — Engine::Initialize/Run/Shutdown/Tick/RenderFrame
- [x] `Source/Reflection/ReflectionRegistry.cpp`
- [x] `Source/Scene/Actor.cpp`
- [x] `Source/Scene/SceneGraph.cpp`
- [x] `Source/Physics/PhysicsSystem.cpp` (also add missing `<Jolt/Core/TempAllocator.h>` include)
- [x] `Source/RHI/VulkanContext.cpp`
- [x] `Source/RenderGraph/RenderGraph.cpp`
- [x] `Source/Asset/AssetRegistry.cpp`
- [x] `Source/Editor/Main.cpp`
- [x] `Source/Editor/EditorLayer.cpp` — ImGui::DockBuilder Unreal-style layout per AGENTS.md
- [x] `Source/Editor/GizmoController.cpp`
- [x] `Source/Editor/NodeEditorGraph.cpp`

## C. C++ Engine — Structural Fixes
- [x] Wire `StaticMeshComponent.cpp`, `FilamentViewport.cpp`, `FilamentSceneSetup.cpp` into CMake targets
- [x] Add Google Filament dependency to CMakeLists.txt (editor-only, `find_package(filament QUIET)` gate)
- [x] Provide `STANDARD_PBR_PACKAGE` binary (compiled `standard_pbr.mat`) or guard its usage — empty placeholder + `STANDARD_PBR_PACKAGE_SIZE > 0` guard; real package via `matc -p all -a opengl -a vulkan standard_pbr.mat`
- [x] Add `ReflectionRegistry.h` include to `Macros.h`
- [x] RenderGraph: define `RenderGraphBuilder`/`RenderGraphContext` (forward-declared types)
- [x] Replace `JPH::TempAllocatorImpl` include issue in `PhysicsSystem.h`

## D. Web App — Structure & Build
- [x] Fix 29 `@/components/*` and `@/lib/engine-data/*` imports — moved 14 components → `components/`, 5 data modules → `lib/engine-data/`, helpers → `lib/` (git mv, history preserved)
- [x] Create `app/` directory structure (Next.js App Router) — `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/error.tsx`, `app/not-found.tsx`, `app/api/gemini/route.ts`
- [x] Install web dependencies (`npm install` → `package-lock.json` generated; bun.lock remains for bun users)
- [x] Add `GEMINI_API_KEY` runtime config note (`.env.example`)

## E. Toolchain & Dependencies
- [x] Install C++ toolchain (cmake, g++/clang) via Nix — gcc-14.4.0, glm, vulkan-headers installed via `nix profile`
- [x] Implement Vulkan RHI Backend (`VulkanContext.cpp`, `VulkanSwapchain.cpp`) — no longer stubs
- [x] Wire RenderGraph and Actor Reflection into Engine loop
- [~] Install engine third-party deps (Vulkan SDK, SDL3, glm, Jolt, imgui, Tracy) via Nix/vcpkg
- [ ] Verify a full `cmake --build` succeeds
- [x] Verify web app `npm run build` succeeds — `next build` OK (routes `/`, `/_not-found`, `/api/gemini`); `npm run lint` clean

## F. Docs & Polish
- [x] Fill in empty `README.md` — architecture overview, tech stack, build instructions, status
- [ ] Update `codebase-data.ts` if new files are added to the engine codebase — deferred: sync would need re-dumping all 20 sources into `lib/engine-data/codebase-data.ts`