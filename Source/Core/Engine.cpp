#include "Core/Engine.h"
#include "RHI/VulkanContext.h"
#include "Scene/SceneGraph.h"
#include "Editor/EditorLayer.h"
#include <chrono>
#include <stdexcept>
#include <tracy/Tracy.hpp>

namespace Vanguard {

using Clock = std::chrono::steady_clock;

Engine::Engine() = default;
Engine::~Engine() = default;

void Engine::Initialize() {
    ZoneScopedN("Engine::Initialize");

    // 1. Window (SDL3 + Vulkan surface).
    WindowConfig windowConfig;
    windowConfig.Title = "Vanguard Engine [Vulkan 1.3]";
    m_Window = std::make_unique<Window>(windowConfig);

    // 2. Vulkan context.
    m_VulkanContext = std::make_unique<VulkanContext>();
    VulkanContextConfig rhiConfig;
    rhiConfig.AppName = "Vanguard Engine";
    m_VulkanContext->Initialize(rhiConfig);

    // 3. Physics subsystem (Jolt).
    m_PhysicsSystem = std::make_unique<PhysicsSystem>();
    m_PhysicsSystem->Initialize();

    // 4. World / scene graph.
    m_SceneGraph = std::make_unique<SceneGraph>();

    // 5. Editor layer (Dear ImGui docking).
    m_EditorLayer = std::make_unique<Editor::EditorLayer>();
    m_EditorLayer->Initialize(VK_NULL_HANDLE, 1);
}

void Engine::Run() {
    ZoneScopedN("Engine::Run");

    auto lastTime = Clock::now();

    while (m_Window->ShouldClose() == false) {
        ZoneScopedN("Engine::Frame");

        const auto currentTime = Clock::now();
        m_DeltaTime = std::chrono::duration<float>(currentTime - lastTime).count();
        lastTime = currentTime;
        m_TotalTime += m_DeltaTime;

        ProcessInput();
        Tick(m_DeltaTime);
        RenderFrame();

        FrameMark;
    }
}

void Engine::ProcessInput() {
    ZoneScopedN("Engine::ProcessInput");
    m_Window->PollEvents();
}

void Engine::Tick(float deltaTime) {
    ZoneScopedN("Engine::Tick");

    // Fixed-timestep physics accumulator (60Hz) for simulation stability.
    m_PhysicsAccumulator += deltaTime;
    while (m_PhysicsAccumulator >= c_FixedPhysicsTimeStep) {
        m_PhysicsSystem->Update(c_FixedPhysicsTimeStep);
        m_PhysicsAccumulator -= c_FixedPhysicsTimeStep;
    }

    // Tick world actors & components.
    m_SceneGraph->Tick(deltaTime);
}

void Engine::RenderFrame() {
    ZoneScopedN("Engine::RenderFrame");

    if (m_EditorLayer) {
        m_EditorLayer->BeginFrame();
        m_EditorLayer->RenderUI();
        m_EditorLayer->EndFrame(VK_NULL_HANDLE);
    }
}

void Engine::Shutdown() {
    ZoneScopedN("Engine::Shutdown");

    if (m_EditorLayer) {
        m_EditorLayer->Shutdown();
        m_EditorLayer.reset();
    }
    m_SceneGraph.reset();
    m_PhysicsSystem->Shutdown();
    m_PhysicsSystem.reset();
    m_VulkanContext->Shutdown();
    m_VulkanContext.reset();
    m_Window.reset();
}

} // namespace Vanguard