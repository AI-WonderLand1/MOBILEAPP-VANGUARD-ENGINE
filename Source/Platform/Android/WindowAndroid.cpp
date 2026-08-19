#include "Platform/IWindow.h"
#include <android_native_app_glue.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <vulkan/vulkan.h>
#include <vulkan/vulkan_android.h>
#include <stdexcept>
#include <utility>
#include "Input/InputTypes.h"

namespace Vanguard::Platform {

struct AndroidWindowState {
    ANativeWindow* nativeWindow = nullptr;
    bool surfaceCreated = false;
    bool surfaceDestroyed = false;
    bool shouldClose = false;
    int32_t width = 0;
    int32_t height = 0;
    std::function<void(const Input::InputEvent&)> eventCallback;
};

static void AndroidHandleCmd(struct android_app* app, int32_t cmd) {
    auto* state = static_cast<AndroidWindowState*>(app->userData);
    if (!state) return;

    switch (cmd) {
        case APP_CMD_INIT_WINDOW:
            state->nativeWindow = app->window;
            state->surfaceCreated = true;
            state->surfaceDestroyed = false;
            if (state->nativeWindow) {
                state->width = ANativeWindow_getWidth(state->nativeWindow);
                state->height = ANativeWindow_getHeight(state->nativeWindow);
            }
            break;
        case APP_CMD_TERM_WINDOW:
            state->surfaceDestroyed = true;
            state->surfaceCreated = false;
            state->nativeWindow = nullptr;
            break;
        case APP_CMD_RESUME:
            break;
        case APP_CMD_PAUSE:
            break;
        case APP_CMD_DESTROY:
            state->shouldClose = true;
            break;
        case APP_CMD_CONFIG_CHANGED:
            if (state->nativeWindow) {
                state->width = ANativeWindow_getWidth(state->nativeWindow);
                state->height = ANativeWindow_getHeight(state->nativeWindow);
            }
            break;
        case APP_CMD_LOW_MEMORY:
            break;
        case APP_CMD_START:
            break;
        case APP_CMD_STOP:
            break;
        default:
            break;
    }

    // Handle window resize command
    if (state->eventCallback && cmd == APP_CMD_WINDOW_RESIZED) {
        Input::InputEvent event;
        event.Type = Input::EventType::WindowResized;
        // Note: We don't have the new size here, but we can get it from the window
        // when we actually need it, or we could store it when we get INIT_WINDOW
        // For now, we'll leave it at default size and update via poll events
        state->eventCallback(event);
    }
}

static int32_t AndroidHandleInput(struct android_app* app, AInputEvent* event) {
    auto* state = static_cast<AndroidWindowState*>(app->userData);
    if (!state || !state->eventCallback) return 0;

    int32_t action = AMotionEvent_getAction(event);
    int32_t pointerIndex = (action & AMOTION_EVENT_ACTION_POINTER_INDEX_MASK) >>
                          AMOTION_EVENT_ACTION_POINTER_INDEX_SHIFT;
    int32_t actionCode = action & AMOTION_EVENT_ACTION_MASK;
    int32_t pointerId = AMotionEvent_getPointerId(event, pointerIndex);
    float x = AMotionEvent_getX(event, pointerIndex);
    float y = AMotionEvent_getY(event, pointerIndex);

    Input::InputEvent inputEvent;
    inputEvent.Type = Input::EventType::None;

    switch (actionCode) {
        case AMOTION_EVENT_ACTION_DOWN:
        case AMOTION_EVENT_ACTION_POINTER_DOWN:
            inputEvent.Type = Input::EventType::TouchDown;
            inputEvent.Touch.TouchId = pointerId;
            inputEvent.Touch.X = static_cast<int32_t>(x);
            inputEvent.Touch.Y = static_cast<int32_t>(y);
            inputEvent.Touch.Pressure = AMotionEvent_getPressure(event, pointerIndex);
            break;
            
        case AMOTION_EVENT_ACTION_UP:
        case AMOTION_EVENT_ACTION_POINTER_UP:
            inputEvent.Type = Input::EventType::TouchUp;
            inputEvent.Touch.TouchId = pointerId;
            inputEvent.Touch.X = static_cast<int32_t>(x);
            inputEvent.Touch.Y = static_cast<int32_t>(y);
            break;
            
        case AMOTION_EVENT_ACTION_MOVE:
            inputEvent.Type = Input::EventType::TouchMoved;
            inputEvent.Touch.TouchId = pointerId;
            inputEvent.Touch.X = static_cast<int32_t>(x);
            inputEvent.Touch.Y = static_cast<int32_t>(y);
            inputEvent.Touch.Pressure = AMotionEvent_getPressure(event, pointerIndex);
            break;
    }

    if (inputEvent.Type != Input::EventType::None && state->eventCallback) {
        state->eventCallback(inputEvent);
    }
    
    return 1; // Event was handled
}

class WindowAndroid final : public IWindow {
public:
    WindowAndroid(android_app* app) : m_App(app) {
        m_State = std::make_unique<AndroidWindowState>();
        m_App->userData = m_State.get();
        m_App->onAppCmd = AndroidHandleCmd;
        m_App->onInputEvent = AndroidHandleInput;
    }

    ~WindowAndroid() override { Shutdown(); }

    WindowAndroid(const WindowAndroid&) = delete;
    WindowAndroid& operator=(const WindowAndroid&) = delete;
    WindowAndroid(WindowAndroid&&) noexcept = default;
    WindowAndroid& operator=(WindowAndroid&&) noexcept = default;

    bool Initialize(const WindowConfig& config) override {
        m_Config = config;
        m_State->shouldClose = false;
        m_State->width = static_cast<int32_t>(config.Width);
        m_State->height = static_cast<int32_t>(config.Height);
        return true;
    }

    void Shutdown() override {
        if (m_State->nativeWindow) {
            ANativeWindow_release(m_State->nativeWindow);
            m_State->nativeWindow = nullptr;
        }
        m_State.reset();
    }

    bool PollEvents() override {
        int events;
        android_poll_source* source;
        while (ALooper_pollAll(0, nullptr, &events, reinterpret_cast<void**>(&source)) >= 0) {
            if (source) {
                source->process(m_App, source);
            }
            if (m_App->destroyRequested) {
                m_State->shouldClose = true;
            }
        }
        return !m_State->shouldClose;
    }

    bool ShouldClose() const noexcept override { return m_State->shouldClose; }

    Extent2D GetExtent() const noexcept override {
        return { static_cast<uint32_t>(m_State->width), static_cast<uint32_t>(m_State->height) };
    }

    VkResult CreateVulkanSurface(VkInstance instance, VkSurfaceKHR* surface) const override {
        if (!m_State->nativeWindow) return VK_ERROR_INITIALIZATION_FAILED;

        VkAndroidSurfaceCreateInfoKHR createInfo{
            .sType = VK_STRUCTURE_TYPE_ANDROID_SURFACE_CREATE_INFO_KHR,
            .pNext = nullptr,
            .flags = 0,
            .window = m_State->nativeWindow
        };

        PFN_vkCreateAndroidSurfaceKHR func = reinterpret_cast<PFN_vkCreateAndroidSurfaceKHR>(
            vkGetInstanceProcAddr(instance, "vkCreateAndroidSurfaceKHR")
        );
        if (!func) return VK_ERROR_EXTENSION_NOT_PRESENT;

        return func(instance, &createInfo, nullptr, surface);
    }

    void* GetNativeHandle() const noexcept override { return m_State->nativeWindow; }

    void SetEventCallback(EventCallback callback) override { m_State->eventCallback = std::move(callback); }

    void SetFullscreen(bool fullscreen) override {
        m_Config.bFullscreen = fullscreen;
    }

    void SetTitle(const std::string& title) override {
        m_Config.Title = title;
    }

    bool IsSurfaceReady() const noexcept { return m_State->surfaceCreated && !m_State->surfaceDestroyed; }
    ANativeWindow* GetNativeWindow() const noexcept { return m_State->nativeWindow; }

private:
    android_app* m_App = nullptr;
    std::unique_ptr<AndroidWindowState> m_State;
    WindowConfig m_Config;
};

std::unique_ptr<IWindow> CreateWindow(const WindowConfig& config) {
    return nullptr;
}

std::unique_ptr<IWindow> CreateWindowAndroid(android_app* app, const WindowConfig& config) {
    auto window = std::make_unique<WindowAndroid>(app);
    window->Initialize(config);
    return window;
}

} // namespace Vanguard::Platform