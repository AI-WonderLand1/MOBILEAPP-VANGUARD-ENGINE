#pragma once
#include <string>
#include <functional>
#include <memory>
#include <vulkan/vulkan.h>
#include <cstdint>
#include "Input/InputTypes.h"

namespace Vanguard::Platform {

struct WindowConfig {
    std::string Title = "Vanguard Engine [Vulkan 1.3]";
    uint32_t Width = 1920;
    uint32_t Height = 1080;
    bool bFullscreen = false;
    bool bResizable = true;
    bool bEnableVulkan = true;
};

struct Extent2D {
    uint32_t Width = 0;
    uint32_t Height = 0;
};

class IWindow {
public:
    virtual ~IWindow() = default;

    virtual bool Initialize(const WindowConfig& config) = 0;
    virtual void Shutdown() = 0;

    virtual bool PollEvents() = 0;
    virtual bool ShouldClose() const noexcept = 0;

    virtual Extent2D GetExtent() const noexcept = 0;
    virtual VkResult CreateVulkanSurface(VkInstance instance, VkSurfaceKHR* surface) const = 0;

    virtual void* GetNativeHandle() const noexcept = 0;

    using EventCallback = std::function<void(const Input::InputEvent&)>;
    virtual void SetEventCallback(EventCallback callback) = 0;

    virtual void SetFullscreen(bool fullscreen) = 0;
    virtual void SetTitle(const std::string& title) = 0;
    
    virtual bool IsSurfaceReady() const noexcept { return false; }
};

std::unique_ptr<IWindow> CreateWindow(const WindowConfig& config);

} // namespace Vanguard::Platform