cmake_minimum_required(VERSION 3.22)
project(VanguardAndroid LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Android NDK paths
set(NDK_ROOT $ENV{ANDROID_NDK_HOME})

# Source paths relative to this file (Platform/Android/app/src/main/cpp)
set(REPO_ROOT ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../..)
set(INCLUDE_DIR ${REPO_ROOT}/Include)
set(SOURCE_DIR ${REPO_ROOT}/Source)

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
)

# Android-specific sources (empty for M0; will add in M1)
set(ANDROID_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/android_main.cpp
)

# Include directories
include_directories(
    ${INCLUDE_DIR}
    ${SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${NDK_ROOT}/sysroot/usr/include
)

# Android native_app_glue (from NDK sources)
set(NATIVE_APP_GLUE ${NDK_ROOT}/sources/android/native_app_glue/android_native_app_glue.c)

# Link libraries
set(ANDROID_LIBS android log dl EGL GLESv3)

# Vanguard native library
add_library(vanguard SHARED
    ${CORE_SOURCES}
    ${ANDROID_SOURCES}
    ${NATIVE_APP_GLUE}
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