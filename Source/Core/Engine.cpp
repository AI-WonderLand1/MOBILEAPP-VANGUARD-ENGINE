#include "Core/Engine.h"
#include "RHI/VulkanContext.h"
#include "RenderGraph/RenderGraph.h"
#include "Scene/SceneGraph.h"
#include "Editor/EditorLayer.h"
#include "Platform/Platform.h"
#include "Input/InputSystem.h"
#include "RenderGraph/BarrierCompiler.h"
#include "RHI/ISwapchain.h"
#include <chrono>
#include <stdexcept>
#include <tracy/Tracy.hpp>

namespace Vanguard {

using Clock = std::chrono::steady_clock;

Engine::Engine() = default;
Engine::~Engine() = default;

void Engine::Initialize() {
    Initialize(nullptr);
}

void Engine::Initialize(std::unique_ptr<Platform::IWindow> window) {
    ZoneScopedN("Engine::Initialize");

    Platform::WindowConfig windowConfig;
    windowConfig.Title = "Vanguard Engine [Vulkan 1.3]";
    windowConfig.Width = 1920;
    windowConfig.Height = 1080;
    windowConfig.bEnableVulkan = true;

    if (window) {
        // Use the provided window
        m_Window = std::move(window);
        if (!m_Window->Initialize(windowConfig)) {
            throw std::runtime_error("Failed to initialize provided window");
        }
    } else {
        // Create window using platform factory
        m_Window = Platform::CreateWindow(windowConfig);
        if (!m_Window || !m_Window->Initialize(windowConfig)) {
            throw std::runtime_error("Failed to initialize platform window");
        }
    }

    // Set up input event callback
    m_Window->SetEventCallback([this](const Input::InputEvent& event) {
        m_InputSystem->OnEvent(event);
    });

    m_VulkanContext = std::make_unique<VulkanContext>();
    VulkanContextConfig rhiConfig;
    rhiConfig.AppName = "Vanguard Engine";
    m_VulkanContext->Initialize(rhiConfig);

    // Create surface from window
    VkSurfaceKHR surface = VK_NULL_HANDLE;
    if (m_Window->CreateVulkanSurface(m_VulkanContext->GetInstance(), &surface) == VK_SUCCESS) {
        m_VulkanContext->SetSurface(surface);
    } else {
        throw std::runtime_error("Failed to create Vulkan surface from window");
    }

    // Create swapchain
    auto extent = m_Window->GetExtent();
    m_VulkanContext->CreateSwapchain(extent.Width, extent.Height);

    m_PhysicsSystem = std::make_unique<PhysicsSystem>();
    m_PhysicsSystem->Initialize();

    m_SceneGraph = std::make_unique<SceneGraph>();

    m_EditorLayer = std::make_unique<Editor::EditorLayer>();
    m_EditorLayer->Initialize(m_VulkanContext->GetRenderPass(), m_VulkanContext->GetSwapchain().GetImageCount());

    // Initialize input system
    m_InputSystem = std::make_unique<Input::InputSystem>();
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
    m_InputSystem->NewFrame();
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

    // Get the image to clear
    VkImage image = m_VulkanContext->GetSwapchain().GetImage(imageIndex);
    if (image == VK_NULL_HANDLE) {
        throw std::runtime_error("Failed to get swapchain image");
    }

    // Begin a single-time command buffer
    VkCommandBuffer commandBuffer = m_VulkanContext->BeginSingleTimeCommand();

    // Transition image from undefined to transfer destination
    {
        BarrierCompiler barrierCompiler;
        barrierCompiler.EmitImageBarrier(
            commandBuffer,
            image,
            VK_IMAGE_LAYOUT_UNDEFINED,
            VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL,
            VK_PIPELINE_STAGE_TOP_OF_PIPE_BIT,
            VK_PIPELINE_STAGE_TRANSFER_BIT,
            0,
            VK_ACCESS_TRANSFER_WRITE_BIT,
            VK_IMAGE_ASPECT_COLOR_BIT
        );
    }

    // Clear the image with a dark gray color
    VkClearColorValue clearColor = {0.1f, 0.1f, 0.1f, 1.0f};
    VkImageSubresourceRange subresourceRange{};
    subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
    subresourceRange.baseMipLevel = 0;
    subresourceRange.levelCount = 1;
    subresourceRange.baseArrayLayer = 0;
    subresourceRange.layerCount = 1;

    vkCmdClearColorImage(
        commandBuffer,
        image,
        VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL,
        &clearColor,
        1,
        &subresourceRange
    );

    // Transition image from transfer destination to color attachment for ImGui
    {
        BarrierCompiler barrierCompiler;
        barrierCompiler.EmitImageBarrier(
            commandBuffer,
            image,
            VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL,
            VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
            VK_PIPELINE_STAGE_TRANSFER_BIT,
            VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
            VK_ACCESS_TRANSFER_WRITE_BIT,
            VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT,
            VK_IMAGE_ASPECT_COLOR_BIT
        );
    }

    // Begin ImGui Render Pass
    if (m_EditorLayer) {
        VkRenderPassBeginInfo renderPassInfo{};
        renderPassInfo.sType = VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO;
        renderPassInfo.renderPass = m_VulkanContext->GetRenderPass();
        renderPassInfo.framebuffer = m_VulkanContext->GetSwapchain().GetImages()[imageIndex].Framebuffer;
        renderPassInfo.renderArea.offset = {0, 0};
        renderPassInfo.renderArea.extent = m_VulkanContext->GetSwapchain().GetExtent();

        vkCmdBeginRenderPass(commandBuffer, &renderPassInfo, VK_SUBPASS_CONTENTS_INLINE);

        m_EditorLayer->BeginFrame();
        m_EditorLayer->RenderUI();
        m_EditorLayer->EndFrame(commandBuffer);

        vkCmdEndRenderPass(commandBuffer);
    }

    // Transition image from color attachment to present
    {
        BarrierCompiler barrierCompiler;
        barrierCompiler.EmitImageBarrier(
            commandBuffer,
            image,
            VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
            VK_IMAGE_LAYOUT_PRESENT_SRC_KHR,
            VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
            VK_PIPELINE_STAGE_BOTTOM_OF_PIPE_BIT,
            VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT,
            0,
            VK_IMAGE_ASPECT_COLOR_BIT
        );
    }

    // End the command buffer
    m_VulkanContext->EndSingleTimeCommand(commandBuffer);

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
    m_InputSystem.reset();
    m_Window->Shutdown();
    m_Window.reset();
}

} // namespace Vanguard