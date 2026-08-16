#pragma once
#include <string>
#include <vector>
#include <glm/glm.hpp>

namespace Vanguard::Asset {

// ==========================================
// Binary Mesh Asset Baker
// ==========================================
// Converts raw CPU vertex/index data into the runtime .vmesh binary format.
// The on-disk layout maps 1:1 with the GPU vertex layout so meshes can be
// loaded directly into VMA staging buffers with zero parsing overhead.
struct VertexPBR {
    glm::vec3 Position;
    glm::vec3 Normal;
    glm::vec4 Tangent;
    glm::vec2 TexCoord;
};

class MeshBaker {
public:
    MeshBaker() = default;
    ~MeshBaker() = default;

    // Serializes vertices/indices to <outputPath> in .vmesh format.
    // Returns true on success, false if the file could not be opened or written.
    bool BakeToBinaryVMesh(
        const std::string& outputPath,
        const std::vector<VertexPBR>& vertices,
        const std::vector<uint32_t>& indices,
        const glm::vec3& minBounds,
        const glm::vec3& maxBounds
    );

    // Computes the tight bounding box of the given vertex stream.
    static glm::vec3 ComputeMinBounds(const std::vector<VertexPBR>& vertices);
    static glm::vec3 ComputeMaxBounds(const std::vector<VertexPBR>& vertices);
};

} // namespace Vanguard::Asset