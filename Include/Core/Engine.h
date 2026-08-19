#pragma once
#include <memory>
#include <chrono>
#include "Platform/IWindow.h"
#include "Physics/PhysicsSystem.h"
#include "Input/InputTypes.h"

namespace Vanguard {

class SceneGraph;
class RenderGraph;
class VulkanContext;
namespace Editor { class EditorLayer; }
namespace Input { class IInputSystem; }

class Engine {
public:
    static Engine& Get() { static Engine instance; return instance; }

    void Initialize();
    void Run();
    void Shutdown();

    [[nodiscard]] Platform::IWindow& GetWindow() noexcept { return *m_Window; }
    [[nodiscard]] PhysicsSystem& GetPhysics() noexcept { return *m_PhysicsSystem; }
    [[nodiscard]] SceneGraph& GetSceneGraph() noexcept { return *m_SceneGraph; }
    [[nodiscard]] Input::IInputSystem& GetInputSystem() noexcept { return *m_InputSystem; }
    [[nodiscard]] float GetDeltaTime() const noexcept { return m_DeltaTime; }
    [[nodiscard]] double GetTotalTime() const noexcept { return m_TotalTime; }

private:
    Engine();
    ~Engine();

    void ProcessInput();
    void Tick(float deltaTime);
    void RenderFrame();
    void OnPlatformEvent(const void* platformEvent);

    std::unique_ptr<Platform::IWindow> m_Window;
    std::unique_ptr<VulkanContext> m_VulkanContext;
    std::unique_ptr<PhysicsSystem> m_PhysicsSystem;
    std::unique_ptr<SceneGraph> m_SceneGraph;
    std::unique_ptr<Editor::EditorLayer> m_EditorLayer;
    std::unique_ptr<Input::IInputSystem> m_InputSystem;

    float m_DeltaTime = 0.01667f;
    double m_TotalTime = 0.0;
    float m_PhysicsAccumulator = 0.0f;
    static constexpr float c_FixedPhysicsTimeStep = 1.0f / 60.0f;
};

} // namespace Vanguard