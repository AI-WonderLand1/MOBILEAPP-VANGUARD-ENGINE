#include "Editor/GizmoController.h"
#include <ImGuizmo.h>
#include <glm/gtc/type_ptr.hpp>
#include <glm/gtc/quaternion.hpp>
#include <tracy/Tracy.hpp>

namespace Vanguard::Editor {

GizmoController::GizmoController()
    : m_Operation(GizmoOperation::Translate),
      m_Mode(GizmoMode::World) {
}

void GizmoController::SetOperation(GizmoOperation operation) noexcept {
    m_Operation = operation;
}

void GizmoController::SetMode(GizmoMode mode) noexcept {
    m_Mode = mode;
}

void GizmoController::SetViewportRect(float width, float height) {
    m_ViewportWidth = width;
    m_ViewportHeight = height;
}

void GizmoController::SetViewProjection(const glm::mat4& view, const glm::mat4& projection) {
    m_View = view;
    m_Projection = projection;
}

bool GizmoController::Manipulate(Actor& target, bool bSnap, const glm::vec3& snapValues) {
    ZoneScopedN("GizmoController::Manipulate");

    if (m_ViewportWidth <= 0.0f || m_ViewportHeight <= 0.0f) {
        return false;
    }

    // Compose the actor's world transform.
    glm::mat4 model = target.GetLocalTransform();

    ImGuizmo::SetOrthographic(false);
    ImGuizmo::SetRect(0.0f, 0.0f, m_ViewportWidth, m_ViewportHeight);
    ImGuizmo::SetGizmoSizeClipSpace(0.12f);

    ImGuizmo::OPERATION op = ImGuizmo::TRANSLATE;
    switch (m_Operation) {
        case GizmoOperation::Rotate:     op = ImGuizmo::ROTATE; break;
        case GizmoOperation::Scale:      op = ImGuizmo::SCALE; break;
        case GizmoOperation::Translate:
        default:                         op = ImGuizmo::TRANSLATE; break;
    }

    ImGuizmo::MODE mode = (m_Mode == GizmoMode::Local) ? ImGuizmo::LOCAL : ImGuizmo::WORLD;

    const float* snapPtr = bSnap ? glm::value_ptr(snapValues) : nullptr;

    // Apply the gizmo; on change, write back translation/rotation/scale.
    const bool bChanged = ImGuizmo::Manipulate(
        glm::value_ptr(m_View),
        glm::value_ptr(m_Projection),
        op,
        mode,
        glm::value_ptr(model),
        nullptr,
        snapPtr
    );

    if (bChanged) {
        glm::vec3 position;
        glm::vec3 eulerDegrees;
        glm::vec3 scale;
        ImGuizmo::DecomposeMatrixToComponents(glm::value_ptr(model),
                                              glm::value_ptr(position),
                                              glm::value_ptr(eulerDegrees),
                                              glm::value_ptr(scale));

        const glm::quat rotation = glm::quat(glm::radians(eulerDegrees));
        target.SetTransform(position, rotation, scale);
    }

    return bChanged;
}

void GizmoController::DrawGrid(const glm::mat4& view, const glm::mat4& projection, float gridSize) const {
    if (m_ViewportWidth <= 0.0f || m_ViewportHeight <= 0.0f) return;

    ImGuizmo::SetOrthographic(false);
    ImGuizmo::SetRect(0.0f, 0.0f, m_ViewportWidth, m_ViewportHeight);
    ImGuizmo::DrawGrid(glm::value_ptr(view), glm::value_ptr(projection), glm::value_ptr(glm::mat4(1.0f)), gridSize);
}

void GizmoController::DrawCubes(const glm::mat4& view, const glm::mat4& projection,
                                const std::vector<glm::mat4>& transforms) const {
    if (transforms.empty()) return;

    ImGuizmo::SetOrthographic(false);
    ImGuizmo::SetRect(0.0f, 0.0f, m_ViewportWidth, m_ViewportHeight);
    ImGuizmo::DrawCubes(glm::value_ptr(view), glm::value_ptr(projection),
                        &transforms.front()[0][0], static_cast<int>(transforms.size()));
}

} // namespace Vanguard::Editor