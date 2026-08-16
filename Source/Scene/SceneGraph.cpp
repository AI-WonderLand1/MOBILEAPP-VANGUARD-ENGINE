#include "Scene/SceneGraph.h"
#include <algorithm>
#include <typeinfo>
#include <tracy/Tracy.hpp>

namespace Vanguard {

SceneGraph::~SceneGraph() {
    ClearWorld();
}

Actor::Ptr SceneGraph::SpawnActor(std::string name) {
    ZoneScopedN("SceneGraph::SpawnActor");

    auto actor = std::make_shared<Actor>(std::move(name));
    m_Actors.push_back(actor);
    return actor;
}

Actor::Ptr SceneGraph::SpawnActor(const std::string& name, const glm::vec3& position) {
    auto actor = SpawnActor(name);
    actor->SetPosition(position);
    return actor;
}

void SceneGraph::DestroyActor(Actor::Ptr actor) {
    if (!actor) return;

    // Detach from parent hierarchy first.
    if (auto parent = actor->GetParent()) {
        parent->RemoveChild(actor);
    }

    RemoveActorReferences(actor);

    // Detach owned children (they remain live top-level actors).
    for (auto& child : actor->GetChildren()) {
        child->m_Parent.reset();
    }
}

void SceneGraph::RemoveActorReferences(Actor::Ptr actor) {
    auto it = std::find(m_Actors.begin(), m_Actors.end(), actor);
    if (it != m_Actors.end()) {
        m_Actors.erase(it);
    }
}

void SceneGraph::ClearWorld() {
    m_Actors.clear();
}

Actor::Ptr SceneGraph::FindActorByName(std::string_view name) const {
    const auto it = std::find_if(m_Actors.begin(), m_Actors.end(),
                                 [&name](const Actor::Ptr& actor) { return actor->GetName() == name; });
    return it != m_Actors.end() ? *it : nullptr;
}

std::vector<Actor::Ptr> SceneGraph::FindActorsByTag(std::string_view tag) const {
    std::vector<Actor::Ptr> matches;
    for (const auto& actor : m_Actors) {
        if (actor->GetTag() == tag) {
            matches.push_back(actor);
        }
    }
    return matches;
}

std::vector<Actor::Ptr> SceneGraph::FindActorsWithComponent(const std::type_info& componentType) const {
    std::vector<Actor::Ptr> matches;
    for (const auto& actor : m_Actors) {
        for (const auto& component : actor->GetComponents()) {
            if (typeid(*component) == componentType) {
                matches.push_back(actor);
                break;
            }
        }
    }
    return matches;
}

void SceneGraph::Tick(float deltaTime) {
    ZoneScopedN("SceneGraph::Tick");
    for (const auto& actor : m_Actors) {
        actor->TickComponents(deltaTime);
    }
}

} // namespace Vanguard