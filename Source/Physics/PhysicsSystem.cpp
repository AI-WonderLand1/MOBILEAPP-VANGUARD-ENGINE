#include "Physics/PhysicsSystem.h"
#include <Jolt/Core/TempAllocator.h>
#include <Jolt/Physics/Body/BodyCreationSettings.h>
#include <Jolt/Physics/Collision/Shape/BoxShape.h>
#include <Jolt/Physics/Collision/Shape/SphereShape.h>
#include <Jolt/Physics/Collision/ObjectLayerPairFilterMask.h>
#include <Jolt/Physics/PhysicsSettings.h>
#include <tracy/Tracy.hpp>
#include <glm/gtc/quaternion.hpp>
#include <stdexcept>

namespace Vanguard {

// ---------------------------------------------------------------------------
// Layer Filtering Bindings (ObjectLayer <-> BroadPhaseLayer)
// ---------------------------------------------------------------------------

namespace {

class BroadPhaseLayerInterfaceImpl final : public JPH::BroadPhaseLayerInterface {
public:
    explicit BroadPhaseLayerInterfaceImpl() {
        // All object layers map to the same-named broadphase layer.
        for (JPH::ObjectLayer layer = 0; layer < CollisionLayers::NUM_LAYERS; ++layer) {
            m_LayerToBroadPhase[layer] = JPH::BroadPhaseLayer(layer);
        }
    }

    JPH::uint GetNumBroadPhaseLayers() const override { return BroadPhaseLayers::NUM_LAYERS; }

    JPH::BroadPhaseLayer GetBroadPhaseLayer(JPH::ObjectLayer layer) const override {
        JPH_ASSERT(layer < CollisionLayers::NUM_LAYERS);
        return m_LayerToBroadPhase[layer];
    }

private:
    JPH::BroadPhaseLayer m_LayerToBroadPhase[CollisionLayers::NUM_LAYERS]{};
};

class ObjectVsBroadPhaseFilterImpl final : public JPH::ObjectVsBroadPhaseLayerFilter {
public:
    bool ShouldCollide(JPH::ObjectLayer objectLayer, JPH::BroadPhaseLayer broadPhaseLayer) const override {
        // NON_MOVING never collides with itself; everything else collides with all layers.
        if (objectLayer == CollisionLayers::NON_MOVING &&
            broadPhaseLayer == JPH::BroadPhaseLayer(CollisionLayers::NON_MOVING)) {
            return false;
        }
        return true;
    }
};

class ObjectVsObjectFilterImpl final : public JPH::ObjectLayerPairFilter {
public:
    bool ShouldCollide(JPH::ObjectLayer layer1, JPH::ObjectLayer layer2) const override {
        // Sensors never collide with sensors.
        if (layer1 == CollisionLayers::SENSOR && layer2 == CollisionLayers::SENSOR) {
            return false;
        }
        return true;
    }
};

} // namespace

// ---------------------------------------------------------------------------

PhysicsSystem::PhysicsSystem() = default;
PhysicsSystem::~PhysicsSystem() {
    Shutdown();
}

void PhysicsSystem::Initialize() {
    ZoneScopedN("PhysicsSystem::Initialize");

    // Jolt global initialization (registers allocator/temp allocator singletons).
    JPH::RegisterDefaultAllocator();

    // 16MB pre-allocated temp allocator -- zero heap allocations during ticks.
    m_TempAllocator = std::make_unique<JPH::TempAllocatorImpl>(16 * 1024 * 1024);

    // Multi-threaded job system.
    m_JobSystem = std::make_unique<JPH::JobSystemThreadPool>(
        JPH::cMaxPhysicsJobs,
        JPH::cMaxPhysicsBarriers,
        std::max(2u, std::thread::hardware_concurrency() - 1)
    );

    // Layer filter bindings.
    m_BroadPhaseLayerInterface = std::make_unique<BroadPhaseLayerInterfaceImpl>();
    m_ObjectVsBroadPhaseFilter = std::make_unique<ObjectVsBroadPhaseFilterImpl>();
    m_ObjectVsObjectFilter = std::make_unique<ObjectVsObjectFilterImpl>();

    // PhysicsSystem construction + layer filtering assignment.
    m_PhysicsSystem = std::make_unique<JPH::PhysicsSystem>();
    m_PhysicsSystem->Init(
        c_MaxBodies,
        c_NumBodyMutexes,
        c_MaxBodyPairs,
        c_MaxContactConstraints,
        *m_BroadPhaseLayerInterface,
        *m_ObjectVsBroadPhaseFilter,
        *m_ObjectVsObjectFilter
    );

    // Gravity: -9.81 m/s^2.
    m_PhysicsSystem->SetGravity(JPH::Vec3(0.0f, -9.81f, 0.0f));
}

void PhysicsSystem::Shutdown() {
    m_PhysicsSystem.reset();
    m_ObjectVsObjectFilter.reset();
    m_ObjectVsBroadPhaseFilter.reset();
    m_BroadPhaseLayerInterface.reset();
    m_JobSystem.reset();
    m_TempAllocator.reset();
}

void PhysicsSystem::Update(float deltaTime) {
    ZoneScopedN("PhysicsSystem::Update");
    if (!m_PhysicsSystem) return;

    // Two collision steps per fixed tick for stability.
    m_PhysicsSystem->Update(deltaTime, 2, 1, m_TempAllocator.get(), m_JobSystem.get());
}

JPH::BodyID PhysicsSystem::CreateBoxBody(
    const glm::vec3& position,
    const glm::vec3& halfExtent,
    JPH::EMotionType motionType,
    JPH::ObjectLayer layer
) {
    JPH::BodyInterface& bodyInterface = m_PhysicsSystem->GetBodyInterface();
    JPH::BoxShapeSettings shapeSettings(JPH::Vec3(halfExtent.x, halfExtent.y, halfExtent.z));
    shapeSettings.SetEmbedded();

    JPH::ShapeSettings::ShapeResult shapeResult = shapeSettings.Create();
    if (shapeResult.HasError()) {
        return JPH::BodyID();
    }

    JPH::BodyCreationSettings bodySettings(
        shapeResult.Get(),
        JPH::RVec3(position.x, position.y, position.z),
        JPH::Quat::sIdentity(),
        motionType,
        layer
    );

    JPH::BodyID bodyID = bodyInterface.CreateAndAddBody(bodySettings, JPH::EActivation::Activate);
    return bodyID;
}

JPH::BodyID PhysicsSystem::CreateSphereBody(
    const glm::vec3& position,
    float radius,
    JPH::EMotionType motionType,
    JPH::ObjectLayer layer
) {
    JPH::BodyInterface& bodyInterface = m_PhysicsSystem->GetBodyInterface();

    JPH::SphereShapeSettings shapeSettings(radius);
    shapeSettings.SetEmbedded();

    JPH::ShapeSettings::ShapeResult shapeResult = shapeSettings.Create();
    if (shapeResult.HasError()) {
        return JPH::BodyID();
    }

    JPH::BodyCreationSettings bodySettings(
        shapeResult.Get(),
        JPH::RVec3(position.x, position.y, position.z),
        JPH::Quat::sIdentity(),
        motionType,
        layer
    );

    return bodyInterface.CreateAndAddBody(bodySettings, JPH::EActivation::Activate);
}

void PhysicsSystem::DestroyBody(JPH::BodyID bodyID) {
    if (!m_PhysicsSystem) return;
    m_PhysicsSystem->GetBodyInterface().RemoveBody(bodyID);
    m_PhysicsSystem->GetBodyInterface().DestroyBody(bodyID);
}

void PhysicsSystem::AddImpulse(JPH::BodyID bodyID, const glm::vec3& impulse) {
    if (!m_PhysicsSystem) return;
    m_PhysicsSystem->GetBodyInterface().AddImpulse(bodyID, JPH::Vec3(impulse.x, impulse.y, impulse.z));
}

glm::vec3 PhysicsSystem::GetBodyPosition(JPH::BodyID bodyID) const {
    if (!m_PhysicsSystem) return glm::vec3(0.0f);
    const JPH::Vec3 pos = m_PhysicsSystem->GetBodyInterface().GetCenterOfMassPosition(bodyID);
    return glm::vec3(pos.GetX(), pos.GetY(), pos.GetZ());
}

glm::vec4 PhysicsSystem::GetBodyRotationQuat(JPH::BodyID bodyID) const {
    if (!m_PhysicsSystem) return glm::vec4(0.0f, 0.0f, 0.0f, 1.0f);
    const JPH::Quat rot = m_PhysicsSystem->GetBodyInterface().GetRotation(bodyID);
    return glm::vec4(rot.GetX(), rot.GetY(), rot.GetZ(), rot.GetW());
}

} // namespace Vanguard