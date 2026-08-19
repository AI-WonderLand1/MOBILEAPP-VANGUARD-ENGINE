cmake_minimum_required(VERSION 3.22)
project(VanguardPlatformDesktop LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(SDL3 REQUIRED CONFIG)

add_library(VanguardPlatformDesktop STATIC
    Source/Platform/Desktop/WindowSDL.cpp
)

target_include_directories(VanguardPlatformDesktop PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../Include>
    $<INSTALL_INTERFACE:include>
)

target_link_libraries(VanguardPlatformDesktop PUBLIC
    SDL3::SDL3
)

target_compile_options(VanguardPlatformDesktop PRIVATE
    -Wall -Wextra -Wpedantic -Wno-invalid-offsetof
)

add_library(VanguardPlatformDesktopShared SHARED
    $<TARGET_OBJECTS:VanguardPlatformDesktop>
)

set_target_properties(VanguardPlatformDesktopShared PROPERTIES
    OUTPUT_NAME VanguardPlatformDesktop
    POSITION_INDEPENDENT_CODE ON
)