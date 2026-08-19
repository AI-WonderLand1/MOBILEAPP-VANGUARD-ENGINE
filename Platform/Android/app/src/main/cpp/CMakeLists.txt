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
    ${SOURCE_DIR}/Platform/Platform.cpp
    ${SOURCE_DIR}/RenderGraph/RenderGraph.cpp
    ${SOURCE_DIR}/RenderGraph/BarrierCompiler.cpp
)