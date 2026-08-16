#include "Asset/MeshBaker.h"
#include <fstream>
#include <vector>
#include <algorithm>
#include <limits>
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

glm::vec3 MeshBaker::ComputeMinBounds(const std::vector<VertexPBR>& vertices) {
    glm::vec3 minBounds(std::numeric_limits<float>::max());
    for (const VertexPBR& vertex : vertices) {
        minBounds = glm::min(minBounds, vertex.Position);
    }
    return minBounds;
}

glm::vec3 MeshBaker::ComputeMaxBounds(const std::vector<VertexPBR>& vertices) {
    glm::vec3 maxBounds(std::numeric_limits<float>::lowest());
    for (const VertexPBR& vertex : vertices) {
        maxBounds = glm::max(maxBounds, vertex.Position);
    }
    return maxBounds;
}

} // namespace Vanguard::Asset