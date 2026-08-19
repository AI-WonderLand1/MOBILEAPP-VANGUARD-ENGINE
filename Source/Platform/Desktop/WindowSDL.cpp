#include "Platform/IWindow.h"
#include <SDL3/SDL.h>
#include <SDL3/SDL_vulkan.h>
#include <stdexcept>
#include <utility>

namespace Vanguard::Platform {

class WindowSDL final : public IWindow {
public:
    WindowSDL() = default;
    ~WindowSDL() override { Shutdown(); }

    WindowSDL(const WindowSDL&) = delete;
    WindowSDL& operator=(const WindowSDL&) = delete;
    WindowSDL(WindowSDL&&) noexcept = default;
    WindowSDL& operator=(WindowSDL&&) noexcept = default;

    bool Initialize(const WindowConfig& config) override {
        m_Config = config;

        if (!SDL_Init(SDL_INIT_VIDEO | SDL_INIT_GAMEPAD)) {
            throw std::runtime_error("SDL3 Init Failed: " + std::string(SDL_GetError()));
        }

        SDL_WindowFlags flags = 0;
        if (config.bEnableVulkan) flags |= SDL_WINDOW_VULKAN;
        if (config.bResizable)    flags |= SDL_WINDOW_RESIZABLE;
        if (config.bFullscreen)   flags |= SDL_WINDOW_FULLSCREEN;
        flags |= SDL_WINDOW_HIGH_PIXEL_DENSITY;

        m_WindowHandle = SDL_CreateWindow(
            config.Title.c_str(),
            static_cast<int>(config.Width),
            static_cast<int>(config.Height),
            flags
        );

        if (!m_WindowHandle) {
            throw std::runtime_error("Failed to create SDL3 window: " + std::string(SDL_GetError()));
        }

        m_ShouldClose = false;
        return true;
    }

    void Shutdown() override {
        if (m_WindowHandle) {
            SDL_DestroyWindow(m_WindowHandle);
            m_WindowHandle = nullptr;
        }
        SDL_Quit();
    }

    bool PollEvents() override {
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                m_ShouldClose = true;
            } else if (event.type == SDL_EVENT_WINDOW_RESIZED) {
                m_Config.Width = static_cast<uint32_t>(event.window.data1);
                m_Config.Height = static_cast<uint32_t>(event.window.data2);
            }

            if (m_EventCallback) {
                m_EventCallback(&event);
            }
        }
        return !m_ShouldClose;
    }

    bool ShouldClose() const noexcept override { return m_ShouldClose; }

    Extent2D GetExtent() const noexcept override {
        return { m_Config.Width, m_Config.Height };
    }

    VkResult CreateVulkanSurface(VkInstance instance, VkSurfaceKHR* surface) const override {
        if (!SDL_Vulkan_CreateSurface(m_WindowHandle, instance, nullptr, surface)) {
            return VK_ERROR_INITIALIZATION_FAILED;
        }
        return VK_SUCCESS;
    }

    void* GetNativeHandle() const noexcept override { return m_WindowHandle; }

    void SetEventCallback(EventCallback callback) override { m_EventCallback = std::move(callback); }

    void SetFullscreen(bool fullscreen) override {
        m_Config.bFullscreen = fullscreen;
        if (m_WindowHandle) {
            SDL_SetWindowFullscreen(m_WindowHandle, fullscreen);
        }
    }

    void SetTitle(const std::string& title) override {
        m_Config.Title = title;
        if (m_WindowHandle) {
            SDL_SetWindowTitle(m_WindowHandle, title.c_str());
        }
    }

private:
    SDL_Window* m_WindowHandle = nullptr;
    WindowConfig m_Config;
    bool m_ShouldClose = false;
    EventCallback m_EventCallback;
};

std::unique_ptr<IWindow> CreateWindow(const WindowConfig& config) {
    return std::make_unique<WindowSDL>(config);
}

} // namespace Vanguard::Platform