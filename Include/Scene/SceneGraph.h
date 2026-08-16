#pragma once
#include <memory>
#include <string>
#include <string_view>
#include <typeinfo>
#include <vector>
#include "Scene/Actor.h"

namespace Vanguard {

// ==========================================
// Scene Graph (UWorld analogue)
// ==========================================
// Owns every live Actor in the level, maintains the root actor list, and
// drives component ticking each frame. Actors are spawned and destroyed
// through this class so lifecycle stays centralized.
class SceneGraph {
public:
    SceneGraph() = default;
    ~SceneGraph();

    SceneGraph(const SceneGraph&) = delete;
    SceneGraph& operator=(const SceneGraph&) = delete;

    // Spawn a new actor (optionally parented) and add it to the world.
    Actor::Ptr SpawnActor(std::string name = "Actor");
    Actor::Ptr SpawnActor(const std::string& name, const glm::vec3& position);

    // Destroy an actor and detach it from any hierarchy.
    void DestroyActor(Actor::Ptr actor);

    // Remove all actors from the world.
    void ClearWorld();

    // Actor Lookup
    [[nodiscard]] Actor::Ptr FindActorByName(std::string_view name) const;
    [[nodiscard]] std::vector<Actor::Ptr> FindActorsByTag(std::string_view tag) const;
    [[nodiscard]] std::vector<Actor::Ptr> FindActorsWithComponent(const std::type_info& componentType) const;

    // World Simulation
    void Tick(float deltaTime);

    [[nodiscard]] const std::vector<Actor::Ptr>& GetActors() const noexcept { return m_Actors; }
    [[nodiscard]] size_t GetActorCount() const noexcept { return m_Actors.size(); }

private:
    void RemoveActorReferences(Actor::Ptr actor);

    std::vector<Actor::Ptr> m_Actors;
};

} // namespace Vanguard