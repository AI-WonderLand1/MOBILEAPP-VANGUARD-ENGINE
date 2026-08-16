#pragma once
#include <glm/glm.hpp>
#include <Jolt/Jolt.h>
#include <Jolt/Physics/PhysicsSystem.h>
#include <Jolt/Core/JobSystemThreadPool.h>
#include <Jolt/Physics/Body/BodyInterface.h>
#include <memory>

namespace Vanguard {

namespace CollisionLayers {
    static constexpr JPH::ObjectLayer NON_MOVING = 0;
    static constexpr JPH::ObjectLayer MOVING     = 1;
    static constexpr JPH::ObjectLayer DEBRIS     = 2;
    static constexpr JPH::ObjectLayer SENSOR     = 3;
    static constexpr JPH::ObjectLayer NUM_LAYERS = 4;
}

namespace BroadPhaseLayers {
    static constexpr JPH::BroadPhaseLayer NON_MOVING(0);
    static constexpr JPH::BroadPhaseLayer MOVING(1);
    static constexpr JPH::BroadPhaseLayer DEBRIS(2);
    static constexpr JPH::BroadPhaseLayer SENSOR(3);
    static constexpr uint32_t NUM_LAYERS = 4;
}

class PhysicsSystem {
public:
    PhysicsSystem();
    ~PhysicsSystem();

    void Initialize();
    void Shutdown();

    // Fixed timestep substep update
    void Update(float deltaTime);

    // Body Lifecycle Helpers
    JPH::BodyID CreateBoxBody(const glm::vec3& position, const glm::vec3& halfExtent, JPH::EMotionType motionType, JPH::ObjectLayer layer);
    JPH::BodyID CreateSphereBody(const glm::vec3& position, float radius, JPH::EMotionType motionType, JPH::ObjectLayer layer);
    void DestroyBody(JPH::BodyID bodyID);

    // Forces and Impulses
    void AddImpulse(JPH::BodyID bodyID, const glm::vec3& impulse);
    glm::vec3 GetBodyPosition(JPH::BodyID bodyID) const;
    glm::vec4 GetBodyRotationQuat(JPH::BodyID bodyID) const;

    [[nodiscard]] JPH::BodyInterface& GetBodyInterface() noexcept { return m_PhysicsSystem->GetBodyInterface(); }

private:
    std::unique_ptr<JPH::PhysicsSystem> m_PhysicsSystem;
    std::unique_ptr<JPH::JobSystemThreadPool> m_JobSystem;
    std::unique_ptr<JPH::TempAllocatorImpl> m_TempAllocator;

    // Layer Interface Bindings
    std::unique_ptr<JPH::BroadPhaseLayerInterface> m_BroadPhaseLayerInterface;
    std::unique_ptr<JPH::ObjectVsBroadPhaseLayerFilter> m_ObjectVsBroadPhaseFilter;
    std::unique_ptr<JPH::ObjectLayerPairFilter> m_ObjectVsObjectFilter;

    static constexpr uint32_t c_MaxBodies = 65536;
    static constexpr uint32_t c_NumBodyMutexes = 0; // Default
    static constexpr uint32_t c_MaxBodyPairs = 65536;
    static constexpr uint32_t c_MaxContactConstraints = 16384;
};

} // namespace Vanguard