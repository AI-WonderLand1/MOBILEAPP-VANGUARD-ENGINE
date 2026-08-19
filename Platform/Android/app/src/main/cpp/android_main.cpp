#include <android_native_app_glue.h>
#include <android/log.h>
#include <chrono>
#include <thread>

#include "Core/Engine.h"
#include "Platform/Platform.h"

#define LOG_TAG "VanguardAndroid"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

void android_main(android_app* app) {
    app->onAppCmd = nullptr;  // Handled by our window
    app->onInputEvent = nullptr;  // Handled by our window

    LOGI("Vanguard Android starting");

    try {
        // Create window and engine
        Platform::WindowConfig windowConfig;
        windowConfig.Title = "Vanguard Engine [Vulkan 1.3]";
        windowConfig.Width = 0;  // Will be set from window size
        windowConfig.Height = 0;
        windowConfig.bEnableVulkan = true;

        auto window = Platform::CreateWindowAndroid(app, windowConfig);
        if (!window || !window->Initialize(windowConfig)) {
            LOGE("Failed to initialize Android window");
            return;
        }

        Vanguard::Engine& engine = Vanguard::Engine::Get();
        engine.Initialize();

        LOGI("Vanguard Engine initialized successfully");

        auto last_time = std::chrono::steady_clock::now();

        // Main loop
        while (!window->ShouldClose() && !app->destroyRequested) {
            // Process Android events - this will call our window callbacks
            int events;
            android_poll_source* source;
            while (ALooper_pollAll(0, nullptr, &events, reinterpret_cast<void**>(&source)) >= 0) {
                if (source) {
                    source->process(app, source);
                }
            }

            // If we have a valid surface, render a frame
            if (window->IsSurfaceReady()) {
                auto now = std::chrono::steady_clock::now();
                auto dt = std::chrono::duration<float>(now - last_time).count();
                last_time = now;

                engine.Tick(dt);
                engine.RenderFrame();
            }

            // Sleep to avoid burning CPU when not rendering
            std::this_thread::sleep_for(std::chrono::milliseconds(16));
        }

        engine.Shutdown();
        LOGI("Vanguard Engine shut down successfully");
    }
    catch (const std::exception& e) {
        LOGE("Vanguard Engine crashed: %s", e.what());
    }
    catch (...) {
        LOGE("Vanguard Engine crashed: unknown exception");
    }
}