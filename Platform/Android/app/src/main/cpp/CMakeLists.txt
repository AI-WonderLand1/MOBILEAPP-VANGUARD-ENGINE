cmake_minimum_required(VERSION 3.22.1)

project(vanguard_gpu LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Android native app glue + Vulkan
find_library(android android)
find_library(log log)
find_library(EGL EGL)
find_library(vulkan vulkan)

# Minimal Vulkan renderer sources
set(SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/vulkan_renderer.cpp
)

add_library(vanguard_gpu SHARED ${SOURCES})

target_include_directories(vanguard_gpu PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
)

target_link_libraries(vanguard_gpu
    ${android}
    ${log}
    ${EGL}
    ${vulkan}
)

target_compile_options(vanguard_gpu PRIVATE
    -std=c++23
    -DANDROID
    -DVK_USE_PLATFORM_ANDROID_KHR
    -DVULKAN_HPP_DISPATCH_LOADER_DYNAMIC=1
    -Wall -Wextra
)