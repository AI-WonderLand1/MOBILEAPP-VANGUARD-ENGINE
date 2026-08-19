#include "Platform/Platform.h"
#include "Platform/IWindow.h"
#include "Platform/Desktop/WindowSDL.cpp"
#include "Platform/Android/WindowAndroid.cpp"

namespace Vanguard::Platform {

PlatformType GetCurrentPlatform() {
#if defined(VANGUARD_PLATFORM_ANDROID)
    return PlatformType::Android;
#elif defined(VANGUARD_PLATFORM_IOS)
    return PlatformType::iOS;
#else
    return PlatformType::Desktop;
#endif
}

std::unique_ptr<IWindow> CreateWindow(const WindowConfig& config) {
    switch (GetCurrentPlatform()) {
        case PlatformType::Desktop:
            return std::make_unique<WindowSDL>(config);
        case PlatformType::Android:
            // Note: For Android, we need the android_app* parameter
            // This function alone is insufficient for Android
            // The Android-specific CreateWindowAndroid should be used instead
            return nullptr;
        case PlatformType::iOS:
            return nullptr;
        default:
            return nullptr;
    }
}

#if defined(VANGUARD_PLATFORM_ANDROID)
std::unique_ptr<IWindow> CreateWindowAndroid(struct android_app* app, const WindowConfig& config) {
    auto window = std::make_unique<WindowAndroid>(app);
    if (window && window->Initialize(config)) {
        return window;
    }
    return nullptr;
}
#endif

} // namespace Vanguard::Platform