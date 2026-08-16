#pragma once
#include <array>
#include <cstdint>
#include <string>
#include <string_view>
#include <type_traits>
#include <glm/glm.hpp>

namespace Vanguard::Reflection {

// ==========================================
// Runtime Property Schema Enum
// ==========================================
enum class TypeKind : uint8_t {
    Int32,
    Float,
    Bool,
    Vec2,
    Vec3,
    Vec4,
    Quat,
    Color3,
    Color4,
    String,
    AssetHandle,
    Enum
};

// ==========================================
// Static Type-to-Schema Resolution
// ==========================================

namespace detail {

template<typename T>
struct TypeKindResolver;

template<>
struct TypeKindResolver<int32_t> {
    static constexpr TypeKind Value = TypeKind::Int32;
};

template<>
struct TypeKindResolver<float> {
    static constexpr TypeKind Value = TypeKind::Float;
};

template<>
struct TypeKindResolver<bool> {
    static constexpr TypeKind Value = TypeKind::Bool;
};

template<>
struct TypeKindResolver<glm::vec2> {
    static constexpr TypeKind Value = TypeKind::Vec2;
};

template<>
struct TypeKindResolver<glm::vec3> {
    static constexpr TypeKind Value = TypeKind::Vec3;
};

template<>
struct TypeKindResolver<glm::vec4> {
    static constexpr TypeKind Value = TypeKind::Vec4;
};

template<>
struct TypeKindResolver<glm::quat> {
    static constexpr TypeKind Value = TypeKind::Quat;
};

template<>
struct TypeKindResolver<std::string> {
    static constexpr TypeKind Value = TypeKind::String;
};

template<>
struct TypeKindResolver<std::string_view> {
    static constexpr TypeKind Value = TypeKind::String;
};

template<typename T, size_t N>
struct TypeKindResolver<std::array<T, N>> {
    static constexpr TypeKind Value = TypeKindResolver<T>::Value;
};

} // namespace detail

// Public resolution entry point used by the REFLECT_PROPERTY macros:
//     prop.Type = ResolveTypeKind<decltype(ClassType::MemberVar)>();
template<typename T>
constexpr TypeKind ResolveTypeKind() {
    return detail::TypeKindResolver<std::remove_cv_t<std::remove_reference_t<T>>>::Value;
}

} // namespace Vanguard::Reflection