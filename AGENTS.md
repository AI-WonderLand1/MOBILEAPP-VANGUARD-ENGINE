# Vanguard Engine Architectural & Formatting Guidelines

## Persistent Rules & Instructions

### 1. Dear ImGui Editor Layout Blueprint (ImGui::DockBuilder Unreal Engine-Style API)
When laying out the Editor windows, always use the `ImGui::DockBuilder` API to enforce a pure Unreal Engine-style layout:
- **Root DockSpace**: Split the root dockspace ID (`dockspace_id`).
- **Bottom Dock (25%)**: Split `ImGuiDir_Down` with ratio `0.25f` for `Content Browser`, `Console / Output Log`, and Diagnostic panels (`Render Graph`, `Tracy Profiler`, `Jolt Physics`, `Memory Layout`).
- **Right Sidebar**: Split the remaining top space `ImGuiDir_Right` (ratio `0.25f` to `0.30f`) for Editor Inspection:
  - **Scene Outliner (Top 45%)**: Split `ImGuiDir_Up` with ratio `0.45f`.
  - **Details / Property Inspector (Bottom 55%)**: Docked into the lower right node.
- **Center Space**: The remaining center space sits perfectly in the center, dedicated entirely to the `3D Viewport` window.
- **Lock Layout**: Always invoke `ImGui::DockBuilderFinish(dockspace_id)` to finalize and lock the default layout.

### 2. Custom 3D Engine Architecture Standards
- Target: Custom C++20/C++23 Object-Oriented (Actor/Component) Engine (Vanguard Engine) from scratch.
- Windowing & Input: SDL3 / GLFW with high-frequency event polling.
- Math & Physics: GLM for mathematics and Jolt Physics for simulation.
- UI & Tooling: Dear ImGui (Docking branch), ImGuizmo for 3D viewport gizmos, ImGuiNodeEditor for visual graphs.
- Profiling: Tracy Profiler instrumentation hooks (`ZoneScoped`, `FrameMark`, `TracyAlloc`).
- Graphics Backend: Modern Vulkan 1.3 (with VMA - Vulkan Memory Allocator) and DirectX 12 Agility SDK with stateless Render Graph architecture.
- Reflection System: Macro-based reflection registry (`REFLECT_STRUCT`, `REFLECT_PROPERTY`) tracking byte offsets (`offsetof`) for dynamic runtime inspection and console commands.
- Console System: Extensible command registration, tokenized argument parsing, reflection-driven property manipulation (`set_variable <object>.<property> <value>`), scene management (`load_scene <name>`), and scene object enumeration (`list_objects`).

### 3. Explanation Structure Standard
When explaining engine systems or subsystems, break explanations into:
1. Class Declarations / Header Structure
2. Implementation Logic (Source code snippets)
3. How it integrates with the Dear ImGui Editor or the Core Engine Loop
