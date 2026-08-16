#include "Editor/FilamentSceneSetup.h"
#include <cmath>
#include <numbers>
#include <tracy/Tracy.hpp>
#include <math/vec3.h>
#include <math/mat4.h>

namespace Vanguard::Editor {

// Embedded pre-compiled standard PBR Filament Material package binary
// Generated via: matc -p all -a opengl -a vulkan standard_pbr.mat
extern const uint8_t STANDARD_PBR_PACKAGE[];
extern const size_t STANDARD_PBR_PACKAGE_SIZE;

struct Vertex {
    filament::math::float3 position;
    filament::math::short4 tangents; // Encoded packed tangent quaternion
    filament::math::float2 uv;
};

FilamentSceneSetup::FilamentSceneSetup(filament::Engine* engine, filament::Scene* scene)
    : m_Engine(engine), m_Scene(scene) {
}

FilamentSceneSetup::~FilamentSceneSetup() {
    Destroy();
}

void FilamentSceneSetup::InitializeDefaultEnvironment() {
    ZoneScopedN("FilamentSceneSetup::InitializeDefaultEnvironment");
    if (!m_Engine || !m_Scene) return;

    // 1. Create Directional Sunlight with 3-Cascade Shadow Map
    CreateSunLight();

    // 2. Configure 3-Band Spherical Harmonics Indirect Lighting
    SetupIndirectLight(30000.0f);

    // 3. Instantiate Ground Receiver Plane
    CreatePbrTestPlane(30.0f);

    // 4. Instantiate Polished Metallic PBR Test Sphere
    CreatePbrTestSphere(glm::vec3(0.0f, 1.2f, 0.0f), 1.0f, {
        glm::vec4(0.95f, 0.95f, 0.98f, 1.0f), // Silver-chrome base
        0.95f, // Metallic
        0.15f, // Roughness
        0.5f   // Reflectance
    });
}

void FilamentSceneSetup::CreateSunLight(const SunLightSettings& settings) {
    ZoneScopedN("FilamentSceneSetup::CreateSunLight");
    m_SunSettings = settings;

    m_SunLightEntity = utils::EntityManager::get().create();

    const filament::math::float3 dir = filament::math::normalize(
        filament::math::float3{settings.direction.x, settings.direction.y, settings.direction.z}
    );

    filament::LightManager::Builder(filament::LightManager::Type::SUN)
        .color({settings.color.r, settings.color.g, settings.color.b})
        .intensity(settings.intensityLux)
        .direction(dir)
        .castShadows(settings.castShadows)
        .sunAngularRadius(0.545f) // Physical solar disc angle in degrees
        .sunHaloSize(10.0f)
        .sunHaloFalloff(80.0f)
        .shadowOptions({
            .mapSize = 2048,
            .shadowCascades = 3,
            .cascadeSplitPositions = {0.1f, 0.35f, 0.8f},
            .constantBias = 0.001f,
            .normalBias = 1.0f
        })
        .build(*m_Engine, m_SunLightEntity);

    m_Scene->addEntity(m_SunLightEntity);
}

void FilamentSceneSetup::SetupIndirectLight(float intensityLux) {
    ZoneScopedN("FilamentSceneSetup::SetupIndirectLight");

    // 3-Band Spherical Harmonics Irradiance Coefficients (Clear Sky Environment)
    static constexpr filament::math::float3 s_Harmonics[9] = {
        { 0.75f, 0.82f, 0.90f }, // L0,0
        { 0.12f, 0.15f, 0.20f }, // L1,-1
        {-0.22f, -0.25f, -0.28f}, // L1,0
        { 0.05f, 0.07f, 0.10f }, // L1,1
        { 0.01f, 0.02f, 0.03f }, // L2,-2
        {-0.05f, -0.06f, -0.08f}, // L2,-1
        { 0.09f, 0.11f, 0.14f }, // L2,0
        { 0.02f, 0.03f, 0.04f }, // L2,1
        {-0.08f, -0.09f, -0.11f}  // L2,2
    };

    m_IndirectLight = filament::IndirectLight::Builder()
        .irradiance(3, s_Harmonics)
        .intensity(intensityLux)
        .build(*m_Engine);

    m_Scene->setIndirectLight(m_IndirectLight);
}

void FilamentSceneSetup::CreatePbrTestPlane(float size) {
    ZoneScopedN("FilamentSceneSetup::CreatePbrTestPlane");
    const float hs = size * 0.5f;

    const Vertex planeVertices[4] = {
        { {-hs, 0.0f, -hs}, {0, 32767, 0, 1}, {0.0f, 0.0f} },
        { { hs, 0.0f, -hs}, {0, 32767, 0, 1}, {10.0f, 0.0f} },
        { { hs, 0.0f,  hs}, {0, 32767, 0, 1}, {10.0f, 10.0f} },
        { {-hs, 0.0f,  hs}, {0, 32767, 0, 1}, {0.0f, 10.0f} },
    };

    const uint16_t planeIndices[6] = { 0, 1, 2, 0, 2, 3 };

    // Interleaved Vertex Buffer
    m_PlaneVB = filament::VertexBuffer::Builder()
        .vertexCount(4)
        .bufferCount(1)
        .attribute(filament::VertexAttribute::POSITION, 0, filament::VertexBuffer::AttributeType::FLOAT3, offsetof(Vertex, position), sizeof(Vertex))
        .attribute(filament::VertexAttribute::TANGENTS, 0, filament::VertexBuffer::AttributeType::SHORT4, offsetof(Vertex, tangents), sizeof(Vertex))
        .attribute(filament::VertexAttribute::UV0, 0, filament::VertexBuffer::AttributeType::FLOAT2, offsetof(Vertex, uv), sizeof(Vertex))
        .normalized(filament::VertexAttribute::TANGENTS)
        .build(*m_Engine);

    m_PlaneVB->setBufferAt(*m_Engine, 0, filament::VertexBuffer::BufferDescriptor(planeVertices, sizeof(planeVertices)));

    // Index Buffer
    m_PlaneIB = filament::IndexBuffer::Builder()
        .indexCount(6)
        .bufferType(filament::IndexBuffer::IndexType::USHORT)
        .build(*m_Engine);

    m_PlaneIB->setBuffer(*m_Engine, filament::IndexBuffer::BufferDescriptor(planeIndices, sizeof(planeIndices)));

    // Compile Standard Material
    if (!m_DefaultMaterial && STANDARD_PBR_PACKAGE_SIZE > 0) {
        m_DefaultMaterial = filament::Material::Builder()
            .package(STANDARD_PBR_PACKAGE, STANDARD_PBR_PACKAGE_SIZE)
            .build(*m_Engine);
    }

    if (m_DefaultMaterial) {
        m_PlaneMaterialInstance = m_DefaultMaterial->createInstance();
        m_PlaneMaterialInstance->setParameter("baseColor", filament::math::float4{0.22f, 0.26f, 0.32f, 1.0f});
        m_PlaneMaterialInstance->setParameter("metallic", 0.05f);
        m_PlaneMaterialInstance->setParameter("roughness", 0.85f);
        m_PlaneMaterialInstance->setParameter("reflectance", 0.3f);
    }

    m_PlaneEntity = utils::EntityManager::get().create();
    filament::RenderableManager::Builder(1)
        .boundingBox({{-hs, -0.05f, -hs}, {hs, 0.05f, hs}})
        .material(0, m_PlaneMaterialInstance)
        .geometry(0, filament::RenderableManager::PrimitiveType::TRIANGLES, m_PlaneVB, m_PlaneIB, 0, 6)
        .receiveShadows(true)
        .castShadows(false)
        .build(*m_Engine, m_PlaneEntity);

    m_Scene->addEntity(m_PlaneEntity);
}

void FilamentSceneSetup::CreatePbrTestSphere(const glm::vec3& position, float radius, const PbrMaterialSettings& matSettings) {
    ZoneScopedN("FilamentSceneSetup::CreatePbrTestSphere");
    m_SphereSettings = matSettings;

    // UV Sphere Tessellation
    constexpr uint32_t stacks = 32;
    constexpr uint32_t slices = 64;
    std::vector<Vertex> vertices;
    std::vector<uint16_t> indices;

    for (uint32_t i = 0; i <= stacks; ++i) {
        const float phi = static_cast<float>(i) * std::numbers::pi_v<float> / static_cast<float>(stacks);
        const float y = radius * std::cos(phi);
        const float rSinPhi = radius * std::sin(phi);

        for (uint32_t j = 0; j <= slices; ++j) {
            const float theta = static_cast<float>(j) * 2.0f * std::numbers::pi_v<float> / static_cast<float>(slices);
            const float x = rSinPhi * std::cos(theta);
            const float z = rSinPhi * std::sin(theta);

            Vertex v;
            v.position = {x, y, z};
            v.uv = {static_cast<float>(j) / slices, static_cast<float>(i) / stacks};
            v.tangents = {0, 32767, 0, 1}; // Packed surface normal
            vertices.push_back(v);
        }
    }

    for (uint32_t i = 0; i < stacks; ++i) {
        for (uint32_t j = 0; j < slices; ++j) {
            const uint16_t first = static_cast<uint16_t>(i * (slices + 1) + j);
            const uint16_t second = static_cast<uint16_t>(first + slices + 1);

            indices.push_back(first);
            indices.push_back(second);
            indices.push_back(first + 1);

            indices.push_back(second);
            indices.push_back(second + 1);
            indices.push_back(first + 1);
        }
    }

    m_SphereVB = filament::VertexBuffer::Builder()
        .vertexCount(static_cast<uint32_t>(vertices.size()))
        .bufferCount(1)
        .attribute(filament::VertexAttribute::POSITION, 0, filament::VertexBuffer::AttributeType::FLOAT3, offsetof(Vertex, position), sizeof(Vertex))
        .attribute(filament::VertexAttribute::TANGENTS, 0, filament::VertexBuffer::AttributeType::SHORT4, offsetof(Vertex, tangents), sizeof(Vertex))
        .attribute(filament::VertexAttribute::UV0, 0, filament::VertexBuffer::AttributeType::FLOAT2, offsetof(Vertex, uv), sizeof(Vertex))
        .normalized(filament::VertexAttribute::TANGENTS)
        .build(*m_Engine);

    m_SphereVB->setBufferAt(*m_Engine, 0, filament::VertexBuffer::BufferDescriptor(vertices.data(), vertices.size() * sizeof(Vertex)));

    m_SphereIB = filament::IndexBuffer::Builder()
        .indexCount(static_cast<uint32_t>(indices.size()))
        .bufferType(filament::IndexBuffer::IndexType::USHORT)
        .build(*m_Engine);

    m_SphereIB->setBuffer(*m_Engine, filament::IndexBuffer::BufferDescriptor(indices.data(), indices.size() * sizeof(uint16_t)));

    if (m_DefaultMaterial) {
        m_SphereMaterialInstance = m_DefaultMaterial->createInstance();
        SetSphereMaterial(matSettings);
    }

    m_SphereEntity = utils::EntityManager::get().create();
    filament::RenderableManager::Builder(1)
        .boundingBox({{-radius, -radius, -radius}, {radius, radius, radius}})
        .material(0, m_SphereMaterialInstance)
        .geometry(0, filament::RenderableManager::PrimitiveType::TRIANGLES, m_SphereVB, m_SphereIB, 0, static_cast<uint32_t>(indices.size()))
        .receiveShadows(true)
        .castShadows(true)
        .build(*m_Engine, m_SphereEntity);

    // Set Translation in TransformManager
    auto& tm = m_Engine->getTransformManager();
    tm.create(m_SphereEntity);
    tm.setTransform(tm.getInstance(m_SphereEntity), filament::math::mat4f::translation({position.x, position.y, position.z}));

    m_Scene->addEntity(m_SphereEntity);
}

void FilamentSceneSetup::SetSphereMaterial(const PbrMaterialSettings& matSettings) {
    m_SphereSettings = matSettings;
    if (!m_SphereMaterialInstance) return;

    m_SphereMaterialInstance->setParameter("baseColor", filament::math::float4{
        matSettings.baseColor.r, matSettings.baseColor.g, matSettings.baseColor.b, matSettings.baseColor.a
    });
    m_SphereMaterialInstance->setParameter("metallic", matSettings.metallic);
    m_SphereMaterialInstance->setParameter("roughness", matSettings.roughness);
    m_SphereMaterialInstance->setParameter("reflectance", matSettings.reflectance);
}

void FilamentSceneSetup::SetSunDirection(const glm::vec3& direction) {
    m_SunSettings.direction = direction;
    auto& lm = m_Engine->getLightManager();
    const auto instance = lm.getInstance(m_SunLightEntity);
    if (instance) {
        lm.setDirection(instance, filament::math::normalize(
            filament::math::float3{direction.x, direction.y, direction.z}
        ));
    }
}

void FilamentSceneSetup::SetSunIntensity(float lux) {
    m_SunSettings.intensityLux = lux;
    auto& lm = m_Engine->getLightManager();
    const auto instance = lm.getInstance(m_SunLightEntity);
    if (instance) {
        lm.setIntensity(instance, lux);
    }
}

void FilamentSceneSetup::Destroy() {
    if (!m_Engine) return;

    if (m_SunLightEntity) {
        m_Scene->remove(m_SunLightEntity);
        m_Engine->getLightManager().destroy(m_SunLightEntity);
        utils::EntityManager::get().destroy(m_SunLightEntity);
    }

    if (m_IndirectLight) {
        m_Scene->setIndirectLight(nullptr);
        m_Engine->destroy(m_IndirectLight);
        m_IndirectLight = nullptr;
    }

    if (m_PlaneEntity) {
        m_Scene->remove(m_PlaneEntity);
        m_Engine->getRenderableManager().destroy(m_PlaneEntity);
        utils::EntityManager::get().destroy(m_PlaneEntity);
    }
    if (m_PlaneVB) { m_Engine->destroy(m_PlaneVB); m_PlaneVB = nullptr; }
    if (m_PlaneIB) { m_Engine->destroy(m_PlaneIB); m_PlaneIB = nullptr; }
    if (m_PlaneMaterialInstance) { m_Engine->destroy(m_PlaneMaterialInstance); m_PlaneMaterialInstance = nullptr; }

    if (m_SphereEntity) {
        m_Scene->remove(m_SphereEntity);
        m_Engine->getRenderableManager().destroy(m_SphereEntity);
        utils::EntityManager::get().destroy(m_SphereEntity);
    }
    if (m_SphereVB) { m_Engine->destroy(m_SphereVB); m_SphereVB = nullptr; }
    if (m_SphereIB) { m_Engine->destroy(m_SphereIB); m_SphereIB = nullptr; }
    if (m_SphereMaterialInstance) { m_Engine->destroy(m_SphereMaterialInstance); m_SphereMaterialInstance = nullptr; }

    if (m_DefaultMaterial) {
        m_Engine->destroy(m_DefaultMaterial);
        m_DefaultMaterial = nullptr;
    }
}

} // namespace Vanguard::Editor