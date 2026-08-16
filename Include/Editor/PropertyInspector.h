#pragma once
#include <cstdint>
#include <glm/glm.hpp>
#include "Reflection/Macros.h"

namespace Vanguard::Editor {

// ==========================================
// Reflection-Driven Property Inspector
// ==========================================
// Renders Dear ImGui widgets for every reflected property of a component by
// dereferencing the recorded byte offset from the class base address.
class PropertyInspector {
public:
    PropertyInspector() = default;
    ~PropertyInspector() = default;

    // Renders the property tree for a single component instance.
    void RenderComponentUI(void* componentInstance, const Reflection::ClassMetadata& meta);

    // Convenience wrapper for reflected classes exposing StaticClass().
    template<typename T>
    void RenderComponent(T& instance) {
        RenderComponentUI(&instance, T::StaticClass());
    }
};

} // namespace Vanguard::Editor