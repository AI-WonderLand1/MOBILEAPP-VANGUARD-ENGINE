#include "Editor/EditorLayer.h"
#include "Core/Engine.h"
#include "Scene/SceneGraph.h"
#include "Scene/Components/StaticMeshComponent.h"
#include <imgui.h>
#include <glm/gtc/type_ptr.hpp>
#include <typeinfo>
#include <tracy/Tracy.hpp>

// ImGui Docking branch API
#ifndef IMGUI_DEFINE_MATH_OPERATORS
#define IMGUI_DEFINE_MATH_OPERATORS
#endif
#include <imgui_internal.h>

namespace Vanguard::Editor {

EditorLayer::EditorLayer() = default;

EditorLayer::~EditorLayer() {
    Shutdown();
}

void EditorLayer::Initialize(VkRenderPass imGuiRenderPass, uint32_t imageCount) {
    ZoneScopedN("EditorLayer::Initialize");
    (void)imGuiRenderPass;
    (void)imageCount;

    ImGuiStyle& style = ImGui::GetStyle();
    style.WindowRounding = 0.0f;
    style.FrameRounding = 4.0f;
    style.GrabRounding = 4.0f;
    style.ChildRounding = 4.0f;
    style.PopupRounding = 4.0f;
    style.FramePadding = ImVec2(8.0f, 6.0f);
    style.WindowBorderSize = 1.0f;
    style.FrameBorderSize = 0.0f;

    ImVec4* colors = ImGui::GetStyle().Colors;
    colors[ImGuiCol_WindowBg] = ImVec4(0.04f, 0.05f, 0.07f, 1.00f);
    colors[ImGuiCol_ChildBg] = ImVec4(0.04f, 0.05f, 0.07f, 1.00f);
    colors[ImGuiCol_MenuBarBg] = ImVec4(0.09f, 0.10f, 0.13f, 1.00f);
    colors[ImGuiCol_TitleBg] = ImVec4(0.09f, 0.10f, 0.13f, 1.00f);
    colors[ImGuiCol_TitleBgActive] = ImVec4(0.12f, 0.13f, 0.16f, 1.00f);
    colors[ImGuiCol_Border] = ImVec4(0.15f, 0.17f, 0.21f, 1.00f);
    colors[ImGuiCol_FrameBg] = ImVec4(0.09f, 0.10f, 0.13f, 1.00f);
    colors[ImGuiCol_FrameBgHovered] = ImVec4(0.14f, 0.15f, 0.19f, 1.00f);
    colors[ImGuiCol_Button] = ImVec4(0.11f, 0.12f, 0.16f, 1.00f);
    colors[ImGuiCol_ButtonHovered] = ImVec4(0.16f, 0.17f, 0.22f, 1.00f);
    colors[ImGuiCol_ButtonActive] = ImVec4(0.07f, 0.08f, 0.11f, 1.00f);
    colors[ImGuiCol_Header] = ImVec4(0.11f, 0.12f, 0.16f, 1.00f);
    colors[ImGuiCol_HeaderHovered] = ImVec4(0.16f, 0.17f, 0.22f, 1.00f);
    colors[ImGuiCol_HeaderActive] = ImVec4(0.18f, 0.20f, 0.25f, 1.00f);
    colors[ImGuiCol_Tab] = ImVec4(0.09f, 0.10f, 0.13f, 1.00f);
    colors[ImGuiCol_TabHovered] = ImVec4(0.14f, 0.15f, 0.19f, 1.00f);
    colors[ImGuiCol_TabSelected] = ImVec4(0.16f, 0.18f, 0.23f, 1.00f);
    colors[ImGuiCol_TabDimmed] = ImVec4(0.07f, 0.08f, 0.10f, 1.00f);
    colors[ImGuiCol_TabDimmedSelected] = ImVec4(0.11f, 0.12f, 0.15f, 1.00f);
    colors[ImGuiCol_Text] = ImVec4(0.86f, 0.88f, 0.92f, 1.00f);
    colors[ImGuiCol_TextDisabled] = ImVec4(0.42f, 0.45f, 0.50f, 1.00f);
    colors[ImGuiCol_Separator] = ImVec4(0.13f, 0.15f, 0.18f, 1.00f);

    m_Console = std::make_unique<ConsoleSystem>();
}

void EditorLayer::Shutdown() {
    m_SelectedActor = nullptr;
}

void EditorLayer::BeginFrame() {
    // ImGui new frame is driven by the Vulkan backend between frame begin/end.
}

void EditorLayer::RenderUI() {
    ZoneScopedN("EditorLayer::RenderUI");

    // UE5-style full editor dockspace.
    SetupDockspace();

    RenderViewportPanel();
    RenderSceneOutliner();
    RenderPropertyInspector();
    RenderRenderGraphPanel();
    RenderTracyProfilerOverlay();
    RenderConsolePanel();
}

// ---------------------------------------------------------------------------
// Unreal Engine 5-style layout enforced via ImGui::DockBuilder
// ---------------------------------------------------------------------------
void EditorLayer::SetupDockspace() {
    ZoneScopedN("EditorLayer::SetupDockspace");

    ImGuiIO& io = ImGui::GetIO();
    ImGuiID dockspaceID = ImGui::GetID("VanguardEditorDockspace");

    // Rebuild the docking layout only once at startup.
    static bool bDockspaceInitialized = false;
    if (!bDockspaceInitialized) {
        ImGui::DockBuilderRemoveNode(dockspaceID);
        ImGui::DockBuilderAddNode(dockspaceID, ImGuiDockNodeFlags_DockSpace);
        ImGui::DockBuilderSetNodeSize(dockspaceID, io.DisplaySize);

        ImGuiID mainNode = dockspaceID;
        ImGuiID bottomNode;
        ImGuiID topNode;

        // 1. Bottom Dock (25%): Content Browser / Console / Diagnostics.
        ImGui::DockBuilderSplitNode(mainNode, ImGuiDir_Down, 0.25f, &bottomNode, &topNode);

        // 2. Right Sidebar (~28%): Scene Outliner + Details.
        ImGuiID rightNode;
        ImGuiID centerNode;
        ImGui::DockBuilderSplitNode(topNode, ImGuiDir_Right, 0.28f, &rightNode, &centerNode);

        // 3. Scene Outliner (Top 45% of the right sidebar).
        ImGuiID outlinerNode;
        ImGuiID detailsNode;
        ImGui::DockBuilderSplitNode(rightNode, ImGuiDir_Up, 0.45f, &outlinerNode, &detailsNode);

        // 4. Center space = 3D Viewport.
        ImGui::DockBuilderDockWindow("3D Viewport", centerNode);
        ImGui::DockBuilderDockWindow("Scene Outliner", outlinerNode);
        ImGui::DockBuilderDockWindow("Details", detailsNode);

        // Bottom dock tabs (tallest content first).
        ImGui::DockBuilderDockWindow("Content Browser", bottomNode);
        ImGui::DockBuilderDockWindow("Console / Output Log", bottomNode);
        ImGui::DockBuilderDockWindow("Render Graph", bottomNode);
        ImGui::DockBuilderDockWindow("Tracy Profiler", bottomNode);
        ImGui::DockBuilderDockWindow("Jolt Physics", bottomNode);
        ImGui::DockBuilderDockWindow("Memory Layout", bottomNode);

        ImGui::DockBuilderFinish(dockspaceID);
        bDockspaceInitialized = true;
    }

    ImGui::DockSpace(dockspaceID, ImVec2(0.0f, 0.0f), ImGuiDockNodeFlags_None);
}

void EditorLayer::RenderViewportPanel() {
    ImGui::Begin("3D Viewport");

    m_bViewportFocused = ImGui::IsWindowFocused();
    m_bViewportHovered = ImGui::IsWindowHovered();
    const ImVec2 avail = ImGui::GetContentRegionAvail();
    m_ViewportSize = glm::vec2(avail.x, avail.y);

    // Transformed actor translation gizmo (ImGuizmo integration point).
    if (m_SelectedActor && m_bViewportHovered) {
        ImGui::Text("Gizmo: %s", m_SelectedActor->GetName().c_str());
    }

    ImGui::End();
}

void EditorLayer::RenderSceneOutliner() {
    ImGui::Begin("Scene Outliner");

    SceneGraph& world = Engine::Get().GetSceneGraph();

    // Top toolbar: actor search / filter bar.
    ImGui::TextDisabled("World Actors (%zu)", world.GetActorCount());
    ImGui::Separator();

    if (ImGui::BeginListBox("##ActorList", ImVec2(-1.0f, -1.0f))) {
        for (const auto& actor : world.GetActors()) {
            const bool bIsSelected = (m_SelectedActor == actor.get());
            std::string label = actor->GetName() + "##" + std::to_string(reinterpret_cast<uintptr_t>(actor.get()));

            if (ImGui::Selectable(label.c_str(), bIsSelected)) {
                m_SelectedActor = actor.get();
            }

            // Drag & drop an actor onto another to reparent (UE style).
            if (ImGui::BeginDragDropSource()) {
                ImGui::SetDragDropPayload("ACTOR_PTR", &actor, sizeof(Actor::Ptr));
                ImGui::Text("%s", actor->GetName().c_str());
                ImGui::EndDragDropSource();
            }
            if (ImGui::BeginDragDropTarget()) {
                if (const ImGuiPayload* payload = ImGui::AcceptDragDropPayload("ACTOR_PTR")) {
                    if (Actor::Ptr* dragged = static_cast<Actor::Ptr*>(payload->Data)) {
                        (*dragged)->AttachTo(actor);
                    }
                }
                ImGui::EndDragDropTarget();
            }
        }
        ImGui::EndListBox();
    }

    ImGui::End();
}

void EditorLayer::RenderPropertyInspector() {
    ImGui::Begin("Details");

    if (m_SelectedActor == nullptr) {
        ImGui::TextDisabled("No actor selected. Select an actor in the Scene Outliner.");
        ImGui::End();
        return;
    }

    ImGui::Text("Actor: %s", m_SelectedActor->GetName().c_str());
    ImGui::Separator();

    // Reflect Actor properties first
    m_PropertyInspector.RenderComponent(*m_SelectedActor);

    ImGui::Separator();
    ImGui::TextDisabled("Components (%zu)", m_SelectedActor->GetComponents().size());
    for (const auto& component : m_SelectedActor->GetComponents()) {
        // Try to get reflection meta if available (via dynamic cast to a known reflected type or generic check)
        // For now, we know StaticMeshComponent is reflected.
        if (auto* smc = dynamic_cast<StaticMeshComponent*>(component.get())) {
            if (ImGui::CollapsingHeader("Static Mesh Component", ImGuiTreeNodeFlags_DefaultOpen)) {
                m_PropertyInspector.RenderComponent(*smc);
            }
        } else {
            // Fallback for non-reflected or unknown components
            if (ImGui::CollapsingHeader(typeid(*component).name(), ImGuiTreeNodeFlags_DefaultOpen)) {
                ImGui::Indent();
                bool bEnabled = component->IsEnabled();
                if (ImGui::Checkbox("Enabled", &bEnabled)) {
                    component->SetEnabled(bEnabled);
                }
                ImGui::Unindent();
            }
        }
    }

    ImGui::End();
}

void EditorLayer::RenderRenderGraphPanel() {
    ImGui::Begin("Render Graph");
    ImGui::TextDisabled("Stateless Render Graph DAG");
    ImGui::End();
}

void EditorLayer::RenderTracyProfilerOverlay() {
    ImGui::Begin("Tracy Profiler");
    ImGui::TextDisabled("Connect Tracy Server on port 8086");
    ImGui::End();
}

void EditorLayer::RenderConsolePanel() {
    ImGui::Begin("Console / Output Log");

    // Output scrolling region
    const float footerHeightToReserve = ImGui::GetStyle().ItemSpacing.y + ImGui::GetFrameHeightWithSpacing();
    ImGui::BeginChild("ScrollingRegion", ImVec2(0, -footerHeightToReserve), false, ImGuiWindowFlags_HorizontalScrollbar);

    for (const auto& entry : m_Console->GetLogs()) {
        ImVec4 color = ImVec4(1, 1, 1, 1);
        if (entry.LogType == ConsoleLogEntry::Type::Error) color = ImVec4(1, 0.4f, 0.4f, 1);
        else if (entry.LogType == ConsoleLogEntry::Type::Warning) color = ImVec4(1, 0.8f, 0.4f, 1);
        else if (entry.LogType == ConsoleLogEntry::Type::Command) color = ImVec4(0.4f, 1, 0.4f, 1);

        ImGui::TextColored(color, "%s", entry.Message.c_str());
    }

    if (ImGui::GetScrollY() >= ImGui::GetScrollMaxY())
        ImGui::SetScrollHereY(1.0f);

    ImGui::EndChild();
    ImGui::Separator();

    // Command Input
    static char inputBuffer[256] = "";
    bool reclaimFocus = false;
    ImGuiInputTextFlags inputFlags = ImGuiInputTextFlags_EnterReturnsTrue;
    if (ImGui::InputText("Command", inputBuffer, IM_ARRAYSIZE(inputBuffer), inputFlags)) {
        m_Console->Execute(inputBuffer);
        strcpy(inputBuffer, "");
        reclaimFocus = true;
    }

    ImGui::SetItemDefaultFocus();
    if (reclaimFocus) ImGui::SetKeyboardFocusHere(-1);

    ImGui::End();
}

void EditorLayer::EndFrame(VkCommandBuffer cmdBuffer) {
    (void)cmdBuffer;
}

} // namespace Vanguard::Editor