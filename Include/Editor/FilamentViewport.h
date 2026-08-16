#pragma once

#include <cstdint>
#include <memory>
#include <filament/Engine.h>
#include <filament/View.h>
#include <filament/Scene.h>
#include <filament/Camera.h>
#include <filament/Renderer.h>
#include <filament/RenderTarget.h>
#include <filament/Texture.h>
#include <filament/Viewport.h>
#include <utils/Entity.h>
#include <utils/EntityManager.h>
#include <imgui.h>

namespace Vanguard::Editor {

class FilamentViewport {
public:
    explicit FilamentViewport(filament::Engine* engine);
    ~FilamentViewport();

    // Non-copyable, movable
    FilamentViewport(const FilamentViewport&) = delete;
    FilamentViewport& operator=(const FilamentViewport&) = delete;
    FilamentViewport(FilamentViewport&& other) noexcept;
    FilamentViewport& operator=(FilamentViewport&& other) noexcept;

    // Viewport Lifecycle & Dynamic Resizing
    void Initialize(uint32_t initialWidth, uint32_t initialHeight);
    void Resize(uint32_t newWidth, uint32_t newHeight);
    void Render(filament::Renderer* renderer);
    void Shutdown();

    // Dear ImGui Integration
    void RenderImGuiViewport(const char* windowTitle = "3D Viewport");
    [[nodiscard]] ImTextureID GetImGuiTextureID() const noexcept;
    [[nodiscard]] intptr_t GetNativeTextureHandle() const noexcept;

    // Subsystem Accessors
    [[nodiscard]] filament::Engine* GetEngine() const noexcept { return m_Engine; }
    [[nodiscard]] filament::View* GetView() const noexcept { return m_View; }
    [[nodiscard]] filament::Scene* GetScene() const noexcept { return m_Scene; }
    [[nodiscard]] filament::Camera* GetCamera() const noexcept { return m_Camera; }
    [[nodiscard]] filament::RenderTarget* GetRenderTarget() const noexcept { return m_RenderTarget; }

    [[nodiscard]] uint32_t GetWidth() const noexcept { return m_Width; }
    [[nodiscard]] uint32_t GetHeight() const noexcept { return m_Height; }
    [[nodiscard]] float GetAspectRatio() const noexcept {
        return m_Height > 0 ? static_cast<float>(m_Width) / static_cast<float>(m_Height) : 1.0f;
    }
    [[nodiscard]] bool IsHovered() const noexcept { return m_bIsHovered; }
    [[nodiscard]] bool IsFocused() const noexcept { return m_bIsFocused; }

private:
    void AllocateRenderTargets(uint32_t width, uint32_t height);
    void ReleaseRenderTargets();

    filament::Engine* m_Engine = nullptr;
    filament::View* m_View = nullptr;
    filament::Scene* m_Scene = nullptr;
    filament::Camera* m_Camera = nullptr;
    utils::Entity m_CameraEntity;

    // Off-screen Render Target & Textures
    filament::Texture* m_ColorTexture = nullptr;
    filament::Texture* m_DepthTexture = nullptr;
    filament::RenderTarget* m_RenderTarget = nullptr;

    // Dimensions & UI State
    uint32_t m_Width = 1280;
    uint32_t m_Height = 720;
    bool m_bIsHovered = false;
    bool m_bIsFocused = false;
};

} // namespace Vanguard::Editor