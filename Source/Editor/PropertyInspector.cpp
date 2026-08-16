#include "Editor/PropertyInspector.h"
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

} // namespace Vanguard::Editor