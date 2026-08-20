cmake_minimum_required(VERSION 3.22.1)

project(vanguard LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Android native app glue
find_library(android android)
find_library(log log)
find_library(EGL EGL)
find_library(GLESv3 GLESv3)
find_library(vulkan vulkan)

# Source directories
set(SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../Source")
set(PLATFORM_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../Platform")
set(INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../Include")

# Fetch GLM (header-only math library)
include(FetchContent)
FetchContent_Declare(
    glm
    GIT_REPOSITORY https://github.com/g-truc/glm.git
    GIT_TAG 0.9.9.8
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(glm)

# Fetch Tracy (header-only profiler)
FetchContent_Declare(
    tracy
    GIT_REPOSITORY https://github.com/wolfpld/tracy.git
    GIT_TAG v0.11.1
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(tracy)

# Shared core sources (platform-neutral)
set(CORE_SOURCES
    ${SOURCE_DIR}/Reflection/ReflectionRegistry.cpp
    ${SOURCE_DIR}/Scene/Actor.cpp
    ${SOURCE_DIR}/Scene/SceneGraph.cpp
    ${SOURCE_DIR}/Scene/Components/StaticMeshComponent.cpp
    ${SOURCE_DIR}/Physics/PhysicsSystem.cpp
    ${SOURCE_DIR}/Asset/AssetRegistry.cpp
    ${SOURCE_DIR}/Asset/MeshBaker.cpp
    ${SOURCE_DIR}/Editor/EditorLayer.cpp
    ${SOURCE_DIR}/Editor/PropertyInspector.cpp
    ${SOURCE_DIR}/Editor/GizmoController.cpp
    ${SOURCE_DIR}/Editor/NodeEditorGraph.cpp
    ${SOURCE_DIR}/Core/Engine.cpp
    ${SOURCE_DIR}/Core/Window.cpp
    ${SOURCE_DIR}/RHI/VulkanContext.cpp
    ${SOURCE_DIR}/RHI/VulkanSwapchain.cpp
    ${SOURCE_DIR}/RenderGraph/RenderGraph.cpp
    ${SOURCE_DIR}/RenderGraph/BarrierCompiler.cpp
    ${PLATFORM_DIR}/Platform.cpp
    ${SOURCE_DIR}/Platform/Desktop/WindowSDL.cpp
)

# Android-specific sources
set(ANDROID_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/android_main.cpp
    ${SOURCE_DIR}/Platform/Android/WindowAndroid.cpp
)

# Create shared library
add_library(vanguard SHARED
    ${CORE_SOURCES}
    ${ANDROID_SOURCES}
)

target_include_directories(vanguard PRIVATE
    ${INCLUDE_DIR}
    ${SOURCE_DIR}
    ${PLATFORM_DIR}
    ${PLATFORM_DIR}/Desktop
    ${SOURCE_DIR}/Platform
    ${glm_SOURCE_DIR}
    ${tracy_SOURCE_DIR}
)

target_link_libraries(vanguard
    ${android}
    ${log}
    ${EGL}
    ${GLESv3}
    ${vulkan}
)

target_compile_options(vanguard PRIVATE
    -std=c++23
    -DANDROID
    -DVANGUARD_PLATFORM_ANDROID=1
    -DVULKAN_HPP_DISPATCH_LOADER_DYNAMIC=1
    -DTRACY_ENABLE=1
)