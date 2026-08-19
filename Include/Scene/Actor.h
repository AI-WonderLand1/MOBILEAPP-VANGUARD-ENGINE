#pragma once
#include <memory>
#include <string>
#include <type_traits>
#include <vector>
#include <glm/glm.hpp>
#include <glm/gtc/quaternion.hpp>
#include "Reflection/Macros.h"

namespace Vanguard {

class Actor;
class SceneGraph;

class Component {
public:
    virtual ~Component() = default;

    virtual void OnAttached(Actor& owner) {}
    virtual void OnDetached(Actor& owner) {}
    virtual void Tick(float deltaTime) {}

    [[nodiscard]] Actor* GetOwner() const noexcept { return m_Owner; }
    [[nodiscard]] bool IsEnabled() const noexcept { return m_bEnabled; }
    void SetEnabled(bool bEnabled) noexcept { m_bEnabled = bEnabled; }

    friend class Actor;

protected:
    Actor* m_Owner = nullptr;
    bool m_bEnabled = true;
};

class Actor : public std::enable_shared_from_this<Actor> {
    REFLECT_CLASS(Actor, void)
public:
    using Ptr = std::shared_ptr<Actor>;

    explicit Actor(std::string name = "Actor");
    virtual ~Actor();

    Actor(const Actor&) = delete;
    Actor& operator=(const Actor&) = delete;

    // Identity
    void SetName(std::string name) noexcept { m_Name = std::move(name); }
    [[nodiscard]] const std::string& GetName() const noexcept { return m_Name; }

    void SetTag(std::string tag) noexcept { m_Tag = std::move(tag); }
    [[nodiscard]] const std::string& GetTag() const noexcept { return m_Tag; }

    // Transform
    void SetTransform(const glm::vec3& position, const glm::quat& rotation, const glm::vec3& scale) noexcept;
    void SetPosition(const glm::vec3& position) noexcept { m_Position = position; }
    void SetRotation(const glm::quat& rotation) noexcept { m_Rotation = rotation; }
    void SetScale(const glm::vec3& scale) noexcept { m_Scale = scale; }

    void Translate(const glm::vec3& delta) noexcept { m_Position += delta; }

    [[nodiscard]] const glm::vec3& GetPosition() const noexcept { return m_Position; }
    [[nodiscard]] const glm::quat& GetRotation() const noexcept { return m_Rotation; }
    [[nodiscard]] const glm::vec3& GetScale() const noexcept { return m_Scale; }
    [[nodiscard]] glm::mat4 GetLocalTransform() const noexcept;

    // Hierarchy
    void AttachTo(Actor::Ptr parent);
    void AddChild(Actor::Ptr child);
    void RemoveChild(Actor::Ptr child);

    [[nodiscard]] Actor::Ptr GetParent() const noexcept { return m_Parent.lock(); }
    [[nodiscard]] const std::vector<Actor::Ptr>& GetChildren() const noexcept { return m_Children; }
    [[nodiscard]] bool HasChildren() const noexcept { return !m_Children.empty(); }

    // Components
    template<typename T>
    T* AddComponent() {
        static_assert(std::is_base_of_v<Component, T>, "T must derive from Component");
        auto component = std::make_unique<T>();
        T* raw = component.get();
        component->m_Owner = this;
        m_Components.push_back(std::move(component));
        raw->OnAttached(*this);
        return raw;
    }

    template<typename T>
    [[nodiscard]] T* GetComponent() const {
        for (const auto& component : m_Components) {
            if (auto* typed = dynamic_cast<T*>(component.get())) {
                return typed;
            }
        }
        return nullptr;
    }

    void RemoveAllComponents();
    [[nodiscard]] const std::vector<std::unique_ptr<Component>>& GetComponents() const noexcept { return m_Components; }

    void TickComponents(float deltaTime);

    friend class SceneGraph;

protected:
    std::string m_Name;
    std::string m_Tag = "Untagged";
    std::string m_Layer = "Default";

    glm::vec3 m_Position{0.0f};
    glm::quat m_Rotation{1.0f, 0.0f, 0.0f, 0.0f};
    glm::vec3 m_Scale{1.0f};

    std::weak_ptr<Actor> m_Parent;
    std::vector<Actor::Ptr> m_Children;
    std::vector<std::unique_ptr<Component>> m_Components;
};

} // namespace Vanguard