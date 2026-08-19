#include "Editor/ConsoleSystem.h"
#include "Core/Engine.h"
#include "Scene/SceneGraph.h"
#include "Scene/Components/StaticMeshComponent.h"
#include "Reflection/ReflectionRegistry.h"
#include "Reflection/Macros.h"
#include <sstream>
#include <algorithm>
#include <glm/gtc/type_ptr.hpp>

namespace Vanguard::Editor {

ConsoleSystem::ConsoleSystem() {
    RegisterDefaultCommands();
}

void ConsoleSystem::RegisterCommand(const std::string& name, const std::string& help, ConsoleCommandHandler handler) {
    m_Commands[name] = std::move(handler);
    m_CommandHelp[name] = help;
}

void ConsoleSystem::AddLog(const std::string& message, ConsoleLogEntry::Type type) {
    m_Logs.push_back({type, message});
}

void ConsoleSystem::Clear() {
    m_Logs.clear();
}

void ConsoleSystem::Execute(const std::string& commandLine) {
    if (commandLine.empty()) return;

    AddLog("> " + commandLine, ConsoleLogEntry::Type::Command);
    auto tokens = Tokenize(commandLine);
    if (tokens.empty()) return;

    auto it = m_Commands.find(tokens[0]);
    if (it != m_Commands.end()) {
        std::vector<std::string> args(tokens.begin() + 1, tokens.end());
        it->second(args);
    } else {
        AddLog("Unknown command: " + tokens[0], ConsoleLogEntry::Type::Error);
    }
}

std::vector<std::string> ConsoleSystem::Tokenize(const std::string& commandLine) {
    std::vector<std::string> tokens;
    std::stringstream ss(commandLine);
    std::string item;
    while (ss >> item) {
        tokens.push_back(item);
    }
    return tokens;
}

void ConsoleSystem::RegisterDefaultCommands() {
    RegisterCommand("help", "List all commands", [this](const auto& args) {
        AddLog("Available commands:");
        for (const auto& [name, help] : m_CommandHelp) {
            AddLog("  " + name + " - " + help);
        }
    });

    RegisterCommand("clear", "Clear console logs", [this](const auto& args) {
        Clear();
    });

    RegisterCommand("list_objects", "List all actors in the scene", [this](const auto& args) {
        auto& world = Engine::Get().GetSceneGraph();
        AddLog("Scene Actors (" + std::to_string(world.GetActorCount()) + "):");
        for (const auto& actor : world.GetActors()) {
            AddLog("  " + actor->GetName() + " [" + actor->GetTag() + "]");
        }
    });

    RegisterCommand("set_variable", "Set a reflected property. Usage: set_variable <actor> <property> <value>", [this](const auto& args) {
        if (args.size() < 3) {
            AddLog("Usage: set_variable <actor_name> <property_name> <value...>", ConsoleLogEntry::Type::Warning);
            return;
        }

        const std::string& actorName = args[0];
        const std::string& propName = args[1];

        auto& world = Engine::Get().GetSceneGraph();
        auto actor = world.FindActorByName(actorName);
        if (!actor) {
            AddLog("Actor not found: " + actorName, ConsoleLogEntry::Type::Error);
            return;
        }

        const auto* meta = &actor->GetClass();
        void* instance = actor.get();

        // Search in actor or its components
        const Reflection::PropertyMetadata* foundProp = nullptr;
        void* targetInstance = nullptr;

        auto findInMeta = [&](const Reflection::ClassMetadata& m, void* inst) -> bool {
            for (const auto& p : m.Properties) {
                if (p.Name == propName) {
                    foundProp = &p;
                    targetInstance = inst;
                    return true;
                }
            }
            return false;
        };

        if (!findInMeta(*meta, instance)) {
            for (const auto& comp : actor->GetComponents()) {
                if (auto* smc = dynamic_cast<StaticMeshComponent*>(comp.get())) {
                    if (findInMeta(smc->GetClass(), smc)) break;
                }
            }
        }

        if (!foundProp) {
            AddLog("Property '" + propName + "' not found on actor '" + actorName + "'", ConsoleLogEntry::Type::Error);
            return;
        }

        void* addr = static_cast<char*>(targetInstance) + foundProp->Offset;

        try {
            switch (foundProp->Type) {
                case Reflection::TypeKind::Float:
                    *static_cast<float*>(addr) = std::stof(args[2]);
                    break;
                case Reflection::TypeKind::Int32:
                    *static_cast<int32_t*>(addr) = std::stoi(args[2]);
                    break;
                case Reflection::TypeKind::Bool:
                    *static_cast<bool*>(addr) = (args[2] == "true" || args[2] == "1");
                    break;
                case Reflection::TypeKind::Vec3:
                    if (args.size() >= 5) {
                        glm::vec3* v = static_cast<glm::vec3*>(addr);
                        v->x = std::stof(args[2]);
                        v->y = std::stof(args[3]);
                        v->z = std::stof(args[4]);
                    }
                    break;
                case Reflection::TypeKind::String:
                    *static_cast<std::string*>(addr) = args[2];
                    break;
                default:
                    AddLog("Unsupported property type for set_variable", ConsoleLogEntry::Type::Error);
                    return;
            }
            AddLog("Successfully set " + propName + " to " + args[2]);
        } catch (...) {
            AddLog("Failed to parse value for " + propName, ConsoleLogEntry::Type::Error);
        }
    });
}

} // namespace Vanguard::Editor
