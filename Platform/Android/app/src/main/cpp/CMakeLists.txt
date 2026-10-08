cmake_minimum_required(VERSION 3.22.1)

project(vanguard_gpu LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Android native app glue + Vulkan
find_library(android android)
find_library(log log)
find_library(EGL EGL)
find_library(vulkan vulkan)

# Minimal Vulkan renderer sources
set(NATIVE_APP_GLUE_DIR "${CMAKE_ANDROID_NDK}/sources/android/native_app_glue")
if(NOT EXISTS "${NATIVE_APP_GLUE_DIR}/android_native_app_glue.c")
    message(FATAL_ERROR "Android NDK native_app_glue.c not found: ${NATIVE_APP_GLUE_DIR}")
endif()

set(SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/vulkan_renderer.cpp
    ${NATIVE_APP_GLUE_DIR}/android_native_app_glue.c
)

add_library(vanguard_gpu SHARED ${SOURCES})
# Java NativeActivity and AndroidManifest both load libvanguard.so.
set_target_properties(vanguard_gpu PROPERTIES OUTPUT_NAME vanguard)

target_include_directories(vanguard_gpu PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${NATIVE_APP_GLUE_DIR}
)

target_link_libraries(vanguard_gpu
    ${android}
    ${log}
    ${EGL}
    ${vulkan}
)

target_compile_options(vanguard_gpu PRIVATE
    $<$<COMPILE_LANGUAGE:CXX>:-std=c++23>
    -DANDROID
    -DVK_USE_PLATFORM_ANDROID_KHR
    -DVULKAN_HPP_DISPATCH_LOADER_DYNAMIC=1
    -Wall -Wextra
)