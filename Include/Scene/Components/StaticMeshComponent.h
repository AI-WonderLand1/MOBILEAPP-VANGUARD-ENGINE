#pragma once
#include <string>
#include <glm/glm.hpp>
#include "Scene/Actor.h"

namespace Vanguard {

// ==========================================
// Static Mesh Renderable Component
// ==========================================
// References a baked .vmesh asset by GUID and drives PBR shading parameters.
// The runtime schema for the editor inspector is declared via the reflection
// macros in Source/Scene/Components/StaticMeshComponent.cpp.
class StaticMeshComponent : public Component {
public:
    StaticMeshComponent();
    ~StaticMeshComponent() override;

    // Asset bindings (GUID strings resolved by the AssetRegistry)
    std::string m_MeshAssetGUID;
    std::string m_MaterialAssetGUID;

    // Lighting
    bool m_bCastShadows = true;

    // PBR Overrides
    float m_RoughnessMultiplier = 1.0f;
    float m_MetallicMultiplier = 1.0f;
    glm::vec4 m_BaseColorTint{1.0f};

    [[nodiscard]] const std::string& GetMeshGUID() const noexcept { return m_MeshAssetGUID; }
    void SetMeshGUID(std::string guid) noexcept { m_MeshAssetGUID = std::move(guid); }
};

} // namespace Vanguard