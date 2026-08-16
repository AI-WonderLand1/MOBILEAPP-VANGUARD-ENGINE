#include "Editor/FilamentViewport.h"
#include <algorithm>
#include <tracy/Tracy.hpp>

namespace Vanguard::Editor {

FilamentViewport::FilamentViewport(filament::Engine* engine)
    : m_Engine(engine) {
}

FilamentViewport::~FilamentViewport() {
    Shutdown();
}

void FilamentViewport::Initialize(uint32_t initialWidth, uint32_t initialHeight) {
    ZoneScopedN("FilamentViewport::Initialize");
    if (!m_Engine) return;

    m_Width = std::max(1u, initialWidth);
    m_Height = std::max(1u, initialHeight);

    // 1. Create Scene & View
    m_Scene = m_Engine->createScene();
    m_View = m_Engine->createView();
    m_View->setScene(m_Scene);

    // 2. Create Camera
    m_CameraEntity = utils::EntityManager::get().create();
    m_Camera = m_Engine->createCamera(m_CameraEntity);
    m_View->setCamera(m_Camera);

    // 3. Configure Camera Perspective
    const double fovInDegrees = 45.0;
    const double aspect = static_cast<double>(m_Width) / static_cast<double>(m_Height);
    m_Camera->setProjection(fovInDegrees, aspect, 0.1, 1000.0, filament::Camera::Fov::VERTICAL);

    // 4. Allocate Off-screen RenderTarget Textures
    AllocateRenderTargets(m_Width, m_Height);
}

void FilamentViewport::AllocateRenderTargets(uint32_t width, uint32_t height) {
    ZoneScopedN("FilamentViewport::AllocateRenderTargets");
    if (!m_Engine) return;

    // Ensure non-zero dimensions
    width = std::max(1u, width);
    height = std::max(1u, height);

    // 1. Allocate HDR RGBA8 Color Attachment Texture
    m_ColorTexture = filament::Texture::Builder()
        .width(width)
        .height(height)
        .levels(1)
        .usage(filament::Texture::Usage::COLOR_ATTACHMENT | filament::Texture::Usage::SAMPLEABLE)
        .format(filament::Texture::InternalFormat::RGBA8)
        .build(*m_Engine);

    // 2. Allocate Depth attachment (DEPTH24 or DEPTH32F)
    m_DepthTexture = filament::Texture::Builder()
        .width(width)
        .height(height)
        .levels(1)
        .usage(filament::Texture::Usage::DEPTH_ATTACHMENT)
        .format(filament::Texture::InternalFormat::DEPTH24)
        .build(*m_Engine);

    // 3. Create Offscreen RenderTarget
    m_RenderTarget = filament::RenderTarget::Builder()
        .texture(filament::RenderTarget::AttachmentPoint::COLOR, m_ColorTexture)
        .texture(filament::RenderTarget::AttachmentPoint::DEPTH, m_DepthTexture)
        .build(*m_Engine);

    // 4. Assign RenderTarget and Viewport bounds to View
    m_View->setRenderTarget(m_RenderTarget);
    m_View->setViewport({0, 0, static_cast<int>(width), static_cast<int>(height)});

    m_Width = width;
    m_Height = height;
}

void FilamentViewport::ReleaseRenderTargets() {
    ZoneScopedN("FilamentViewport::ReleaseRenderTargets");
    if (!m_Engine) return;

    if (m_View) {
        m_View->setRenderTarget(nullptr);
    }

    if (m_RenderTarget) {
        m_Engine->destroy(m_RenderTarget);
        m_RenderTarget = nullptr;
    }
    if (m_ColorTexture) {
        m_Engine->destroy(m_ColorTexture);
        m_ColorTexture = nullptr;
    }
    if (m_DepthTexture) {
        m_Engine->destroy(m_DepthTexture);
        m_DepthTexture = nullptr;
    }
}

void FilamentViewport::Resize(uint32_t newWidth, uint32_t newHeight) {
    newWidth = std::max(1u, newWidth);
    newHeight = std::max(1u, newHeight);

    if (newWidth == m_Width && newHeight == m_Height && m_RenderTarget != nullptr) {
        return; // No-op if dimensions match
    }

    ZoneScopedN("FilamentViewport::Resize");

    // Release existing attachments and rebuild
    ReleaseRenderTargets();
    AllocateRenderTargets(newWidth, newHeight);

    // Update Camera Aspect Ratio
    if (m_Camera) {
        const double aspect = static_cast<double>(newWidth) / static_cast<double>(newHeight);
        m_Camera->setProjection(45.0, aspect, 0.1, 1000.0, filament::Camera::Fov::VERTICAL);
    }
}

void FilamentViewport::Render(filament::Renderer* renderer) {
    if (!renderer || !m_View) return;
    ZoneScopedN("FilamentViewport::Render");
    renderer->render(m_View);
}

intptr_t FilamentViewport::GetNativeTextureHandle() const noexcept {
    if (!m_ColorTexture || !m_Engine) return 0;

    // Depending on backend (OpenGL, Vulkan, or Metal):
    // For OpenGL / Vulkan DescriptorSet, Filament provides native object handles
    // or through ImGui Backend Bridge:
    return reinterpret_cast<intptr_t>(m_ColorTexture);
}

ImTextureID FilamentViewport::GetImGuiTextureID() const noexcept {
    return reinterpret_cast<ImTextureID>(GetNativeTextureHandle());
}

void FilamentViewport::RenderImGuiViewport(const char* windowTitle) {
    ZoneScopedN("FilamentViewport::RenderImGuiViewport");

    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0f, 0.0f));
    ImGui::Begin(windowTitle);

    m_bIsHovered = ImGui::IsWindowHovered();
    m_bIsFocused = ImGui::IsWindowFocused();

    // 1. Detect dynamic viewport size in Dear ImGui
    const ImVec2 availSize = ImGui::GetContentRegionAvail();
    const uint32_t targetWidth = static_cast<uint32_t>(std::max(1.0f, availSize.x));
    const uint32_t targetHeight = static_cast<uint32_t>(std::max(1.0f, availSize.y));

    // 2. Trigger dynamic resize if content region changed
    if (targetWidth != m_Width || targetHeight != m_Height) {
        Resize(targetWidth, targetHeight);
    }

    // 3. Render Texture inside ImGui Viewport
    ImTextureID textureID = GetImGuiTextureID();
    if (textureID) {
        // Invert V coordinate for OpenGL/Vulkan UV conventions if needed: (0, 1) -> (1, 0)
        ImGui::Image(textureID, availSize, ImVec2(0.0f, 1.0f), ImVec2(1.0f, 0.0f));
    }

    ImGui::End();
    ImGui::PopStyleVar();
}

void FilamentViewport::Shutdown() {
    ZoneScopedN("FilamentViewport::Shutdown");
    if (!m_Engine) return;

    ReleaseRenderTargets();

    if (m_Camera) {
        m_Engine->destroyCameraComponent(m_CameraEntity);
        utils::EntityManager::get().destroy(m_CameraEntity);
        m_Camera = nullptr;
    }

    if (m_View) {
        m_Engine->destroy(m_View);
        m_View = nullptr;
    }

    if (m_Scene) {
        m_Engine->destroy(m_Scene);
        m_Scene = nullptr;
    }

    m_Engine = nullptr;
}

} // namespace Vanguard::Editor