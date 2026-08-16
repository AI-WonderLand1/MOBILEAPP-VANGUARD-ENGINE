#pragma once
#include <tracy/Tracy.hpp>
#include <tracy/TracyVulkan.hpp>

// CPU Zone Instrumentation
#define VANGUARD_PROFILE_ZONE() ZoneScoped
#define VANGUARD_PROFILE_ZONE_NAMED(name) ZoneScopedN(name)
#define VANGUARD_PROFILE_FRAME() FrameMark

// Memory Tracking Allocations
#define VANGUARD_PROFILE_ALLOC(ptr, size) TracyAlloc(ptr, size)
#define VANGUARD_PROFILE_FREE(ptr) TracyFree(ptr)

namespace Vanguard::Profiling {

class RenderDocIntegration {
public:
    static void Initialize();
    static void TriggerCapture();
    static void StartFrameCapture();
    static void EndFrameCapture();
};

} // namespace Vanguard::Profiling