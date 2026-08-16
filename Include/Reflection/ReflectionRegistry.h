#pragma once
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>
#include "Reflection/Macros.h"

namespace Vanguard::Reflection {

// ==========================================
// Central Class Metadata Registry
// ==========================================
//
// Stores ClassMetadata for every type registered through the
// BEGIN_CLASS_REFLECTION / END_CLASS_REFLECTION macro pair. The registry is
// populated during static initialization of each reflected translation unit
// and queried by the editor Property Inspector and the Console System.
class ReflectionRegistry {
public:
    static ReflectionRegistry& Get() {
        static ReflectionRegistry s_Instance;
        return s_Instance;
    }

    // Register (or replace) a class descriptor.
    void RegisterClass(const ClassMetadata& metadata);

    // Query a class by its reflected name; returns nullptr if unknown.
    [[nodiscard]] const ClassMetadata* GetClass(std::string_view className) const;

    // Query a class by type at compile time.
    template<typename T>
    [[nodiscard]] const ClassMetadata* GetClassForType() const {
        return GetClass(T::StaticClass().ClassName);
    }

    // Enumerate every registered class name.
    [[nodiscard]] std::vector<std::string> GetRegisteredClassNames() const;

    // Clear all descriptors (useful for unit-test harnesses / hot reload).
    void Reset();

    [[nodiscard]] size_t GetClassCount() const noexcept { return m_Classes.size(); }

private:
    ReflectionRegistry() = default;
    ~ReflectionRegistry() = default;

    ReflectionRegistry(const ReflectionRegistry&) = delete;
    ReflectionRegistry& operator=(const ReflectionRegistry&) = delete;

    std::unordered_map<std::string, ClassMetadata> m_Classes;
};

} // namespace Vanguard::Reflection