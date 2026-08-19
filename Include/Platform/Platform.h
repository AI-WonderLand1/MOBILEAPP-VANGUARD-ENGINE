#pragma once
#include "Platform/IWindow.h"

namespace Vanguard::Platform {

enum class PlatformType {
    Desktop,
    Android,
    iOS
};

PlatformType GetCurrentPlatform();

std::unique_ptr<IWindow> CreateWindow(const WindowConfig& config);

#if defined(VANGUARD_PLATFORM_ANDROID)
std::unique_ptr<IWindow> CreateWindowAndroid(struct android_app* app, const WindowConfig& config);
#endif

} // namespace Vanguard::Platform