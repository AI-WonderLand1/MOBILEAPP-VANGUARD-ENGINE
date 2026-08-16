#include "Scene/Components/StaticMeshComponent.h"
#include "Reflection/Macros.h"

namespace Vanguard {

BEGIN_CLASS_REFLECTION(StaticMeshComponent, Component)
    REFLECT_PROPERTY(StaticMeshComponent, m_MeshAssetGUID, "Mesh Asset", "Geometry", "GUID of compiled .vmesh")
    REFLECT_PROPERTY(StaticMeshComponent, m_MaterialAssetGUID, "Material", "Shading", "PBR Material GUID")
    REFLECT_PROPERTY(StaticMeshComponent, m_bCastShadows, "Cast Shadows", "Lighting", "Enable shadow caster rendering")
    REFLECT_PROPERTY_RANGE(StaticMeshComponent, m_RoughnessMultiplier, "Roughness Mult", "PBR Overrides", 0.0f, 1.0f, 0.01f)
    REFLECT_PROPERTY_RANGE(StaticMeshComponent, m_MetallicMultiplier, "Metallic Mult", "PBR Overrides", 0.0f, 1.0f, 0.01f)
    REFLECT_PROPERTY(StaticMeshComponent, m_BaseColorTint, "Base Color Tint", "PBR Overrides", "HDR linear tint")
END_CLASS_REFLECTION()

StaticMeshComponent::StaticMeshComponent() = default;
StaticMeshComponent::~StaticMeshComponent() = default;

} // namespace Vanguard