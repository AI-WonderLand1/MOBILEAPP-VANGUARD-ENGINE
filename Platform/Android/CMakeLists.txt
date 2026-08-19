cmake_minimum_required(VERSION 3.22)
project(VanguardPlatformAndroid LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(NDK_ROOT $ENV{ANDROID_NDK_HOME})

set(NATIVE_APP_GLUE ${NDK_ROOT}/sources/android/native_app_glue/android_native_app_glue.c)

add_library(VanguardPlatformAndroid STATIC
    Source/Platform/Android/WindowAndroid.cpp
    ${NATIVE_APP_GLUE}
)

target_include_directories(VanguardPlatformAndroid PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../Include>
    $<INSTALL_INTERFACE:include>
    ${NDK_ROOT}/sysroot/usr/include
    ${NDK_ROOT}/sources/android/native_app_glue
)

target_link_libraries(VanguardPlatformAndroid PRIVATE
    android
    log
    dl
)

target_compile_options(VanguardPlatformAndroid PRIVATE
    -Wall -Wextra -Wpedantic -Wno-invalid-offsetof
    -DVANGUARD_PLATFORM_ANDROID
)

add_library(VanguardPlatformAndroidShared SHARED
    $<TARGET_OBJECTS:VanguardPlatformAndroid>
)

set_target_properties(VanguardPlatformAndroidShared PROPERTIES
    OUTPUT_NAME VanguardPlatformAndroid
    POSITION_INDEPENDENT_CODE ON
)