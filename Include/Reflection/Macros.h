#pragma once
#include <string>
#include <vector>
#include <cstddef>
#include <functional>
#include <glm/glm.hpp>
#include "Reflection/TypeTraits.h"
#include "Reflection/ReflectionRegistry.h"

namespace Vanguard::Reflection {

struct PropertyMetadata {
    std::string Name;
    std::string DisplayName;
    TypeKind Type;
    size_t Offset;
    size_t Size;
    std::string Category;
    std::string Tooltip;
    float Min = 0.0f;
    float Max = 0.0f;
    float Step = 0.1f;
    std::vector<std::string> EnumOptions;
    bool bIsReadOnly = false;
};

struct ClassMetadata {
    std::string ClassName;
    std::string ParentClassName;
    size_t Size;
    std::vector<PropertyMetadata> Properties;
    std::function<void*()> FactoryConstructor;
};

// ==========================================
// REGISTRATION MACROS
// ==========================================

#define REFLECT_CLASS(ClassType, ParentType) \
public: \
    using Super = ParentType; \
    static const Vanguard::Reflection::ClassMetadata& StaticClass(); \
    virtual const Vanguard::Reflection::ClassMetadata& GetClass() const { return StaticClass(); }

#define BEGIN_CLASS_REFLECTION(ClassType, ParentType) \
const Vanguard::Reflection::ClassMetadata& ClassType::StaticClass() { \
    static Vanguard::Reflection::ClassMetadata s_Meta = []() { \
        Vanguard::Reflection::ClassMetadata meta; \
        meta.ClassName = #ClassType; \
        meta.ParentClassName = #ParentType; \
        meta.Size = sizeof(ClassType); \
        meta.FactoryConstructor = []() -> void* { return new ClassType(); };

#define REFLECT_PROPERTY(ClassType, MemberVar, DisplayName, Category, Tooltip) \
        { \
            Vanguard::Reflection::PropertyMetadata prop; \
            prop.Name = #MemberVar; \
            prop.DisplayName = DisplayName; \
            prop.Type = Vanguard::Reflection::ResolveTypeKind<decltype(ClassType::MemberVar)>(); \
            prop.Offset = offsetof(ClassType, MemberVar); \
            prop.Size = sizeof(ClassType::MemberVar); \
            prop.Category = Category; \
            prop.Tooltip = Tooltip; \
            meta.Properties.push_back(std::move(prop)); \
        }

#define REFLECT_PROPERTY_RANGE(ClassType, MemberVar, DisplayName, Category, MinVal, MaxVal, StepVal) \
        { \
            Vanguard::Reflection::PropertyMetadata prop; \
            prop.Name = #MemberVar; \
            prop.DisplayName = DisplayName; \
            prop.Type = Vanguard::Reflection::ResolveTypeKind<decltype(ClassType::MemberVar)>(); \
            prop.Offset = offsetof(ClassType, MemberVar); \
            prop.Size = sizeof(ClassType::MemberVar); \
            prop.Category = Category; \
            prop.Min = static_cast<float>(MinVal); \
            prop.Max = static_cast<float>(MaxVal); \
            prop.Step = static_cast<float>(StepVal); \
            meta.Properties.push_back(std::move(prop)); \
        }

#define END_CLASS_REFLECTION() \
        Vanguard::Reflection::ReflectionRegistry::Get().RegisterClass(meta); \
        return meta; \
    }(); \
    return s_Meta; \
}

} // namespace Vanguard::Reflection