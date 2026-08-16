#pragma once
#include <string>
#include <functional>
#include <vulkan/vulkan.h>
#include <SDL3/SDL.h>

namespace Vanguard {

struct WindowConfig {
    std::string Title = "Vanguard Engine [Vulkan 1.3]";
    uint32_t Width = 1920;
    uint32_t Height = 1080;
    bool bFullscreen = false;
    bool bResizable = true;
    bool bEnableVulkan = true;
};

class Window {
public:
    explicit Window(const WindowConfig& config);
    ~Window();

    Window(const Window&) = delete;
    Window& operator=(const Window&) = delete;
    Window(Window&&) noexcept;
    Window& operator=(Window&&) noexcept;

    bool PollEvents();
    bool ShouldClose() const noexcept { return m_bShouldClose; }
    
    // Low-level Vulkan Surface Factory
    VkResult CreateVulkanSurface(VkInstance instance, const VkAllocationCallbacks* allocator, VkSurfaceKHR* surface) const;

    [[nodiscard]] SDL_Window* GetNativeHandle() const noexcept { return m_WindowHandle; }
    [[nodiscard]] uint32_t GetWidth() const noexcept { return m_Width; }
    [[nodiscard]] uint32_t GetHeight() const noexcept { return m_Height; }

    void SetEventCallback(std::function<void(const SDL_Event&)> callback) { m_EventCallback = std::move(callback); }

private:
    SDL_Window* m_WindowHandle = nullptr;
    uint32_t m_Width = 1920;
    uint32_t m_Height = 1080;
    bool m_bShouldClose = false;
    std::function<void(const SDL_Event&)> m_EventCallback;
};

} // namespace Vanguard