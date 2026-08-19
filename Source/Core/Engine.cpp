#include "Core/Engine.h"
#include "RHI/VulkanContext.h"
#include "Scene/SceneGraph.h"
#include "Editor/EditorLayer.h"
#include "Platform/Platform.h"
#include <chrono>
#include <stdexcept>
#include <tracy/Tracy.hpp>

namespace Vanguard {

using Clock = std::chrono::steady_clock;

Engine::Engine() = default;
Engine::~Engine() = default;

void Engine::Initialize() {
    ZoneScopedN("Engine::Initialize");

    Platform::WindowConfig windowConfig;
    windowConfig.Title = "Vanguard Engine [Vulkan 1.3]";
    windowConfig.Width = 1920;
    windowConfig.Height = 1080;
    windowConfig.bEnableVulkan = true;

    m_Window = Platform::CreateWindow(windowConfig);
    if (!m_Window || !m_Window->Initialize(windowConfig)) {
        throw std::runtime_error("Failed to initialize platform window");
    }

    m_VulkanContext = std::make_unique<VulkanContext>();
    VulkanContextConfig rhiConfig;
    rhiConfig.AppName = "Vanguard Engine";
    m_VulkanContext->Initialize(rhiConfig);

    // Create surface from window
    if (auto* nativeHandle = m_Window->GetNativeHandle()) {
        m_VulkanContext->CreateSurface(nativeHandle);
    } else {
        throw std::runtime_error("Window native handle is null");
    }

    // Create swapchain
    auto extent = m_Window->GetExtent();
    m_VulkanContext->CreateSwapchain(extent.Width, extent.Height);

    m_PhysicsSystem = std::make_unique<PhysicsSystem>();
    m_PhysicsSystem->Initialize();

    m_SceneGraph = std::make_unique<SceneGraph>();

    m_EditorLayer = std::make_unique<Editor::EditorLayer>();
    m_EditorLayer->Initialize(m_VulkanContext->GetSwapchain().GetImages()[0].View, m_VulkanContext->GetSwapchain().GetImageCount());
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

    m_PhysicsAccumulator += deltaTime;
    while (m_PhysicsAccumulator >= c_FixedPhysicsTimeStep) {
        m_PhysicsSystem->Update(c_FixedPhysicsTimeStep);
        m_PhysicsAccumulator -= c_FixedPhysicsTimeStep;
    }

    m_SceneGraph->Tick(deltaTime);
}

void Engine::RenderFrame() {
    ZoneScopedN("Engine::RenderFrame");

    // Acquire next image from swapchain
    uint32_t imageIndex = 0;
    VkResult result = m_VulkanContext->GetSwapchain().AcquireNextImage(
        UINT64_MAX, 
        VK_NULL_HANDLE, 
        VK_NULL_HANDLE, 
        &imageIndex
    );

    // Handle swapchain recreation if needed
    if (result == VK_ERROR_OUT_OF_DATE_KHR || result == VK_SUBOPTIMAL_KHR) {
        auto extent = m_Window->GetExtent();
        m_VulkanContext->RecreateSwapchain(extent.Width, extent.Height);
        // Retry frame acquisition
        result = m_VulkanContext->GetSwapchain().AcquireNextImage(
            UINT64_MAX, 
            VK_NULL_HANDLE, 
            VK_NULL_HANDLE, 
            &imageIndex
        );
    }

    if (result != VK_SUCCESS && result != VK_SUBOPTIMAL_KHR) {
        throw std::runtime_error("Failed to acquire swapchain image");
    }

    // TODO: Record and submit command buffer for this frame

    if (m_EditorLayer) {
        m_EditorLayer->BeginFrame();
        m_EditorLayer->RenderUI();
        m_EditorLayer->EndFrame(VK_NULL_HANDLE);
    }

    // Present the image
    m_VulkanContext->GetSwapchain().Present(
        m_VulkanContext->GetPresentQueue(),
        imageIndex,
        nullptr,
        0
    );
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
    m_Window->Shutdown();
    m_Window.reset();
}

} // namespace Vanguard