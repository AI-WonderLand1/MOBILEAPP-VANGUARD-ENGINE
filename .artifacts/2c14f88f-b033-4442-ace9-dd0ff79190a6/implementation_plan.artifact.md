# Vanguard Engine Finalization Plan

This plan outlines the implementation of the missing C++ engine subsystems required by the architectural guidelines, specifically the Reflection-driven Console System, Actor reflection, and proper Vulkan/ImGui rendering integration.

## User Review Required

> [!IMPORTANT]
> This plan involves modifying the core `Actor` class to include reflection macros. This will increase the binary size slightly but is required for the property manipulation and console features specified in `AGENTS.md`.

## Proposed Changes

### Reflection & Scene Graph

#### [MODIFY] [Actor.h](file:///home/user/StudioProjects/MOBILEAPP-VANGUARD-ENGINE/Include/Scene/Actor.h)
- Include `Reflection/Macros.h`.
- Add `REFLECT_CLASS(Actor, void)` to the `Actor` class (using `void` as parent since it's the root).

#### [MODIFY] [Actor.cpp](file:///home/user/StudioProjects/MOBILEAPP-VANGUARD-ENGINE/Source/Scene/Actor.cpp)
- Implement `BEGIN_CLASS_REFLECTION(Actor, void)` block.
- Reflect `m_Name`, `m_Tag`, `m_Layer`, `m_Position`, `m_Rotation`, and `m_Scale`.

---

### Editor Console System

#### [NEW] [ConsoleSystem.h](file:///home/user/StudioProjects/MOBILEAPP-VANGUARD-ENGINE/Include/Editor/ConsoleSystem.h)
- Define a `ConsoleCommand` struct.
- Create the `ConsoleSystem` class with a registry for commands.
- Implement tokenized argument parsing logic.

#### [NEW] [ConsoleSystem.cpp](file:///home/user/StudioProjects/MOBILEAPP-VANGUARD-ENGINE/Source/Editor/ConsoleSystem.cpp)
- Implement default commands: `help`, `clear`, `list_objects`, and `set_variable`.
- `set_variable` will use `ReflectionRegistry` to find the actor/property and update values.

---

### Editor UI & RHI Wiring

#### [MODIFY] [EditorLayer.h](file:///home/user/StudioProjects/MOBILEAPP-VANGUARD-ENGINE/Include/Editor/EditorLayer.h)
- Add a unique pointer to `ConsoleSystem`.
- Add `m_PropertyInspector` member variable.

#### [MODIFY] [EditorLayer.cpp](file:///home/user/StudioProjects/MOBILEAPP-VANGUARD-ENGINE/Source/Editor/EditorLayer.cpp)
- Update `Initialize` to set up the `ConsoleSystem`.
- Update `RenderPropertyInspector` to use `m_PropertyInspector.RenderComponent(*m_SelectedActor)` and iterate through all attached components to render their reflected properties.
- Implement `RenderConsolePanel` to display logs and input field.

#### [MODIFY] [Engine.cpp](file:///home/user/StudioProjects/MOBILEAPP-VANGUARD-ENGINE/Source/Core/Engine.cpp)
- Update `RenderFrame` to transition swapchain image to `COLOR_ATTACHMENT_OPTIMAL`.
- Use a `VkRenderPassBeginInfo` with the context's render pass to render the ImGui UI.
- Ensure the image is transitioned back to `PRESENT_SRC_KHR` after UI rendering.

## Verification Plan

### Automated Tests
- Syntax check all modified C++ files using `g++ -fsyntax-only`.

### Manual Verification
- Launch the engine and verify the "Details" panel automatically populates with actor and component properties.
- Open the "Console" tab and execute `list_objects` to see the actor list.
- Execute `set_variable Actor.m_Position 10 0 0` and verify the actor moves in the viewport.
