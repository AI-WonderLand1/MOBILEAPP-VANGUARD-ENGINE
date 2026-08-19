cmake_minimum_required(VERSION 3.22)
project(VanguardAndroid LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(NDK_ROOT $ENV{ANDROID_NDK_HOME})

# Source paths relative to this file (Platform/Android/app/src/main/cpp)
set(REPO_ROOT ${CMAKE_CURRENT_SOURCE_DIR}/../../../../..)
set(PLATFORM_ANDROID_DIR ${REPO_ROOT}/Platform/Android)
set(PLATFORM_DESKTOP_DIR ${REPO_ROOT}/Platform/Desktop)
set(INCLUDE_DIR ${REPO_ROOT}/Include)
set(SOURCE_DIR ${REPO_ROOT}/Source)

# Include directories
include_directories(
    ${INCLUDE_DIR}
    ${SOURCE_DIR}
    ${PLATFORM_ANDROID_DIR}/Include
    ${PLATFORM_DESKTOP_DIR}/Include
    ${NDK_ROOT}/sysroot/usr/include
    ${NDK_ROOT}/sources/android/native_app_glue
)

# Android native_app_glue (from NDK sources)
set(NATIVE_APP_GLUE ${NDK_ROOT}/sources/android/native_app_glue/android_native_app_glue.c)

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
    ${SOURCE_DIR}/Core/Window.cpp  # Keep for desktop fallback
    ${SOURCE_DIR}/RHI/VulkanContext.cpp
    ${SOURCE_DIR}/RHI/VulkanSwapchain.cpp
    ${SOURCE_DIR}/RenderGraph/RenderGraph.cpp
    ${SOURCE_DIR}/RenderGraph/BarrierCompiler.cpp
)

# Android-specific sources
set(ANDROID_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/android_main.cpp
    ${PLATFORM_ANDROID_DIR}/Source/Platform/Android/WindowAndroid.cpp
    ${NATIVE_APP_GLUE}
)

# Desktop sources (for fallback/simulator)
set(DESKTOP_SOURCES
    ${PLATFORM_DESKTOP_DIR}/Source/Platform/Desktop/WindowSDL.cpp
)

# Link libraries
set(ANDROID_LIBS android log dl EGL GLESv3 vulkan)

# Vanguard native library
add_library(vanguard SHARED
    ${CORE_SOURCES}
    ${ANDROID_SOURCES}
    ${DESKTOP_SOURCES}
)

target_link_libraries(vanguard PRIVATE ${ANDROID_LIBS})

# Compiler options for shared core
target_compile_options(vanguard PRIVATE
    -Wall -Wextra -Wpedantic -Wno-invalid-offsetof
    -fno-rtti -fno-exceptions
    -DVANGUARD_PLATFORM_ANDROID
    -DVANGUARD_ENABLE_PROFILING=0
)

# Android CMake properties
set_target_properties(vanguard PROPERTIES
    ANDROID_SDK_VERSION 24
    ANDROID_NATIVE_API_LEVEL 24
)