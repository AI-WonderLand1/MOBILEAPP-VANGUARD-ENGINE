#include <android_native_app_glue.h>
#include <android/log.h>
#include <chrono>
#include <thread>

#include "Platform/Platform.h"

#define LOG_TAG "VanguardAndroid"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static void handle_cmd(android_app* app, int32_t cmd) {
    switch (cmd) {
        case APP_CMD_INIT_WINDOW:
            LOGI("APP_CMD_INIT_WINDOW: surface created");
            break;
        case APP_CMD_TERM_WINDOW:
            LOGI("APP_CMD_TERM_WINDOW: surface destroyed");
            break;
        case APP_CMD_RESUME:
            LOGI("APP_CMD_RESUME");
            break;
        case APP_CMD_PAUSE:
            LOGI("APP_CMD_PAUSE");
            break;
        case APP_CMD_DESTROY:
            LOGI("APP_CMD_DESTROY");
            break;
        default:
            break;
    }
}

static int32_t handle_input(android_app* app, AInputEvent* event) {
    return 0;
}

void android_main(android_app* app) {
    app->onAppCmd = handle_cmd;
    app->onInputEvent = handle_input;

    LOGI("Vanguard Android starting");

    int events;
    android_poll_source* source;

    auto last_time = std::chrono::steady_clock::now();

    while (true) {
        while (ALooper_pollAll(0, nullptr, &events, reinterpret_cast<void**>(&source)) >= 0) {
            if (source) source->process(app, source);
            if (app->destroyRequested) {
                LOGI("Destroy requested, exiting");
                return;
            }
        }

        auto now = std::chrono::steady_clock::now();
        auto dt = std::chrono::duration<float>(now - last_time).count();
        last_time = now;

        // Engine frame would go here
        // For now, just log frame time
        static int frame = 0;
        if (++frame % 60 == 0) {
            LOGI("Frame %d, dt=%.4f", frame, dt);
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(16));
    }
}