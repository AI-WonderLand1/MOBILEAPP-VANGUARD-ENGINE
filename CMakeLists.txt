cmake_minimum_required(VERSION 3.28)
project(VanguardEngine VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Configure Tracy Profiler Options
option(VANGUARD_ENABLE_PROFILING "Enable Tracy CPU/GPU Profiling instrumentation" ON)
if(VANGUARD_ENABLE_PROFILING)
    add_compile_definitions(TRACY_ENABLE TRACY_ON_DEMAND)
endif()

# Find Third-Party Dependencies (via vcpkg / Conan / System)
find_package(Vulkan REQUIRED)
find_package(SDL3 REQUIRED CONFIG)
find_package(glm REQUIRED CONFIG)
find_package(Jolt REQUIRED CONFIG)
find_package(imgui REQUIRED CONFIG)
find_package(Tracy REQUIRED CONFIG)

# ==========================================
# 1. Engine Core Target (Core / RHI / Scene / Physics)
# ==========================================
add_library(VanguardEngine STATIC
    Source/Core/Engine.cpp
    Source/Core/Window.cpp
    Source/Reflection/ReflectionRegistry.cpp
    Source/Scene/Actor.cpp
    Source/Scene/SceneGraph.cpp
    Source/Physics/PhysicsSystem.cpp
    Source/RHI/VulkanContext.cpp
    Source/RenderGraph/RenderGraph.cpp
    Source/RenderGraph/BarrierCompiler.cpp
    Source/Asset/AssetRegistry.cpp
    Source/Asset/MeshBaker.cpp
)

target_include_directories(VanguardEngine PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/Include>
    $<INSTALL_INTERFACE:include>
)

target_link_libraries(VanguardEngine PUBLIC
    Vulkan::Vulkan
    SDL3::SDL3
    glm::glm
    Jolt::Jolt
    Tracy::TracyClient
)

# ==========================================
# 2. Vanguard Editor Target (Dear ImGui Docking & Tooling)
# ==========================================
add_executable(VanguardEditor
    Source/Editor/Main.cpp
    Source/Editor/EditorLayer.cpp
    Source/Editor/PropertyInspector.cpp
    Source/Editor/GizmoController.cpp
    Source/Editor/NodeEditorGraph.cpp
)

target_link_libraries(VanguardEditor PRIVATE
    VanguardEngine
    imgui::imgui
)

# Compiler Warning Flags (Clang / GCC / MSVC)
if(MSVC)
    target_compile_options(VanguardEngine PRIVATE /W4 /permissive- /Zc:preprocessor)
    target_compile_options(VanguardEditor PRIVATE /W4 /permissive- /Zc:preprocessor)
else()
    target_compile_options(VanguardEngine PRIVATE -Wall -Wextra -Wpedantic)
    target_compile_options(VanguardEditor PRIVATE -Wall -Wextra -Wpedantic)
endif()
