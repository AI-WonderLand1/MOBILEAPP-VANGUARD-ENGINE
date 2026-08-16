#include "Editor/NodeEditorGraph.h"
#include <algorithm>
#include <imgui.h>
#include <imgui_node_editor.h>
#include <tracy/Tracy.hpp>

namespace ed = ax::NodeEditor;

namespace Vanguard::Editor {

NodeEditorGraph::NodeEditorGraph() = default;

NodeEditorGraph::~NodeEditorGraph() {
    // The shared editor context is destroyed by the owning editor layer.
}

uint32_t NodeEditorGraph::AddNode(GraphNode node) {
    const uint32_t index = static_cast<uint32_t>(m_Nodes.size());

    for (NodePin& pin : node.Inputs) pin.NodeIndex = index;
    for (NodePin& pin : node.Outputs) pin.NodeIndex = index;

    m_Nodes.push_back(std::move(node));
    m_bDirty = true;
    return index;
}

void NodeEditorGraph::RemoveNode(uint32_t nodeIndex) {
    if (nodeIndex >= m_Nodes.size()) return;

    // Drop all links touching this node's pins.
    const GraphNode& node = m_Nodes[nodeIndex];
    const uint32_t totalPins = static_cast<uint32_t>(node.Inputs.size() + node.Outputs.size());
    const uint32_t firstInput = nodeIndex;
    const uint32_t firstOutput = firstInput + static_cast<uint32_t>(node.Inputs.size());

    m_Links.erase(
        std::remove_if(m_Links.begin(), m_Links.end(),
                       [&](const GraphLink& link) {
                           const bool touchesInputs = link.FromPin >= firstInput && link.FromPin < firstOutput;
                           const bool touchesOutputs = link.ToPin >= firstOutput;
                           return touchesInputs || touchesOutputs;
                       }),
        m_Links.end()
    );

    m_Nodes.erase(m_Nodes.begin() + nodeIndex);
    m_bDirty = true;
}

void NodeEditorGraph::AddLink(uint32_t fromPinIndex, uint32_t toPinIndex) {
    m_Links.push_back(GraphLink{ fromPinIndex, toPinIndex });
    m_bDirty = true;
}

void NodeEditorGraph::RemoveLink(uint32_t linkIndex) {
    if (linkIndex >= m_Links.size()) return;
    m_Links.erase(m_Links.begin() + linkIndex);
    m_bDirty = true;
}

void NodeEditorGraph::Clear() {
    m_Nodes.clear();
    m_Links.clear();
    m_bDirty = true;
}

void NodeEditorGraph::Render() {
    ZoneScopedN("NodeEditorGraph::Render");
    if (m_Nodes.empty()) {
        return;
    }

    static ed::EditorContext* s_Context = nullptr;
    if (!s_Context) {
        s_Context = ed::CreateEditor();
    }

    ed::SetCurrentEditor(s_Context);
    ed::Begin("VanguardNodeEditor");

    for (size_t n = 0; n < m_Nodes.size(); ++n) {
        const GraphNode& node = m_Nodes[n];
        const ed::NodeId nodeId = static_cast<ed::NodeId>(n + 1);

        ed::BeginNode(nodeId);
        ImGui::Text("%s", node.Title.c_str());
        ImGui::Separator();

        // Input pins.
        for (size_t p = 0; p < node.Inputs.size(); ++p) {
            const ed::PinId pinId = static_cast<ed::PinId>(n * 1000 + p + 1);
            ed::BeginPin(pinId, ed::PinKind::Input);
            ImGui::Text("%s", node.Inputs[p].Name.c_str());
            ed::EndPin();
        }

        ImGui::Dummy(ImVec2(0.0f, 8.0f));

        // Output pins.
        const size_t inputCount = node.Inputs.size();
        for (size_t p = 0; p < node.Outputs.size(); ++p) {
            const ed::PinId pinId = static_cast<ed::PinId>(n * 1000 + inputCount + p + 1);
            ed::BeginPin(pinId, ed::PinKind::Output);
            ImGui::Text("%s", node.Outputs[p].Name.c_str());
            ed::EndPin();
        }

        ed::EndNode();

        // Persist editor positions back into the graph model.
        const ImVec2 pos = ed::GetNodePosition(nodeId);
        m_Nodes[n].PosX = pos.x;
        m_Nodes[n].PosY = pos.y;
    }

    // Render links between pins.
    for (size_t l = 0; l < m_Links.size(); ++l) {
        const GraphLink& link = m_Links[l];
        const ed::LinkId linkId = static_cast<ed::LinkId>(l + 1);
        const ed::PinId fromPin = static_cast<ed::PinId>(link.FromPin);
        const ed::PinId toPin = static_cast<ed::PinId>(link.ToPin);
        ed::Link(linkId, fromPin, toPin);
    }

    ed::End();
}

} // namespace Vanguard::Editor