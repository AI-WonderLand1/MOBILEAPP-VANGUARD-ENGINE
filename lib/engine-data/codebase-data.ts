import { CodeFile } from "./types";

export const ENGINE_CODEBASE: CodeFile[] = [
  // ==========================================
  // PHASE 1: ENVIRONMENT & PROJECT SETUP
  // ==========================================
  {
    id: "phase1-cmake",
    title: "Root CMake Build System",
    phase: 1,
    phaseName: "Phase 1: Environment & Project Setup",
    filename: "CMakeLists.txt",
    type: "cmake",
    language: "cmake",
    category: "Build System",
    description: "Modular CMake setup partitioning the codebase into Engine (Static/Shared), Editor (Tooling Executable), and GameApp runtime targets.",
    code: `cmake_minimum_required(VERSION 3.28)
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
    $<BUILD_INTERFACE:\${CMAKE_CURRENT_SOURCE_DIR}/Include>
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
endif()`,
    architecturalNotes: [
      "Strict C++23 standard enforcement enables modern std::span, std::expected, and modular compile-time traits.",
      "Separation between VanguardEngine (Static Lib) and VanguardEditor (Executable) ensures clean headless dedicated server builds without Dear ImGui dependencies.",
      "Tracy Profiler macros are conditionally injected via target-level preprocessor definitions.",
    ],
  },

  {
    id: "phase1-window-h",
    title: "Window & Input Abstraction (SDL3)",
    phase: 1,
    phaseName: "Phase 1: Environment & Project Setup",
    filename: "Include/Core/Window.h",
    type: "header",
    language: "cpp",
    category: "Windowing & Input",
    description: "RAII-managed SDL3 window lifecycle wrapper with high-frequency event polling, raw mouse motion, and Vulkan surface generation.",
    code: `#pragma once
#include <string>
#include <functional>
#include <vulkan/vulkan.h>
#include <SDL3/SDL.h>

namespace Vanguard {

struct WindowConfig {
    std::string Title = "Vanguard Engine [Vulkan 1.3]";
    uint32_t Width = 1920;
    uint32_t Height = 1080;
    bool bFullscreen = false;
    bool bResizable = true;
    bool bEnableVulkan = true;
};

class Window {
public:
    explicit Window(const WindowConfig& config);
    ~Window();

    Window(const Window&) = delete;
    Window& operator=(const Window&) = delete;
    Window(Window&&) noexcept;
    Window& operator=(Window&&) noexcept;

    bool PollEvents();
    bool ShouldClose() const noexcept { return m_bShouldClose; }
    
    // Low-level Vulkan Surface Factory
    VkResult CreateVulkanSurface(VkInstance instance, const VkAllocationCallbacks* allocator, VkSurfaceKHR* surface) const;

    [[nodiscard]] SDL_Window* GetNativeHandle() const noexcept { return m_WindowHandle; }
    [[nodiscard]] uint32_t GetWidth() const noexcept { return m_Width; }
    [[nodiscard]] uint32_t GetHeight() const noexcept { return m_Height; }

    void SetEventCallback(std::function<void(const SDL_Event&)> callback) { m_EventCallback = std::move(callback); }

private:
    SDL_Window* m_WindowHandle = nullptr;
    uint32_t m_Width = 1920;
    uint32_t m_Height = 1080;
    bool m_bShouldClose = false;
    std::function<void(const SDL_Event&)> m_EventCallback;
};

} // namespace Vanguard`,
    architecturalNotes: [
      "Encapsulates SDL3 initialization and window destruction in a strict RAII boundary.",
      "Integrates with `SDL_Vulkan_CreateSurface` to bridge native OS window handles directly to Vulkan KHR surfaces.",
      "Event dispatching uses lightweight callback hooks to pipe input events into ImGui and gameplay subsystems.",
    ],
  },

  {
    id: "phase1-window-cpp",
    title: "Window & Input Implementation (SDL3)",
    phase: 1,
    phaseName: "Phase 1: Environment & Project Setup",
    filename: "Source/Core/Window.cpp",
    type: "source",
    language: "cpp",
    category: "Windowing & Input",
    description: "SDL3 event loop implementation with Tracy profiler zones and high-resolution resize dispatching.",
    code: `#include "Core/Window.h"
#include <SDL3/SDL_vulkan.h>
#include <stdexcept>
#include <tracy/Tracy.hpp>

namespace Vanguard {

Window::Window(const WindowConfig& config)
    : m_Width(config.Width), m_Height(config.Height) {
    ZoneScopedN("Window::Initialize");

    if (!SDL_Init(SDL_INIT_VIDEO | SDL_INIT_GAMEPAD)) {
        throw std::runtime_error(std::string("SDL3 Init Failed: ") + SDL_GetError());
    }

    SDL_WindowFlags flags = 0;
    if (config.bEnableVulkan) flags |= SDL_WINDOW_VULKAN;
    if (config.bResizable)    flags |= SDL_WINDOW_RESIZABLE;
    if (config.bFullscreen)   flags |= SDL_WINDOW_FULLSCREEN;
    flags |= SDL_WINDOW_HIGH_PIXEL_DENSITY;

    m_WindowHandle = SDL_CreateWindow(
        config.Title.c_str(),
        static_cast<int>(config.Width),
        static_cast<int>(config.Height),
        flags
    );

    if (!m_WindowHandle) {
        throw std::runtime_error(std::string("Failed to create SDL3 window: ") + SDL_GetError());
    }
}

Window::~Window() {
    if (m_WindowHandle) {
        SDL_DestroyWindow(m_WindowHandle);
        m_WindowHandle = nullptr;
    }
    SDL_Quit();
}

bool Window::PollEvents() {
    ZoneScopedN("Window::PollEvents");
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_EVENT_QUIT) {
            m_bShouldClose = true;
        } else if (event.type == SDL_EVENT_WINDOW_RESIZED) {
            m_Width = static_cast<uint32_t>(event.window.data1);
            m_Height = static_cast<uint32_t>(event.window.data2);
        }

        if (m_EventCallback) {
            m_EventCallback(event);
        }
    }
    return !m_bShouldClose;
}

VkResult Window::CreateVulkanSurface(VkInstance instance, const VkAllocationCallbacks* allocator, VkSurfaceKHR* surface) const {
    ZoneScopedN("Window::CreateVulkanSurface");
    if (!SDL_Vulkan_CreateSurface(m_WindowHandle, instance, allocator, surface)) {
        return VK_ERROR_INITIALIZATION_FAILED;
    }
    return VK_SUCCESS;
}

} // namespace Vanguard`,
    architecturalNotes: [
      "ZoneScopedN instrumentation tags allow Tracy to monitor OS event queue latency in real-time.",
      "High DPI flag support ensures Retina and 4K viewport scaling matches pixel density.",
    ],
  },

  {
    id: "phase1-physics-h",
    title: "Jolt Physics Subsystem Header",
    phase: 1,
    phaseName: "Phase 1: Environment & Project Setup",
    filename: "Include/Physics/PhysicsSystem.h",
    type: "header",
    language: "cpp",
    category: "Math & Physics",
    description: "Jolt Physics integration with custom Allocator, JobSystem job scheduler, and multi-layered BroadPhase filter tables.",
    code: `#pragma once
#include <glm/glm.hpp>
#include <Jolt/Jolt.h>
#include <Jolt/Physics/PhysicsSystem.h>
#include <Jolt/Core/JobSystemThreadPool.h>
#include <Jolt/Physics/Body/BodyInterface.h>
#include <memory>

namespace Vanguard {

namespace CollisionLayers {
    static constexpr JPH::ObjectLayer NON_MOVING = 0;
    static constexpr JPH::ObjectLayer MOVING     = 1;
    static constexpr JPH::ObjectLayer DEBRIS     = 2;
    static constexpr JPH::ObjectLayer SENSOR     = 3;
    static constexpr JPH::ObjectLayer NUM_LAYERS = 4;
}

namespace BroadPhaseLayers {
    static constexpr JPH::BroadPhaseLayer NON_MOVING(0);
    static constexpr JPH::BroadPhaseLayer MOVING(1);
    static constexpr JPH::BroadPhaseLayer DEBRIS(2);
    static constexpr JPH::BroadPhaseLayer SENSOR(3);
    static constexpr uint32_t NUM_LAYERS = 4;
}

class PhysicsSystem {
public:
    PhysicsSystem();
    ~PhysicsSystem();

    void Initialize();
    void Shutdown();

    // Fixed timestep substep update
    void Update(float deltaTime);

    // Body Lifecycle Helpers
    JPH::BodyID CreateBoxBody(const glm::vec3& position, const glm::vec3& halfExtent, JPH::EMotionType motionType, JPH::ObjectLayer layer);
    JPH::BodyID CreateSphereBody(const glm::vec3& position, float radius, JPH::EMotionType motionType, JPH::ObjectLayer layer);
    void DestroyBody(JPH::BodyID bodyID);

    // Forces and Impulses
    void AddImpulse(JPH::BodyID bodyID, const glm::vec3& impulse);
    glm::vec3 GetBodyPosition(JPH::BodyID bodyID) const;
    glm::vec4 GetBodyRotationQuat(JPH::BodyID bodyID) const;

    [[nodiscard]] JPH::BodyInterface& GetBodyInterface() noexcept { return m_PhysicsSystem->GetBodyInterface(); }

private:
    std::unique_ptr<JPH::PhysicsSystem> m_PhysicsSystem;
    std::unique_ptr<JPH::JobSystemThreadPool> m_JobSystem;
    std::unique_ptr<JPH::TempAllocatorImpl> m_TempAllocator;

    // Layer Interface Bindings
    std::unique_ptr<JPH::BroadPhaseLayerInterface> m_BroadPhaseLayerInterface;
    std::unique_ptr<JPH::ObjectVsBroadPhaseLayerFilter> m_ObjectVsBroadPhaseFilter;
    std::unique_ptr<JPH::ObjectLayerPairFilter> m_ObjectVsObjectFilter;

    static constexpr uint32_t c_MaxBodies = 65536;
    static constexpr uint32_t c_NumBodyMutexes = 0; // Default
    static constexpr uint32_t c_MaxBodyPairs = 65536;
    static constexpr uint32_t c_MaxContactConstraints = 16384;
};

} // namespace Vanguard`,
    architecturalNotes: [
      "Jolt Physics provides multi-threaded lock-free rigid body simulation outperforming legacy solvers.",
      "Custom ObjectLayer vs BroadPhaseLayer pairing minimizes collision broadphase checks.",
      "Preallocated TempAllocator (16MB) guarantees zero dynamic heap allocations during high-frequency physics ticks.",
    ],
  },

  // ==========================================
  // PHASE 2: CORE ARCHITECTURE & REFLECTION
  // ==========================================
  {
    id: "phase2-engine-h",
    title: "Core Application Loop & Subsystems",
    phase: 2,
    phaseName: "Phase 2: Core Engine Architecture",
    filename: "Include/Core/Engine.h",
    type: "header",
    language: "cpp",
    category: "Core Engine",
    description: "The primary engine driver managing high-resolution chrono timers, fixed physics substeps, and frame tick sequences.",
    code: `#pragma once
#include <memory>
#include <chrono>
#include "Core/Window.h"
#include "Physics/PhysicsSystem.h"

namespace Vanguard {

class SceneGraph;
class RenderGraph;
class VulkanContext;
class EditorLayer;

class Engine {
public:
    static Engine& Get() { static Engine instance; return instance; }

    void Initialize();
    void Run();
    void Shutdown();

    [[nodiscard]] Window& GetWindow() noexcept { return *m_Window; }
    [[nodiscard]] PhysicsSystem& GetPhysics() noexcept { return *m_PhysicsSystem; }
    [[nodiscard]] SceneGraph& GetSceneGraph() noexcept { return *m_SceneGraph; }
    [[nodiscard]] float GetDeltaTime() const noexcept { return m_DeltaTime; }
    [[nodiscard]] double GetTotalTime() const noexcept { return m_TotalTime; }

private:
    Engine() = default;
    ~Engine() = default;

    void ProcessInput();
    void Tick(float deltaTime);
    void RenderFrame();

    std::unique_ptr<Window> m_Window;
    std::unique_ptr<VulkanContext> m_VulkanContext;
    std::unique_ptr<PhysicsSystem> m_PhysicsSystem;
    std::unique_ptr<SceneGraph> m_SceneGraph;
    std::unique_ptr<EditorLayer> m_EditorLayer;

    float m_DeltaTime = 0.01667f;
    double m_TotalTime = 0.0;
    float m_PhysicsAccumulator = 0.0f;
    static constexpr float c_FixedPhysicsTimeStep = 1.0f / 60.0f; // 60Hz
};

} // namespace Vanguard`,
    architecturalNotes: [
      "Employs a fixed-timestep accumulator pattern for physics to prevent simulation instability on variable frame rates.",
      "Clean singleton accessor allows subsystems to resolve window metrics and scene contexts without global pollution.",
    ],
  },

  {
    id: "phase2-reflection-macros",
    title: "Reflection System: Macros & Schema",
    phase: 2,
    phaseName: "Phase 2: Core Engine Architecture",
    filename: "Include/Reflection/Macros.h",
    type: "header",
    language: "cpp",
    category: "Reflection System",
    description: "Lightweight macro-based reflection architecture calculating standard layout byte offsets with zero runtime overhead.",
    code: `#pragma once
#include <string>
#include <vector>
#include <cstddef>
#include <functional>
#include <glm/glm.hpp>
#include "Reflection/TypeTraits.h"

namespace Vanguard::Reflection {

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

#define REFLECT_CLASS(ClassType, ParentType) \\
public: \\
    using Super = ParentType; \\
    static const Vanguard::Reflection::ClassMetadata& StaticClass(); \\
    virtual const Vanguard::Reflection::ClassMetadata& GetClass() const override { return StaticClass(); }

#define BEGIN_CLASS_REFLECTION(ClassType, ParentType) \\
const Vanguard::Reflection::ClassMetadata& ClassType::StaticClass() { \\
    static Vanguard::Reflection::ClassMetadata s_Meta = []() { \\
        Vanguard::Reflection::ClassMetadata meta; \\
        meta.ClassName = #ClassType; \\
        meta.ParentClassName = #ParentType; \\
        meta.Size = sizeof(ClassType); \\
        meta.FactoryConstructor = []() -> void* { return new ClassType(); };

#define REFLECT_PROPERTY(ClassType, MemberVar, DisplayName, Category, Tooltip) \\
        { \\
            Vanguard::Reflection::PropertyMetadata prop; \\
            prop.Name = #MemberVar; \\
            prop.DisplayName = DisplayName; \\
            prop.Type = Vanguard::Reflection::ResolveTypeKind<decltype(ClassType::MemberVar)>(); \\
            prop.Offset = offsetof(ClassType, MemberVar); \\
            prop.Size = sizeof(ClassType::MemberVar); \\
            prop.Category = Category; \\
            prop.Tooltip = Tooltip; \\
            meta.Properties.push_back(std::move(prop)); \\
        }

#define REFLECT_PROPERTY_RANGE(ClassType, MemberVar, DisplayName, Category, MinVal, MaxVal, StepVal) \\
        { \\
            Vanguard::Reflection::PropertyMetadata prop; \\
            prop.Name = #MemberVar; \\
            prop.DisplayName = DisplayName; \\
            prop.Type = Vanguard::Reflection::ResolveTypeKind<decltype(ClassType::MemberVar)>(); \\
            prop.Offset = offsetof(ClassType, MemberVar); \\
            prop.Size = sizeof(ClassType::MemberVar); \\
            prop.Category = Category; \\
            prop.Min = static_cast<float>(MinVal); \\
            prop.Max = static_cast<float>(MaxVal); \\
            prop.Step = static_cast<float>(StepVal); \\
            meta.Properties.push_back(std::move(prop)); \\
        }

#define END_CLASS_REFLECTION() \\
        Vanguard::Reflection::ReflectionRegistry::Get().RegisterClass(meta); \\
        return meta; \\
    }(); \\
    return s_Meta; \\
}

} // namespace Vanguard::Reflection`,
    architecturalNotes: [
      "`offsetof(ClassType, MemberVar)` calculates compile-time byte offsets with zero runtime cost for standard-layout classes.",
      "`ResolveTypeKind<T>()` leverages template specialization to map C++ types (float, glm::vec3, bool) to runtime schema enums.",
      "Static initialization lambda auto-registers class metadata into the central registry during engine bootstrap.",
    ],
  },

  {
    id: "phase2-component-sample",
    title: "Reflected Component: Transform & Mesh",
    phase: 2,
    phaseName: "Phase 2: Core Engine Architecture",
    filename: "Source/Scene/Components/StaticMeshComponent.cpp",
    type: "source",
    language: "cpp",
    category: "Scene & Components",
    description: "Concrete component implementation demonstrating class reflection macro integration.",
    code: `#include "Scene/Components/StaticMeshComponent.h"
#include "Reflection/Macros.h"

namespace Vanguard {

BEGIN_CLASS_REFLECTION(StaticMeshComponent, Component)
    REFLECT_PROPERTY(StaticMeshComponent, m_MeshAssetGUID, "Mesh Asset", "Geometry", "GUID of compiled .vmesh")
    REFLECT_PROPERTY(StaticMeshComponent, m_MaterialAssetGUID, "Material", "Shading", "PBR Material GUID")
    REFLECT_PROPERTY(StaticMeshComponent, m_bCastShadows, "Cast Shadows", "Lighting", "Enable shadow caster rendering")
    REFLECT_PROPERTY_RANGE(StaticMeshComponent, m_RoughnessMultiplier, "Roughness Mult", "PBR Overrides", 0.0f, 1.0f, 0.01f)
    REFLECT_PROPERTY_RANGE(StaticMeshComponent, m_MetallicMultiplier, "Metallic Mult", "PBR Overrides", 0.0f, 1.0f, 0.01f)
    REFLECT_PROPERTY(StaticMeshComponent, m_BaseColorTint, "Base Color Tint", "PBR Overrides", "HDR linear tint")
END_CLASS_REFLECTION()

StaticMeshComponent::StaticMeshComponent() = default;
StaticMeshComponent::~StaticMeshComponent() = default;

} // namespace Vanguard`,
    architecturalNotes: [
      "Developers declare reflection in .cpp without polluting game headers with registry instantiation logic.",
      "Properties are categorized for clean grouped rendering inside the Dear ImGui Property Inspector.",
    ],
  },

  {
    id: "phase2-imgui-inspector-binding",
    title: "Reflection to Dear ImGui Binding Engine",
    phase: 2,
    phaseName: "Phase 2: Core Engine Architecture",
    filename: "Source/Editor/PropertyInspector.cpp",
    type: "source",
    language: "cpp",
    category: "Editor Binding",
    description: "Automated Dear ImGui Inspector widget generator that dereferences raw memory addresses using recorded byte offsets.",
    code: `#include "Editor/PropertyInspector.h"
#include "Reflection/ReflectionRegistry.h"
#include <imgui.h>
#include <glm/gtc/type_ptr.hpp>

namespace Vanguard::Editor {

void PropertyInspector::RenderComponentUI(void* componentInstance, const Reflection::ClassMetadata& meta) {
    if (!componentInstance) return;

    ImGui::PushID(componentInstance);
    
    // Group properties by category
    std::string currentCategory = "";
    bool bCategoryOpen = true;

    for (const auto& prop : meta.Properties) {
        if (prop.Category != currentCategory) {
            if (!currentCategory.empty() && bCategoryOpen) {
                ImGui::TreePop();
            }
            currentCategory = prop.Category;
            bCategoryOpen = ImGui::TreeNodeEx(currentCategory.c_str(), ImGuiTreeNodeFlags_DefaultOpen);
        }

        if (!bCategoryOpen) continue;

        // Calculate raw memory address for this property:
        // Ptr = (char*)componentInstance + prop.Offset
        void* propAddress = static_cast<char*>(componentInstance) + prop.Offset;

        ImGui::PushID(prop.Name.c_str());
        
        switch (prop.Type) {
            case Reflection::TypeKind::Float: {
                auto* val = static_cast<float*>(propAddress);
                if (prop.Max > prop.Min) {
                    ImGui::SliderFloat(prop.DisplayName.c_str(), val, prop.Min, prop.Max, "%.2f");
                } else {
                    ImGui::DragFloat(prop.DisplayName.c_str(), val, prop.Step, prop.Min, prop.Max, "%.2f");
                }
                break;
            }
            case Reflection::TypeKind::Bool: {
                auto* val = static_cast<bool*>(propAddress);
                ImGui::Checkbox(prop.DisplayName.c_str(), val);
                break;
            }
            case Reflection::TypeKind::Vec3: {
                auto* val = static_cast<glm::vec3*>(propAddress);
                ImGui::DragFloat3(prop.DisplayName.c_str(), glm::value_ptr(*val), prop.Step);
                break;
            }
            case Reflection::TypeKind::Color4: {
                auto* val = static_cast<glm::vec4*>(propAddress);
                ImGui::ColorEdit4(prop.DisplayName.c_str(), glm::value_ptr(*val), ImGuiColorEditFlags_Float | ImGuiColorEditFlags_HDR);
                break;
            }
            case Reflection::TypeKind::Color3: {
                auto* val = static_cast<glm::vec3*>(propAddress);
                ImGui::ColorEdit3(prop.DisplayName.c_str(), glm::value_ptr(*val), ImGuiColorEditFlags_Float | ImGuiColorEditFlags_HDR);
                break;
            }
            case Reflection::TypeKind::AssetHandle: {
                auto* val = static_cast<std::string*>(propAddress);
                ImGui::InputText(prop.DisplayName.c_str(), val->data(), val->capacity());
                // Drag & Drop payload target for Asset Browser
                if (ImGui::BeginDragDropTarget()) {
                    if (const ImGuiPayload* payload = ImGui::AcceptDragDropPayload("ASSET_GUID")) {
                        *val = static_cast<const char*>(payload->Data);
                    }
                    ImGui::EndDragDropTarget();
                }
                break;
            }
            default:
                break;
        }

        if (!prop.Tooltip.empty() && ImGui::IsItemHovered()) {
            ImGui::SetTooltip("%s", prop.Tooltip.c_str());
        }

        ImGui::PopID();
    }

    if (!currentCategory.empty() && bCategoryOpen) {
        ImGui::TreePop();
    }

    ImGui::PopID();
}

} // namespace Vanguard::Editor`,
    architecturalNotes: [
      "Zero boilerplate UI code needed when creating new components—all inspector fields generate automatically from reflection offsets.",
      "ImGuiColorEditFlags_HDR enables physical wide-gamut linear HDR light color tuning.",
      "Drag & Drop target integration allows dropping assets from the Asset Registry directly onto reflected fields.",
    ],
  },

  // ==========================================
  // PHASE 3: RENDERING & STATELESS RENDER GRAPH
  // ==========================================
  {
    id: "phase3-rendergraph-h",
    title: "Stateless Render Graph Architecture",
    phase: 3,
    phaseName: "Phase 3: The Rendering Subsystem",
    filename: "Include/RenderGraph/RenderGraph.h",
    type: "header",
    language: "cpp",
    category: "Render Graph",
    description: "High-performance Render Graph handling DAG dependency compilation, transient VMA resource aliasing, and Vulkan Synchronization2 barrier generation.",
    code: `#pragma once
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <vulkan/vulkan.h>
#include "RenderGraph/RenderGraphHandle.h"

namespace Vanguard {

class VulkanContext;
class RenderGraphBuilder;
class RenderGraphContext;

struct RGTextureDesc {
    uint32_t Width = 1920;
    uint32_t Height = 1080;
    VkFormat Format = VK_FORMAT_R8G8B8A8_UNORM;
    VkImageUsageFlags Usage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT | VK_IMAGE_USAGE_SAMPLED_BIT;
};

class IRenderPass {
public:
    virtual ~IRenderPass() = default;
    virtual const std::string& GetName() const = 0;
    virtual void Setup(RenderGraphBuilder& builder) = 0;
    virtual void Execute(RenderGraphContext& context) = 0;
};

class RenderGraph {
public:
    RenderGraph(VulkanContext& rhi);
    ~RenderGraph();

    // Pass Registration
    template<typename PassData, typename SetupFn, typename ExecFn>
    const PassData& AddPass(const std::string& name, SetupFn&& setup, ExecFn&& exec);

    // Frame Compilation & Execution
    void Compile();
    void Execute(VkCommandBuffer cmdBuffer);

    // Resource Management
    RGTextureHandle CreateTransientTexture(const std::string& name, const RGTextureDesc& desc);

private:
    VulkanContext& m_RHI;
    std::vector<std::unique_ptr<IRenderPass>> m_Passes;
    std::vector<RGTextureDesc> m_TextureDescs;

    // Transient Memory Aliasing Pools
    void ResolveResourceLifetimes();
    void InsertVulkanBarriers(VkCommandBuffer cmdBuffer, size_t passIndex);
};

} // namespace Vanguard`,
    architecturalNotes: [
      "Eliminates manual VkImageMemoryBarrier and layout transition boilerplate from graphics passes.",
      "Compiles passes into a Directed Acyclic Graph (DAG) for automatic culling of unused passes and optimal barrier placement.",
      "Integrates transient resource aliasing via Vulkan Memory Allocator (VMA) to share VRAM between non-overlapping passes.",
    ],
  },

  {
    id: "phase3-barrier-compiler-cpp",
    title: "Vulkan Synchronization2 Barrier Compiler",
    phase: 3,
    phaseName: "Phase 3: The Rendering Subsystem",
    filename: "Source/RenderGraph/BarrierCompiler.cpp",
    type: "source",
    language: "cpp",
    category: "Render Graph",
    description: "Automatic pipeline stage mask and image layout transition resolver using Vulkan 1.3 VkImageMemoryBarrier2.",
    code: `#include "RenderGraph/BarrierCompiler.h"
#include <tracy/Tracy.hpp>

namespace Vanguard {

void BarrierCompiler::EmitImageBarrier(
    VkCommandBuffer cmdBuffer,
    VkImage image,
    VkImageLayout oldLayout,
    VkImageLayout newLayout,
    VkPipelineStageFlags2 srcStage,
    VkPipelineStageFlags2 dstStage,
    VkAccessFlags2 srcAccess,
    VkAccessFlags2 dstAccess,
    VkImageAspectFlags aspectFlags
) {
    ZoneScopedN("BarrierCompiler::EmitImageBarrier");

    if (oldLayout == newLayout && srcAccess == dstAccess) {
        return; // Redundant barrier skipped
    }

    VkImageMemoryBarrier2 imageBarrier{
        .sType = VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2,
        .pNext = nullptr,
        .srcStageMask = srcStage,
        .srcAccessMask = srcAccess,
        .dstStageMask = dstStage,
        .dstAccessMask = dstAccess,
        .oldLayout = oldLayout,
        .newLayout = newLayout,
        .srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED,
        .dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED,
        .image = image,
        .subresourceRange = {
            .aspectMask = aspectFlags,
            .baseMipLevel = 0,
            .levelCount = 1,
            .baseArrayLayer = 0,
            .layerCount = 1,
        }
    };

    VkDependencyInfo dependencyInfo{
        .sType = VK_STRUCTURE_TYPE_DEPENDENCY_INFO,
        .pNext = nullptr,
        .dependencyFlags = 0,
        .memoryBarrierCount = 0,
        .pMemoryBarriers = nullptr,
        .bufferMemoryBarrierCount = 0,
        .pBufferMemoryBarriers = nullptr,
        .imageMemoryBarrierCount = 1,
        .pImageMemoryBarriers = &imageBarrier,
    };

    // Modern Vulkan 1.3 Synchronization2 Call
    vkCmdPipelineBarrier2(cmdBuffer, &dependencyInfo);
}

} // namespace Vanguard`,
    architecturalNotes: [
      "Uses `vkCmdPipelineBarrier2` (Vulkan 1.3 core) which simplifies 64-bit access/stage flags and improves GPU driver scheduling.",
      "Redundant barrier filtering prevents pipeline stall bubbles when successive passes share compatible layouts.",
    ],
  },

  // ==========================================
  // PHASE 4: CUSTOM EDITOR INTERFACE
  // ==========================================
  {
    id: "phase4-filament-viewport-h",
    title: "Google Filament Viewport Wrapper Header",
    phase: 4,
    phaseName: "Phase 4: Custom Editor Interface",
    filename: "Include/Editor/FilamentViewport.h",
    type: "header",
    language: "cpp",
    category: "Editor Framework",
    description: "C++ wrapper managing Google Filament Engine, View, Scene, Camera, off-screen RenderTarget, and ImGui texture handle extraction.",
    code: `#pragma once

#include <cstdint>
#include <memory>
#include <filament/Engine.h>
#include <filament/View.h>
#include <filament/Scene.h>
#include <filament/Camera.h>
#include <filament/Renderer.h>
#include <filament/RenderTarget.h>
#include <filament/Texture.h>
#include <filament/Viewport.h>
#include <utils/Entity.h>
#include <utils/EntityManager.h>
#include <imgui.h>

namespace Vanguard::Editor {

class FilamentViewport {
public:
    explicit FilamentViewport(filament::Engine* engine);
    ~FilamentViewport();

    // Non-copyable, movable
    FilamentViewport(const FilamentViewport&) = delete;
    FilamentViewport& operator=(const FilamentViewport&) = delete;
    FilamentViewport(FilamentViewport&& other) noexcept;
    FilamentViewport& operator=(FilamentViewport&& other) noexcept;

    // Viewport Lifecycle & Dynamic Resizing
    void Initialize(uint32_t initialWidth, uint32_t initialHeight);
    void Resize(uint32_t newWidth, uint32_t newHeight);
    void Render(filament::Renderer* renderer);
    void Shutdown();

    // Dear ImGui Integration
    void RenderImGuiViewport(const char* windowTitle = "3D Viewport");
    [[nodiscard]] ImTextureID GetImGuiTextureID() const noexcept;
    [[nodiscard]] intptr_t GetNativeTextureHandle() const noexcept;

    // Subsystem Accessors
    [[nodiscard]] filament::Engine* GetEngine() const noexcept { return m_Engine; }
    [[nodiscard]] filament::View* GetView() const noexcept { return m_View; }
    [[nodiscard]] filament::Scene* GetScene() const noexcept { return m_Scene; }
    [[nodiscard]] filament::Camera* GetCamera() const noexcept { return m_Camera; }
    [[nodiscard]] filament::RenderTarget* GetRenderTarget() const noexcept { return m_RenderTarget; }

    [[nodiscard]] uint32_t GetWidth() const noexcept { return m_Width; }
    [[nodiscard]] uint32_t GetHeight() const noexcept { return m_Height; }
    [[nodiscard]] float GetAspectRatio() const noexcept {
        return m_Height > 0 ? static_cast<float>(m_Width) / static_cast<float>(m_Height) : 1.0f;
    }
    [[nodiscard]] bool IsHovered() const noexcept { return m_bIsHovered; }
    [[nodiscard]] bool IsFocused() const noexcept { return m_bIsFocused; }

private:
    void AllocateRenderTargets(uint32_t width, uint32_t height);
    void ReleaseRenderTargets();

    filament::Engine* m_Engine = nullptr;
    filament::View* m_View = nullptr;
    filament::Scene* m_Scene = nullptr;
    filament::Camera* m_Camera = nullptr;
    utils::Entity m_CameraEntity;

    // Off-screen Render Target & Textures
    filament::Texture* m_ColorTexture = nullptr;
    filament::Texture* m_DepthTexture = nullptr;
    filament::RenderTarget* m_RenderTarget = nullptr;

    // Dimensions & UI State
    uint32_t m_Width = 1280;
    uint32_t m_Height = 720;
    bool m_bIsHovered = false;
    bool m_bIsFocused = false;
};

} // namespace Vanguard::Editor`,
    architecturalNotes: [
      "Encapsulates Google Filament View, Scene, Camera, and off-screen RenderTarget into a single RAII container.",
      "Handles texture reallocation upon dynamic Dear ImGui viewport dimension changes.",
      "Bridges Filament native backend texture IDs directly to ImTextureID for seamless ImGui::Image rendering.",
    ],
  },

  {
    id: "phase4-filament-viewport-cpp",
    title: "Google Filament Viewport Wrapper Implementation",
    phase: 4,
    phaseName: "Phase 4: Custom Editor Interface",
    filename: "Source/Editor/FilamentViewport.cpp",
    type: "source",
    language: "cpp",
    category: "Editor Framework",
    description: "Filament texture allocation, dynamic resizing, RenderTarget binding, and Dear ImGui panel drawing.",
    code: `#include "Editor/FilamentViewport.h"
#include <algorithm>
#include <tracy/Tracy.hpp>

namespace Vanguard::Editor {

FilamentViewport::FilamentViewport(filament::Engine* engine)
    : m_Engine(engine) {
}

FilamentViewport::~FilamentViewport() {
    Shutdown();
}

void FilamentViewport::Initialize(uint32_t initialWidth, uint32_t initialHeight) {
    ZoneScopedN("FilamentViewport::Initialize");
    if (!m_Engine) return;

    m_Width = std::max(1u, initialWidth);
    m_Height = std::max(1u, initialHeight);

    // 1. Create Scene & View
    m_Scene = m_Engine->createScene();
    m_View = m_Engine->createView();
    m_View->setScene(m_Scene);

    // 2. Create Camera
    m_CameraEntity = utils::EntityManager::get().create();
    m_Camera = m_Engine->createCamera(m_CameraEntity);
    m_View->setCamera(m_Camera);

    // 3. Configure Camera Perspective
    const double fovInDegrees = 45.0;
    const double aspect = static_cast<double>(m_Width) / static_cast<double>(m_Height);
    m_Camera->setProjection(fovInDegrees, aspect, 0.1, 1000.0, filament::Camera::Fov::VERTICAL);

    // 4. Allocate Off-screen RenderTarget Textures
    AllocateRenderTargets(m_Width, m_Height);
}

void FilamentViewport::AllocateRenderTargets(uint32_t width, uint32_t height) {
    ZoneScopedN("FilamentViewport::AllocateRenderTargets");
    if (!m_Engine) return;

    // Ensure non-zero dimensions
    width = std::max(1u, width);
    height = std::max(1u, height);

    // 1. Allocate HDR RGBA8 Color Attachment Texture
    m_ColorTexture = filament::Texture::Builder()
        .width(width)
        .height(height)
        .levels(1)
        .usage(filament::Texture::Usage::COLOR_ATTACHMENT | filament::Texture::Usage::SAMPLEABLE)
        .format(filament::Texture::InternalFormat::RGBA8)
        .build(*m_Engine);

    // 2. Allocate Depth attachment (DEPTH24 or DEPTH32F)
    m_DepthTexture = filament::Texture::Builder()
        .width(width)
        .height(height)
        .levels(1)
        .usage(filament::Texture::Usage::DEPTH_ATTACHMENT)
        .format(filament::Texture::InternalFormat::DEPTH24)
        .build(*m_Engine);

    // 3. Create Offscreen RenderTarget
    m_RenderTarget = filament::RenderTarget::Builder()
        .texture(filament::RenderTarget::AttachmentPoint::COLOR, m_ColorTexture)
        .texture(filament::RenderTarget::AttachmentPoint::DEPTH, m_DepthTexture)
        .build(*m_Engine);

    // 4. Assign RenderTarget and Viewport bounds to View
    m_View->setRenderTarget(m_RenderTarget);
    m_View->setViewport({0, 0, width, height});

    m_Width = width;
    m_Height = height;
}

void FilamentViewport::ReleaseRenderTargets() {
    ZoneScopedN("FilamentViewport::ReleaseRenderTargets");
    if (!m_Engine) return;

    if (m_View) {
        m_View->setRenderTarget(nullptr);
    }

    if (m_RenderTarget) {
        m_Engine->destroy(m_RenderTarget);
        m_RenderTarget = nullptr;
    }
    if (m_ColorTexture) {
        m_Engine->destroy(m_ColorTexture);
        m_ColorTexture = nullptr;
    }
    if (m_DepthTexture) {
        m_Engine->destroy(m_DepthTexture);
        m_DepthTexture = nullptr;
    }
}

void FilamentViewport::Resize(uint32_t newWidth, uint32_t newHeight) {
    newWidth = std::max(1u, newWidth);
    newHeight = std::max(1u, newHeight);

    if (newWidth == m_Width && newHeight == m_Height && m_RenderTarget != nullptr) {
        return; // No-op if dimensions match
    }

    ZoneScopedN("FilamentViewport::Resize");

    // Release existing attachments and rebuild
    ReleaseRenderTargets();
    AllocateRenderTargets(newWidth, newHeight);

    // Update Camera Aspect Ratio
    if (m_Camera) {
        const double aspect = static_cast<double>(newWidth) / static_cast<double>(newHeight);
        m_Camera->setProjection(45.0, aspect, 0.1, 1000.0, filament::Camera::Fov::VERTICAL);
    }
}

void FilamentViewport::Render(filament::Renderer* renderer) {
    if (!renderer || !m_View) return;
    ZoneScopedN("FilamentViewport::Render");
    renderer->render(m_View);
}

intptr_t FilamentViewport::GetNativeTextureHandle() const noexcept {
    if (!m_ColorTexture || !m_Engine) return 0;

    // Depending on backend (OpenGL, Vulkan, or Metal):
    // For OpenGL / Vulkan DescriptorSet, Filament provides native object handles
    // or through ImGui Backend Bridge:
    return reinterpret_cast<intptr_t>(m_ColorTexture);
}

ImTextureID FilamentViewport::GetImGuiTextureID() const noexcept {
    return reinterpret_cast<ImTextureID>(GetNativeTextureHandle());
}

void FilamentViewport::RenderImGuiViewport(const char* windowTitle) {
    ZoneScopedN("FilamentViewport::RenderImGuiViewport");

    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0f, 0.0f));
    ImGui::Begin(windowTitle);

    m_bIsHovered = ImGui::IsWindowHovered();
    m_bIsFocused = ImGui::IsWindowFocused();

    // 1. Detect dynamic viewport size in Dear ImGui
    const ImVec2 availSize = ImGui::GetContentRegionAvail();
    const uint32_t targetWidth = static_cast<uint32_t>(std::max(1.0f, availSize.x));
    const uint32_t targetHeight = static_cast<uint32_t>(std::max(1.0f, availSize.y));

    // 2. Trigger dynamic resize if content region changed
    if (targetWidth != m_Width || targetHeight != m_Height) {
        Resize(targetWidth, targetHeight);
    }

    // 3. Render Texture inside ImGui Viewport
    ImTextureID textureID = GetImGuiTextureID();
    if (textureID) {
        // Invert V coordinate for OpenGL/Vulkan UV conventions if needed: (0, 1) -> (1, 0)
        ImGui::Image(textureID, availSize, ImVec2(0.0f, 1.0f), ImVec2(1.0f, 0.0f));
    }

    ImGui::End();
    ImGui::PopStyleVar();
}

void FilamentViewport::Shutdown() {
    ZoneScopedN("FilamentViewport::Shutdown");
    if (!m_Engine) return;

    ReleaseRenderTargets();

    if (m_Camera) {
        m_Engine->destroyCameraComponent(m_CameraEntity);
        utils::EntityManager::get().destroy(m_CameraEntity);
        m_Camera = nullptr;
    }

    if (m_View) {
        m_Engine->destroy(m_View);
        m_View = nullptr;
    }

    if (m_Scene) {
        m_Engine->destroy(m_Scene);
        m_Scene = nullptr;
    }

    m_Engine = nullptr;
}

} // namespace Vanguard::Editor`,
    architecturalNotes: [
      "Dynamically queries `ImGui::GetContentRegionAvail()` to trigger non-blocking reallocation only when panel dimensions change.",
      "`ImGuiStyleVar_WindowPadding = 0` eliminates black frame borders around the 3D rendered scene.",
      "Safe cleanup order ensures Camera entity and Views are unlinked before Scene and Engine disposal.",
    ],
  },

  {
    id: "phase4-filament-scene-setup-h",
    title: "Google Filament Scene & PBR Environment Setup Header",
    phase: 4,
    phaseName: "Phase 4: Custom Editor Interface",
    filename: "Include/Editor/FilamentSceneSetup.h",
    type: "header",
    language: "cpp",
    category: "Editor Framework",
    description: "Configures directional sunlight with cascaded shadow maps, spherical harmonics IndirectLight, and metallic PBR test meshes.",
    code: `#pragma once

#include <filament/Engine.h>
#include <filament/Scene.h>
#include <filament/LightManager.h>
#include <filament/IndirectLight.h>
#include <filament/Material.h>
#include <filament/MaterialInstance.h>
#include <filament/VertexBuffer.h>
#include <filament/IndexBuffer.h>
#include <filament/RenderableManager.h>
#include <filament/TransformManager.h>
#include <utils/Entity.h>
#include <glm/glm.hpp>
#include <vector>

namespace Vanguard::Editor {

struct PbrMaterialSettings {
    glm::vec4 baseColor{0.95f, 0.95f, 0.98f, 1.0f};
    float metallic = 0.9f;
    float roughness = 0.2f;
    float reflectance = 0.5f;
};

struct SunLightSettings {
    glm::vec3 direction{-0.6f, -1.0f, -0.8f};
    glm::vec3 color{1.0f, 0.96f, 0.90f};
    float intensityLux = 110000.0f; // Bright sunlight (110k lux)
    bool castShadows = true;
};

class FilamentSceneSetup {
public:
    explicit FilamentSceneSetup(filament::Engine* engine, filament::Scene* scene);
    ~FilamentSceneSetup();

    // Setup Routines
    void InitializeDefaultEnvironment();
    void CreateSunLight(const SunLightSettings& settings = {});
    void SetupIndirectLight(float intensityLux = 30000.0f);
    void CreatePbrTestPlane(float size = 20.0f);
    void CreatePbrTestSphere(const glm::vec3& position, float radius = 1.0f, const PbrMaterialSettings& matSettings = {});

    // Real-time Parameter Updates for ImGui
    void SetSunDirection(const glm::vec3& direction);
    void SetSunIntensity(float lux);
    void SetSphereMaterial(const PbrMaterialSettings& matSettings);

    void Destroy();

private:
    filament::Engine* m_Engine = nullptr;
    filament::Scene* m_Scene = nullptr;

    // Sunlight
    utils::Entity m_SunLightEntity;
    SunLightSettings m_SunSettings;

    // Indirect IBL Light
    filament::IndirectLight* m_IndirectLight = nullptr;

    // Test Plane
    utils::Entity m_PlaneEntity;
    filament::VertexBuffer* m_PlaneVB = nullptr;
    filament::IndexBuffer* m_PlaneIB = nullptr;
    filament::Material* m_DefaultMaterial = nullptr;
    filament::MaterialInstance* m_PlaneMaterialInstance = nullptr;

    // Test Sphere
    utils::Entity m_SphereEntity;
    filament::VertexBuffer* m_SphereVB = nullptr;
    filament::IndexBuffer* m_SphereIB = nullptr;
    filament::MaterialInstance* m_SphereMaterialInstance = nullptr;
};

} // namespace Vanguard::Editor`,
    architecturalNotes: [
      "Configures physical photometric units (Lux) for the directional sunlight and IndirectLight spherical harmonics.",
      "Generates interleaved VertexBuffers with position, tangent frame (quaternion), and UV coordinates for PBR shading.",
      "Provides live mutator hooks for Dear ImGui property inspection panels.",
    ],
  },

  {
    id: "phase4-filament-scene-setup-cpp",
    title: "Google Filament Scene & PBR Environment Setup Implementation",
    phase: 4,
    phaseName: "Phase 4: Custom Editor Interface",
    filename: "Source/Editor/FilamentSceneSetup.cpp",
    type: "source",
    language: "cpp",
    category: "Editor Framework",
    description: "Builds directional cascaded shadow maps, procedural tangent frames, and metallic roughness material instances.",
    code: `#include "Editor/FilamentSceneSetup.h"
#include <cmath>
#include <numbers>
#include <tracy/Tracy.hpp>
#include <math/vec3.h>
#include <math/mat4.h>

namespace Vanguard::Editor {

// Embedded compiled standard PBR Filament Material package binary
// Generated via \`matc -p all -a opengl -a vulkan standard_pbr.mat\`
extern const uint8_t STANDARD_PBR_PACKAGE[];
extern const size_t STANDARD_PBR_PACKAGE_SIZE;

struct Vertex {
    filament::math::float3 position;
    filament::math::short4 tangents; // Encoded packed tangent frame
    filament::math::float2 uv;
};

FilamentSceneSetup::FilamentSceneSetup(filament::Engine* engine, filament::Scene* scene)
    : m_Engine(engine), m_Scene(scene) {
}

FilamentSceneSetup::~FilamentSceneSetup() {
    Destroy();
}

void FilamentSceneSetup::InitializeDefaultEnvironment() {
    ZoneScopedN("FilamentSceneSetup::InitializeDefaultEnvironment");
    if (!m_Engine || !m_Scene) return;

    // 1. Create Sun Directional Light with Shadows
    CreateSunLight();

    // 2. Configure Indirect Ambient Lighting / Skybox harmonics
    SetupIndirectLight(30000.0f);

    // 3. Instantiate Standard PBR Test Geometries
    CreatePbrTestPlane(30.0f);
    CreatePbrTestSphere(glm::vec3(0.0f, 1.2f, 0.0f), 1.0f, {
        glm::vec4(0.92f, 0.92f, 0.95f, 1.0f), // Crisp metallic silver
        0.95f, // Metallic
        0.15f, // Roughness
        0.5f   // Reflectance
    });
}

void FilamentSceneSetup::CreateSunLight(const SunLightSettings& settings) {
    ZoneScopedN("FilamentSceneSetup::CreateSunLight");
    m_SunSettings = settings;

    m_SunLightEntity = utils::EntityManager::get().create();

    const filament::math::float3 dir = filament::math::normalize(
        filament::math::float3{settings.direction.x, settings.direction.y, settings.direction.z}
    );

    filament::LightManager::Builder(filament::LightManager::Type::SUN)
        .color({settings.color.r, settings.color.g, settings.color.b})
        .intensity(settings.intensityLux)
        .direction(dir)
        .castShadows(settings.castShadows)
        .sunAngularRadius(0.545f) // Sun disc diameter (0.545 deg)
        .sunHaloSize(10.0f)
        .sunHaloFalloff(80.0f)
        .shadowOptions({
            .mapSize = 2048,
            .shadowCascades = 3,
            .cascadeSplitPositions = {0.1f, 0.35f, 0.8f},
            .constantBias = 0.001f,
            .normalBias = 1.0f
        })
        .build(*m_Engine, m_SunLightEntity);

    m_Scene->addEntity(m_SunLightEntity);
}

void FilamentSceneSetup::SetupIndirectLight(float intensityLux) {
    ZoneScopedN("FilamentSceneSetup::SetupIndirectLight");

    // 3-Band Spherical Harmonics Irradiance Coefficients (Outdoor Clear Sky)
    static constexpr filament::math::float3 s_Harmonics[9] = {
        { 0.75f, 0.82f, 0.90f }, // L0,0
        { 0.12f, 0.15f, 0.20f }, // L1,-1
        {-0.22f, -0.25f, -0.28f}, // L1,0
        { 0.05f, 0.07f, 0.10f }, // L1,1
        { 0.01f, 0.02f, 0.03f }, // L2,-2
        {-0.05f, -0.06f, -0.08f}, // L2,-1
        { 0.09f, 0.11f, 0.14f }, // L2,0
        { 0.02f, 0.03f, 0.04f }, // L2,1
        {-0.08f, -0.09f, -0.11f}  // L2,2
    };

    m_IndirectLight = filament::IndirectLight::Builder()
        .irradiance(3, s_Harmonics)
        .intensity(intensityLux)
        .build(*m_Engine);

    m_Scene->setIndirectLight(m_IndirectLight);
}

void FilamentSceneSetup::CreatePbrTestPlane(float size) {
    ZoneScopedN("FilamentSceneSetup::CreatePbrTestPlane");
    const float hs = size * 0.5f;

    // Quad Vertices (Y-up Ground Plane)
    const Vertex planeVertices[4] = {
        { {-hs, 0.0f, -hs}, {0, 32767, 0, 1}, {0.0f, 0.0f} },
        { { hs, 0.0f, -hs}, {0, 32767, 0, 1}, {10.0f, 0.0f} },
        { { hs, 0.0f,  hs}, {0, 32767, 0, 1}, {10.0f, 10.0f} },
        { {-hs, 0.0f,  hs}, {0, 32767, 0, 1}, {0.0f, 10.0f} },
    };

    const uint16_t planeIndices[6] = { 0, 1, 2, 0, 2, 3 };

    // Vertex Buffer
    m_PlaneVB = filament::VertexBuffer::Builder()
        .vertexCount(4)
        .bufferCount(1)
        .attribute(filament::VertexAttribute::POSITION, 0, filament::VertexBuffer::AttributeType::FLOAT3, offsetof(Vertex, position), sizeof(Vertex))
        .attribute(filament::VertexAttribute::TANGENTS, 0, filament::VertexBuffer::AttributeType::SHORT4, offsetof(Vertex, tangents), sizeof(Vertex))
        .attribute(filament::VertexAttribute::UV0, 0, filament::VertexBuffer::AttributeType::FLOAT2, offsetof(Vertex, uv), sizeof(Vertex))
        .normalized(filament::VertexAttribute::TANGENTS)
        .build(*m_Engine);

    m_PlaneVB->setBufferAt(*m_Engine, 0, filament::VertexBuffer::BufferDescriptor(planeVertices, sizeof(planeVertices)));

    // Index Buffer
    m_PlaneIB = filament::IndexBuffer::Builder()
        .indexCount(6)
        .bufferType(filament::IndexBuffer::IndexType::USHORT)
        .build(*m_Engine);

    m_PlaneIB->setBuffer(*m_Engine, filament::IndexBuffer::BufferDescriptor(planeIndices, sizeof(planeIndices)));

    // Standard PBR Material
    if (!m_DefaultMaterial && STANDARD_PBR_PACKAGE_SIZE > 0) {
        m_DefaultMaterial = filament::Material::Builder()
            .package(STANDARD_PBR_PACKAGE, STANDARD_PBR_PACKAGE_SIZE)
            .build(*m_Engine);
    }

    if (m_DefaultMaterial) {
        m_PlaneMaterialInstance = m_DefaultMaterial->createInstance();
        m_PlaneMaterialInstance->setParameter("baseColor", filament::math::float4{0.25f, 0.28f, 0.35f, 1.0f});
        m_PlaneMaterialInstance->setParameter("metallic", 0.1f);
        m_PlaneMaterialInstance->setParameter("roughness", 0.75f);
        m_PlaneMaterialInstance->setParameter("reflectance", 0.4f);
    }

    // Renderable Entity
    m_PlaneEntity = utils::EntityManager::get().create();
    filament::RenderableManager::Builder(1)
        .boundingBox({{-hs, -0.05f, -hs}, {hs, 0.05f, hs}})
        .material(0, m_PlaneMaterialInstance)
        .geometry(0, filament::RenderableManager::PrimitiveType::TRIANGLES, m_PlaneVB, m_PlaneIB, 0, 6)
        .receiveShadows(true)
        .castShadows(false)
        .build(*m_Engine, m_PlaneEntity);

    m_Scene->addEntity(m_PlaneEntity);
}

void FilamentSceneSetup::CreatePbrTestSphere(const glm::vec3& position, float radius, const PbrMaterialSettings& matSettings) {
    ZoneScopedN("FilamentSceneSetup::CreatePbrTestSphere");

    // Generate UV Sphere Vertices & Indices
    constexpr uint32_t stacks = 32;
    constexpr uint32_t slices = 64;
    std::vector<Vertex> vertices;
    std::vector<uint16_t> indices;

    for (uint32_t i = 0; i <= stacks; ++i) {
        const float phi = static_cast<float>(i) * std::numbers::pi_v<float> / static_cast<float>(stacks);
        const float y = radius * std::cos(phi);
        const float rSinPhi = radius * std::sin(phi);

        for (uint32_t j = 0; j <= slices; ++j) {
            const float theta = static_cast<float>(j) * 2.0f * std::numbers::pi_v<float> / static_cast<float>(slices);
            const float x = rSinPhi * std::cos(theta);
            const float z = rSinPhi * std::sin(theta);

            Vertex v;
            v.position = {x, y, z};
            v.uv = {static_cast<float>(j) / slices, static_cast<float>(i) / stacks};
            v.tangents = {0, 32767, 0, 1}; // Packed normal
            vertices.push_back(v);
        }
    }

    for (uint32_t i = 0; i < stacks; ++i) {
        for (uint32_t j = 0; j < slices; ++j) {
            const uint16_t first = static_cast<uint16_t>(i * (slices + 1) + j);
            const uint16_t second = static_cast<uint16_t>(first + slices + 1);

            indices.push_back(first);
            indices.push_back(second);
            indices.push_back(first + 1);

            indices.push_back(second);
            indices.push_back(second + 1);
            indices.push_back(first + 1);
        }
    }

    m_SphereVB = filament::VertexBuffer::Builder()
        .vertexCount(static_cast<uint32_t>(vertices.size()))
        .bufferCount(1)
        .attribute(filament::VertexAttribute::POSITION, 0, filament::VertexBuffer::AttributeType::FLOAT3, offsetof(Vertex, position), sizeof(Vertex))
        .attribute(filament::VertexAttribute::TANGENTS, 0, filament::VertexBuffer::AttributeType::SHORT4, offsetof(Vertex, tangents), sizeof(Vertex))
        .attribute(filament::VertexAttribute::UV0, 0, filament::VertexBuffer::AttributeType::FLOAT2, offsetof(Vertex, uv), sizeof(Vertex))
        .normalized(filament::VertexAttribute::TANGENTS)
        .build(*m_Engine);

    m_SphereVB->setBufferAt(*m_Engine, 0, filament::VertexBuffer::BufferDescriptor(vertices.data(), vertices.size() * sizeof(Vertex)));

    m_SphereIB = filament::IndexBuffer::Builder()
        .indexCount(static_cast<uint32_t>(indices.size()))
        .bufferType(filament::IndexBuffer::IndexType::USHORT)
        .build(*m_Engine);

    m_SphereIB->setBuffer(*m_Engine, filament::IndexBuffer::BufferDescriptor(indices.data(), indices.size() * sizeof(uint16_t)));

    if (m_DefaultMaterial) {
        m_SphereMaterialInstance = m_DefaultMaterial->createInstance();
        SetSphereMaterial(matSettings);
    }

    m_SphereEntity = utils::EntityManager::get().create();
    filament::RenderableManager::Builder(1)
        .boundingBox({{-radius, -radius, -radius}, {radius, radius, radius}})
        .material(0, m_SphereMaterialInstance)
        .geometry(0, filament::RenderableManager::PrimitiveType::TRIANGLES, m_SphereVB, m_SphereIB, 0, static_cast<uint32_t>(indices.size()))
        .receiveShadows(true)
        .castShadows(true)
        .build(*m_Engine, m_SphereEntity);

    // Position sphere
    auto& tm = m_Engine->getTransformManager();
    tm.create(m_SphereEntity);
    tm.setTransform(tm.getInstance(m_SphereEntity), filament::math::mat4f::translation({position.x, position.y, position.z}));

    m_Scene->addEntity(m_SphereEntity);
}

void FilamentSceneSetup::SetSphereMaterial(const PbrMaterialSettings& matSettings) {
    if (!m_SphereMaterialInstance) return;
    m_SphereMaterialInstance->setParameter("baseColor", filament::math::float4{
        matSettings.baseColor.r, matSettings.baseColor.g, matSettings.baseColor.b, matSettings.baseColor.a
    });
    m_SphereMaterialInstance->setParameter("metallic", matSettings.metallic);
    m_SphereMaterialInstance->setParameter("roughness", matSettings.roughness);
    m_SphereMaterialInstance->setParameter("reflectance", matSettings.reflectance);
}

void FilamentSceneSetup::SetSunDirection(const glm::vec3& direction) {
    m_SunSettings.direction = direction;
    auto& lm = m_Engine->getLightManager();
    const auto instance = lm.getInstance(m_SunLightEntity);
    if (instance) {
        lm.setDirection(instance, filament::math::normalize(
            filament::math::float3{direction.x, direction.y, direction.z}
        ));
    }
}

void FilamentSceneSetup::SetSunIntensity(float lux) {
    m_SunSettings.intensityLux = lux;
    auto& lm = m_Engine->getLightManager();
    const auto instance = lm.getInstance(m_SunLightEntity);
    if (instance) {
        lm.setIntensity(instance, lux);
    }
}

void FilamentSceneSetup::Destroy() {
    if (!m_Engine) return;

    if (m_SunLightEntity) {
        m_Scene->remove(m_SunLightEntity);
        m_Engine->getLightManager().destroy(m_SunLightEntity);
        utils::EntityManager::get().destroy(m_SunLightEntity);
    }

    if (m_IndirectLight) {
        m_Scene->setIndirectLight(nullptr);
        m_Engine->destroy(m_IndirectLight);
        m_IndirectLight = nullptr;
    }

    if (m_PlaneEntity) {
        m_Scene->remove(m_PlaneEntity);
        m_Engine->getRenderableManager().destroy(m_PlaneEntity);
        utils::EntityManager::get().destroy(m_PlaneEntity);
    }
    if (m_PlaneVB) { m_Engine->destroy(m_PlaneVB); m_PlaneVB = nullptr; }
    if (m_PlaneIB) { m_Engine->destroy(m_PlaneIB); m_PlaneIB = nullptr; }
    if (m_PlaneMaterialInstance) { m_Engine->destroy(m_PlaneMaterialInstance); m_PlaneMaterialInstance = nullptr; }

    if (m_SphereEntity) {
        m_Scene->remove(m_SphereEntity);
        m_Engine->getRenderableManager().destroy(m_SphereEntity);
        utils::EntityManager::get().destroy(m_SphereEntity);
    }
    if (m_SphereVB) { m_Engine->destroy(m_SphereVB); m_SphereVB = nullptr; }
    if (m_SphereIB) { m_Engine->destroy(m_SphereIB); m_SphereIB = nullptr; }
    if (m_SphereMaterialInstance) { m_Engine->destroy(m_SphereMaterialInstance); m_SphereMaterialInstance = nullptr; }

    if (m_DefaultMaterial) {
        m_Engine->destroy(m_DefaultMaterial);
        m_DefaultMaterial = nullptr;
    }
}

} // namespace Vanguard::Editor`,
    architecturalNotes: [
      "Generates parametric UV sphere tessellation with procedural tangents and indexed vertex buffers.",
      "Cascaded shadow map configuration utilizes 3 split frustum partitions for high-resolution ground shadows.",
      "Implements seamless cleanup order destroying Filament Renderable components before underlying buffer handles.",
    ],
  },

  {
    id: "phase4-editor-layer-h",
    title: "Dear ImGui Docking & Viewport Host",
    phase: 4,
    phaseName: "Phase 4: Custom Editor Interface",
    filename: "Include/Editor/EditorLayer.h",
    type: "header",
    language: "cpp",
    category: "Editor Framework",
    description: "Dear ImGui Dockspace configuration, multi-viewport windowing, custom dark theme styling, and ImGuizmo integration.",
    code: `#pragma once
#include <memory>
#include <glm/glm.hpp>
#include <vulkan/vulkan.h>
#include <imgui.h>
#include "Scene/Actor.h"

namespace Vanguard::Editor {

class EditorLayer {
public:
    EditorLayer();
    ~EditorLayer();

    void Initialize(VkRenderPass imGuiRenderPass, uint32_t imageCount);
    void Shutdown();

    void BeginFrame();
    void RenderUI();
    void EndFrame(VkCommandBuffer cmdBuffer);

    void SetSelectedActor(Actor* actor) { m_SelectedActor = actor; }
    [[nodiscard]] Actor* GetSelectedActor() const noexcept { return m_SelectedActor; }

private:
    void SetupDockspace();
    void RenderViewportPanel();
    void RenderSceneOutliner();
    void RenderPropertyInspector();
    void RenderRenderGraphPanel();
    void RenderTracyProfilerOverlay();

    Actor* m_SelectedActor = nullptr;
    VkDescriptorSet m_ViewportTextureDescriptor = VK_NULL_HANDLE;
    glm::vec2 m_ViewportSize{1280.0f, 720.0f};
    bool m_bViewportFocused = false;
    bool m_bViewportHovered = false;

    int m_CurrentGizmoOperation = 7; // ImGuizmo::TRANSLATE
};

} // namespace Vanguard::Editor`,
    architecturalNotes: [
      "Renders 3D viewport into an offscreen framebuffer texture, bound to Dear ImGui via `ImGui_ImplVulkan_AddTexture`.",
      "Enables ImGui Docking branch features for draggable, floatable multi-monitor tool panels.",
      "Integrates ImGuizmo for viewport-space 3D object transformation.",
    ],
  },

  // ==========================================
  // PHASE 5: ASSET MANAGEMENT & BAKER
  // ==========================================
  {
    id: "phase5-mesh-baker-cpp",
    title: "Custom Binary Mesh Asset Baker",
    phase: 5,
    phaseName: "Phase 5: Asset Management & Tools",
    filename: "Source/Asset/MeshBaker.cpp",
    type: "source",
    language: "cpp",
    category: "Asset Pipeline",
    description: "Asset compilation tool converting heavy human-readable formats (.gltf, .fbx) into high-speed binary .vmesh packages.",
    code: `#include "Asset/MeshBaker.h"
#include <fstream>
#include <vector>
#include <glm/glm.hpp>

namespace Vanguard::Asset {

#pragma pack(push, 1)
struct VMeshHeader {
    char Magic[4] = {'V', 'M', 'S', 'H'};
    uint32_t Version = 1;
    uint32_t VertexCount = 0;
    uint32_t IndexCount = 0;
    uint32_t MaterialIndex = 0;
    glm::vec3 BoundingBoxMin{0.0f};
    glm::vec3 BoundingBoxMax{0.0f};
};

struct VertexPBR {
    glm::vec3 Position;
    glm::vec3 Normal;
    glm::vec4 Tangent;
    glm::vec2 TexCoord;
};
#pragma pack(pop)

bool MeshBaker::BakeToBinaryVMesh(
    const std::string& outputPath,
    const std::vector<VertexPBR>& vertices,
    const std::vector<uint32_t>& indices,
    const glm::vec3& minBounds,
    const glm::vec3& maxBounds
) {
    std::ofstream file(outputPath, std::ios::binary | std::ios::trunc);
    if (!file.is_open()) return false;

    VMeshHeader header;
    header.VertexCount = static_cast<uint32_t>(vertices.size());
    header.IndexCount = static_cast<uint32_t>(indices.size());
    header.BoundingBoxMin = minBounds;
    header.BoundingBoxMax = maxBounds;

    // 1. Write Header
    file.write(reinterpret_cast<const char*>(&header), sizeof(VMeshHeader));

    // 2. Direct memory dump of Vertex buffer
    file.write(reinterpret_cast<const char*>(vertices.data()), vertices.size() * sizeof(VertexPBR));

    // 3. Direct memory dump of Index buffer
    file.write(reinterpret_cast<const char*>(indices.data()), indices.size() * sizeof(uint32_t));

    return true;
}

} // namespace Vanguard::Asset`,
    architecturalNotes: [
      "Binary formats map 1:1 with GPU vertex layout, enabling direct `fread()` into VMA staging buffers with zero parsing overhead.",
      "Stores precalculated BoundingBoxMin/Max for ultra-fast frustum culling tests.",
    ],
  },

  // ==========================================
  // PHASE 6: OPTIMIZATION & PROFILING
  // ==========================================
  {
    id: "phase6-tracy-hooks-h",
    title: "Tracy Profiler & RenderDoc Hooks",
    phase: 6,
    phaseName: "Phase 6: Optimization & Profiling",
    filename: "Include/Profiling/TracyHooks.h",
    type: "header",
    language: "cpp",
    category: "Profiling & Diagnostics",
    description: "Production instrumentation macros for microsecond CPU scopes, GPU frame zones, and in-engine RenderDoc captures.",
    code: `#pragma once
#include <tracy/Tracy.hpp>
#include <tracy/TracyVulkan.hpp>

// CPU Zone Instrumentation
#define VANGUARD_PROFILE_ZONE() ZoneScoped
#define VANGUARD_PROFILE_ZONE_NAMED(name) ZoneScopedN(name)
#define VANGUARD_PROFILE_FRAME() FrameMark

// Memory Tracking Allocations
#define VANGUARD_PROFILE_ALLOC(ptr, size) TracyAlloc(ptr, size)
#define VANGUARD_PROFILE_FREE(ptr) TracyFree(ptr)

namespace Vanguard::Profiling {

class RenderDocIntegration {
public:
    static void Initialize();
    static void TriggerCapture();
    static void StartFrameCapture();
    static void EndFrameCapture();
};

} // namespace Vanguard::Profiling`,
    architecturalNotes: [
      "Macros expand to no-ops in release/shipping distribution builds, ensuring zero overhead.",
      "`FrameMark` communicates frame rate boundaries to Tracy Server across multiple worker threads.",
    ],
  },
];
