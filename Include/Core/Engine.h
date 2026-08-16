#pragma once
#include <memory>
#include <chrono>
#include "Core/Window.h"
#include "Physics/PhysicsSystem.h"

namespace Vanguard {

class SceneGraph;
class RenderGraph;
class VulkanContext;
class EditorLayer;

class Engine {
public:
    static Engine& Get() { static Engine instance; return instance; }

    void Initialize();
    void Run();
    void Shutdown();

    [[nodiscard]] Window& GetWindow() noexcept { return *m_Window; }
    [[nodiscard]] PhysicsSystem& GetPhysics() noexcept { return *m_PhysicsSystem; }
    [[nodiscard]] SceneGraph& GetSceneGraph() noexcept { return *m_SceneGraph; }
    [[nodiscard]] float GetDeltaTime() const noexcept { return m_DeltaTime; }
    [[nodiscard]] double GetTotalTime() const noexcept { return m_TotalTime; }

private:
    Engine() = default;
    ~Engine(); // Defined in Engine.cpp where all subsystem types are complete.

    void ProcessInput();
    void Tick(float deltaTime);
    void RenderFrame();

    std::unique_ptr<Window> m_Window;
    std::unique_ptr<VulkanContext> m_VulkanContext;
    std::unique_ptr<PhysicsSystem> m_PhysicsSystem;
    std::unique_ptr<SceneGraph> m_SceneGraph;
    std::unique_ptr<EditorLayer> m_EditorLayer;

    float m_DeltaTime = 0.01667f;
    double m_TotalTime = 0.0;
    float m_PhysicsAccumulator = 0.0f;
    static constexpr float c_FixedPhysicsTimeStep = 1.0f / 60.0f; // 60Hz
};

} // namespace Vanguard