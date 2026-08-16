#include "Core/Engine.h"
#include <tracy/Tracy.hpp>
#include <cstdio>

int main(int argc, char* argv[]) {
    (void)argc;
    (void)argv;

    // Tracy network profiler initialization (no-op unless TRACY_ENABLE).
    std::puts("Vanguard Engine [Vulkan 1.3] - booting...");

    Vanguard::Engine& engine = Vanguard::Engine::Get();
    engine.Initialize();
    engine.Run();
    engine.Shutdown();

    return 0;
}