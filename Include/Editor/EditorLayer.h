#pragma once
#include <memory>
#include <glm/glm.hpp>
#include <vulkan/vulkan.h>
#include <imgui.h>
#include "Scene/Actor.h"

namespace Vanguard::Editor {

class EditorLayer {
public:
    EditorLayer();
    ~EditorLayer();

    void Initialize(VkRenderPass imGuiRenderPass, uint32_t imageCount);
    void Shutdown();

    void BeginFrame();
    void RenderUI();
    void EndFrame(VkCommandBuffer cmdBuffer);

    void SetSelectedActor(Actor* actor) { m_SelectedActor = actor; }
    [[nodiscard]] Actor* GetSelectedActor() const noexcept { return m_SelectedActor; }

private:
    void SetupDockspace();
    void RenderViewportPanel();
    void RenderSceneOutliner();
    void RenderPropertyInspector();
    void RenderRenderGraphPanel();
    void RenderTracyProfilerOverlay();

    Actor* m_SelectedActor = nullptr;
    VkDescriptorSet m_ViewportTextureDescriptor = VK_NULL_HANDLE;
    glm::vec2 m_ViewportSize{1280.0f, 720.0f};
    bool m_bViewportFocused = false;
    bool m_bViewportHovered = false;

    int m_CurrentGizmoOperation = 7; // ImGuizmo::TRANSLATE
};

} // namespace Vanguard::Editor