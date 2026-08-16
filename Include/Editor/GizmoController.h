#pragma once
#include <vector>
#include <glm/glm.hpp>
#include "Scene/Actor.h"

namespace Vanguard::Editor {

// ==========================================
// ImGuizmo Viewport Gizmo Controller
// ==========================================
// Wraps the ImGuizmo manipulation, grid, and cube rendering APIs for the 3D
// viewport. The editor binds the active camera view/projection matrices and
// routes actor transforms back into the SceneGraph.
enum class GizmoOperation : int {
    Translate = 0,
    Rotate,
    Scale,
};

enum class GizmoMode : int {
    World = 0,
    Local,
};

class GizmoController {
public:
    GizmoController();
    ~GizmoController() = default;

    void SetOperation(GizmoOperation operation) noexcept;
    void SetMode(GizmoMode mode) noexcept;
    void SetViewportRect(float width, float height);
    void SetViewProjection(const glm::mat4& view, const glm::mat4& projection);

    [[nodiscard]] GizmoOperation GetOperation() const noexcept { return m_Operation; }
    [[nodiscard]] GizmoMode GetMode() const noexcept { return m_Mode; }

    // Manipulates the actor transform; returns true when it changed.
    bool Manipulate(Actor& target, bool bSnap = false, const glm::vec3& snapValues = glm::vec3(0.0f));

    // World-space reference grid and selected-actor wireframe cubes.
    void DrawGrid(const glm::mat4& view, const glm::mat4& projection, float gridSize = 100.0f) const;
    void DrawCubes(const glm::mat4& view, const glm::mat4& projection,
                   const std::vector<glm::mat4>& transforms) const;

private:
    GizmoOperation m_Operation;
    GizmoMode m_Mode;

    float m_ViewportWidth = 0.0f;
    float m_ViewportHeight = 0.0f;
    glm::mat4 m_View{1.0f};
    glm::mat4 m_Projection{1.0f};
};

} // namespace Vanguard::Editor