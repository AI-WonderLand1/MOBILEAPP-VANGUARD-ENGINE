#pragma once
#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

namespace Vanguard::Editor {

// ==========================================
// Visual Node Graph Editor (ImGuiNodeEditor)
// ==========================================
// Hosts a blueprint-style node graph (the UE5 Blueprint editor analogue)
// powered by ImGuiNodeEditor. Nodes, pins, and links are tracked as simple
// index-based structures and serialized to/from the registry.
struct NodePin {
    std::string Name;
    bool bIsInput = true;
    uint32_t NodeIndex = 0;
};

struct GraphNode {
    std::string Title;
    std::string TypeName;       // e.g. "Event BeginPlay", "Log Message"
    float PosX = 0.0f;
    float PosY = 0.0f;
    std::vector<NodePin> Inputs;
    std::vector<NodePin> Outputs;
};

struct GraphLink {
    uint32_t FromPin = 0;   // Flat pin index (input space)
    uint32_t ToPin = 0;     // Flat pin index (output space)
};

class NodeEditorGraph {
public:
    NodeEditorGraph();
    ~NodeEditorGraph();

    // Graph editing API
    uint32_t AddNode(GraphNode node);
    void RemoveNode(uint32_t nodeIndex);
    void AddLink(uint32_t fromPinIndex, uint32_t toPinIndex);
    void RemoveLink(uint32_t linkIndex);
    void Clear();

    // Rendering entry point (called within an ImGui window).
    void Render();

    [[nodiscard]] const std::vector<GraphNode>& GetNodes() const noexcept { return m_Nodes; }
    [[nodiscard]] const std::vector<GraphLink>& GetLinks() const noexcept { return m_Links; }
    [[nodiscard]] bool IsDirty() const noexcept { return m_bDirty; }
    void ClearDirty() noexcept { m_bDirty = false; }

private:
    std::vector<GraphNode> m_Nodes;
    std::vector<GraphLink> m_Links;
    bool m_bDirty = false;
};

} // namespace Vanguard::Editor