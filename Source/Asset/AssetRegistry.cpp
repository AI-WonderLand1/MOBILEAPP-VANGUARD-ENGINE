#include "Asset/AssetRegistry.h"
#include <algorithm>
#include <cstdio>
#include <filesystem>
#include <fstream>
#include <random>
#include <tracy/Tracy.hpp>

namespace Vanguard {

namespace fs = std::filesystem;

namespace {

std::string GenerateGUID() {
    static std::mt19937_64 rng{std::random_device{}()};
    std::uniform_int_distribution<uint64_t> dist;
    char buffer[33];
    std::snprintf(buffer, sizeof(buffer), "%016llx%016llx",
                  static_cast<unsigned long long>(dist(rng)),
                  static_cast<unsigned long long>(dist(rng)));
    return std::string(buffer);
}

} // namespace

AssetRecord& AssetRegistry::RegisterAsset(AssetRecord record) {
    if (record.GUID.empty()) {
        record.GUID = GenerateGUID();
    }
    record.Type = InferAssetType(record.Extension);
    return m_Assets[record.GUID] = std::move(record);
}

void AssetRegistry::RemoveAsset(std::string_view guid) {
    m_Assets.erase(std::string(guid));
}

const AssetRecord* AssetRegistry::FindAsset(std::string_view guid) const {
    const auto it = m_Assets.find(std::string(guid));
    return it != m_Assets.end() ? &it->second : nullptr;
}

AssetRecord* AssetRegistry::FindAssetMutable(std::string_view guid) {
    auto it = m_Assets.find(std::string(guid));
    return it != m_Assets.end() ? &it->second : nullptr;
}

std::vector<AssetRecord> AssetRegistry::FindAssetsByType(AssetType type) const {
    std::vector<AssetRecord> matches;
    for (const auto& [guid, record] : m_Assets) {
        if (record.Type == type) {
            matches.push_back(record);
        }
    }
    return matches;
}

void AssetRegistry::ScanDirectory(const std::string& directoryPath) {
    ZoneScopedN("AssetRegistry::ScanDirectory");

    const fs::path root(directoryPath);
    if (!fs::exists(root) || !fs::is_directory(root)) return;

    std::error_code ec;
    for (fs::recursive_directory_iterator it(root, fs::directory_options::skip_permission_denied, ec), end;
         it != end && !ec; it.increment(ec)) {
        const fs::path entry = *it;
        if (!fs::is_regular_file(entry)) continue;

        AssetRecord record;
        record.Path = fs::relative(entry, root).generic_string();
        record.Name = entry.stem().string();
        record.Extension = entry.extension().string().empty()
                               ? std::string()
                               : entry.extension().string().substr(1);
        record.SizeBytes = static_cast<uint64_t>(fs::file_size(entry, ec));
        record.Type = InferAssetType(record.Extension);

        // Stable registration keyed by relative path.
        m_Assets[record.Path] = std::move(record);
    }
}

void AssetRegistry::Clear() {
    m_Assets.clear();
}

AssetType AssetRegistry::InferAssetType(std::string_view extension) {
    if (extension == "vmesh") return AssetType::StaticMesh;
    if (extension == "obj" || extension == "gltf" || extension == "glb" || extension == "fbx") {
        return AssetType::StaticMesh;
    }
    if (extension == "mat" || extension == "uasset") return AssetType::Material;
    if (extension == "png" || extension == "jpg" || extension == "jpeg" || extension == "tga" ||
        extension == "ktx2" || extension == "dds") {
        return AssetType::Texture2D;
    }
    if (extension == "wav" || extension == "ogg" || extension == "mp3") return AssetType::SoundWave;
    if (extension == "bp") return AssetType::Blueprint;
    return AssetType::Unknown;
}

} // namespace Vanguard