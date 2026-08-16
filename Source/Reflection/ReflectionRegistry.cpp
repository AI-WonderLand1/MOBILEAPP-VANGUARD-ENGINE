#include "Reflection/ReflectionRegistry.h"
#include "Reflection/Macros.h"

namespace Vanguard::Reflection {

void ReflectionRegistry::RegisterClass(const ClassMetadata& metadata) {
    if (metadata.ClassName.empty()) {
        return;
    }
    m_Classes[metadata.ClassName] = metadata;
}

const ClassMetadata* ReflectionRegistry::GetClass(std::string_view className) const {
    const auto it = m_Classes.find(std::string(className));
    return it != m_Classes.end() ? &it->second : nullptr;
}

std::vector<std::string> ReflectionRegistry::GetRegisteredClassNames() const {
    std::vector<std::string> names;
    names.reserve(m_Classes.size());
    for (const auto& [name, metadata] : m_Classes) {
        names.push_back(name);
    }
    return names;
}

void ReflectionRegistry::Reset() {
    m_Classes.clear();
}

} // namespace Vanguard::Reflection