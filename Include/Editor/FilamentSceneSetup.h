#pragma once

#include <filament/Engine.h>
#include <filament/Scene.h>
#include <filament/LightManager.h>
#include <filament/IndirectLight.h>
#include <filament/Material.h>
#include <filament/MaterialInstance.h>
#include <filament/VertexBuffer.h>
#include <filament/IndexBuffer.h>
#include <filament/RenderableManager.h>
#include <filament/TransformManager.h>
#include <utils/Entity.h>
#include <glm/glm.hpp>
#include <vector>

namespace Vanguard::Editor {

struct PbrMaterialSettings {
    glm::vec4 baseColor{0.95f, 0.95f, 0.98f, 1.0f}; // Default silver-white base
    float metallic = 0.95f;                          // High metalness
    float roughness = 0.15f;                         // Smooth specular reflection
    float reflectance = 0.5f;                        // Dielectric F0 (when non-metallic)
};

struct SunLightSettings {
    glm::vec3 direction{-0.6f, -1.0f, -0.8f};
    glm::vec3 color{1.0f, 0.96f, 0.90f};             // Warm 5500K sunlight
    float intensityLux = 110000.0f;                  // Direct noon sunlight (110k Lux)
    bool castShadows = true;
};

class FilamentSceneSetup {
public:
    explicit FilamentSceneSetup(filament::Engine* engine, filament::Scene* scene);
    ~FilamentSceneSetup();

    // Scene Environment Lifecycle
    void InitializeDefaultEnvironment();
    void CreateSunLight(const SunLightSettings& settings = {});
    void SetupIndirectLight(float intensityLux = 30000.0f);
    void CreatePbrTestPlane(float size = 30.0f);
    void CreatePbrTestSphere(const glm::vec3& position, float radius = 1.0f, const PbrMaterialSettings& matSettings = {});

    // Live ImGui Parameter Mutators
    void SetSunDirection(const glm::vec3& direction);
    void SetSunIntensity(float lux);
    void SetSphereMaterial(const PbrMaterialSettings& matSettings);

    [[nodiscard]] const SunLightSettings& GetSunSettings() const noexcept { return m_SunSettings; }
    [[nodiscard]] const PbrMaterialSettings& GetSphereSettings() const noexcept { return m_SphereSettings; }

    void Destroy();

private:
    filament::Engine* m_Engine = nullptr;
    filament::Scene* m_Scene = nullptr;

    // Directional Sunlight Entity
    utils::Entity m_SunLightEntity;
    SunLightSettings m_SunSettings;

    // Indirect IBL Spherical Harmonics
    filament::IndirectLight* m_IndirectLight = nullptr;

    // Ground Plane
    utils::Entity m_PlaneEntity;
    filament::VertexBuffer* m_PlaneVB = nullptr;
    filament::IndexBuffer* m_PlaneIB = nullptr;
    filament::Material* m_DefaultMaterial = nullptr;
    filament::MaterialInstance* m_PlaneMaterialInstance = nullptr;

    // Metallic Test Sphere
    utils::Entity m_SphereEntity;
    PbrMaterialSettings m_SphereSettings;
    filament::VertexBuffer* m_SphereVB = nullptr;
    filament::IndexBuffer* m_SphereIB = nullptr;
    filament::MaterialInstance* m_SphereMaterialInstance = nullptr;
};

} // namespace Vanguard::Editor