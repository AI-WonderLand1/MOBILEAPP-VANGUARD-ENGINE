#include "Core/Window.h"
#include <SDL3/SDL_vulkan.h>
#include <stdexcept>
#include <tracy/Tracy.hpp>

namespace Vanguard {

Window::Window(const WindowConfig& config)
    : m_Width(config.Width), m_Height(config.Height) {
    ZoneScopedN("Window::Initialize");

    if (!SDL_Init(SDL_INIT_VIDEO | SDL_INIT_GAMEPAD)) {
        throw std::runtime_error(std::string("SDL3 Init Failed: ") + SDL_GetError());
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
        throw std::runtime_error(std::string("Failed to create SDL3 window: ") + SDL_GetError());
    }
}

Window::~Window() {
    if (m_WindowHandle) {
        SDL_DestroyWindow(m_WindowHandle);
        m_WindowHandle = nullptr;
    }
    SDL_Quit();
}

bool Window::PollEvents() {
    ZoneScopedN("Window::PollEvents");
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_EVENT_QUIT) {
            m_bShouldClose = true;
        } else if (event.type == SDL_EVENT_WINDOW_RESIZED) {
            m_Width = static_cast<uint32_t>(event.window.data1);
            m_Height = static_cast<uint32_t>(event.window.data2);
        }

        if (m_EventCallback) {
            m_EventCallback(event);
        }
    }
    return !m_bShouldClose;
}

VkResult Window::CreateVulkanSurface(VkInstance instance, const VkAllocationCallbacks* allocator, VkSurfaceKHR* surface) const {
    ZoneScopedN("Window::CreateVulkanSurface");
    if (!SDL_Vulkan_CreateSurface(m_WindowHandle, instance, allocator, surface)) {
        return VK_ERROR_INITIALIZATION_FAILED;
    }
    return VK_SUCCESS;
}

} // namespace Vanguard