#include "Scene/Actor.h"
#include <algorithm>
#include <glm/gtc/matrix_transform.hpp>

namespace Vanguard {

Actor::Actor(std::string name)
    : m_Name(std::move(name)) {
}

Actor::~Actor() = default;

void Actor::SetTransform(const glm::vec3& position, const glm::quat& rotation, const glm::vec3& scale) noexcept {
    m_Position = position;
    m_Rotation = rotation;
    m_Scale = scale;
}

glm::mat4 Actor::GetLocalTransform() const noexcept {
    glm::mat4 transform(1.0f);
    transform = glm::translate(transform, m_Position);
    transform *= glm::mat4_cast(m_Rotation);
    transform = glm::scale(transform, m_Scale);
    return transform;
}

void Actor::AttachTo(Actor::Ptr parent) {
    if (!parent) return;

    if (auto currentParent = m_Parent.lock()) {
        currentParent->RemoveChild(shared_from_this());
    }

    m_Parent = parent;
    parent->AddChild(shared_from_this());
}

void Actor::AddChild(Actor::Ptr child) {
    if (!child || child.get() == this) return;

    auto it = std::find_if(m_Children.begin(), m_Children.end(),
                           [&child](const Actor::Ptr& existing) { return existing == child; });
    if (it == m_Children.end()) {
        m_Children.push_back(std::move(child));
    }
}

void Actor::RemoveChild(Actor::Ptr child) {
    auto it = std::find_if(m_Children.begin(), m_Children.end(),
                           [&child](const Actor::Ptr& existing) { return existing == child; });
    if (it != m_Children.end()) {
        (*it)->m_Parent.reset();
        m_Children.erase(it);
    }
}

void Actor::RemoveAllComponents() {
    for (auto& component : m_Components) {
        component->OnDetached(*this);
        component->m_Owner = nullptr;
    }
    m_Components.clear();
}

void Actor::TickComponents(float deltaTime) {
    for (auto& component : m_Components) {
        if (component->IsEnabled()) {
            component->Tick(deltaTime);
        }
    }
}

} // namespace Vanguard