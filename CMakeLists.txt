# ==========================================
# 1. Engine Core Target (Core / RHI / Scene / Physics / Asset / RenderGraph)
# ==========================================
add_library(VanguardEngine STATIC
    Source/Core/Engine.cpp
    # Source/Core/Window.cpp  # Removed - now using platform abstraction
    Source/Reflection/ReflectionRegistry.cpp
    Source/Scene/Actor.cpp
    Source/Scene/SceneGraph.cpp
    Source/Scene/Components/StaticMeshComponent.cpp
    Source/Physics/PhysicsSystem.cpp
    Source/RHI/VulkanContext.cpp
    Source/RHI/VulkanSwapchain.cpp
    Source/Platform/Platform.cpp
    Source/Asset/AssetRegistry.cpp
    Source/Asset/MeshBaker.cpp
    Source/RenderGraph/RenderGraph.cpp
    Source/RenderGraph/BarrierCompiler.cpp
)