#pragma once
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>
#include <cstdint>

namespace Vanguard {

// ==========================================
// Asset Registry (UAssetRegistry analogue)
// ==========================================
// Tracks every discovered asset by GUID string, mirroring the UE asset
// registry. The Content Browser and the drag-drop path of the Property
// Inspector resolve asset GUIDs against this registry.
enum class AssetType : uint8_t {
    StaticMesh,
    Material,
    Texture2D,
    SoundWave,
    SkeletalMesh,
    Blueprint,
    Unknown,
};

struct AssetRecord {
    std::string GUID;
    std::string Name;
    std::string Path;       // On-disk path relative to the content root.
    std::string Extension;  // e.g. "vmesh", "uasset", "mat"
    AssetType Type = AssetType::Unknown;
    uint64_t SizeBytes = 0;
};

class AssetRegistry {
public:
    static AssetRegistry& Get() {
        static AssetRegistry s_Instance;
        return s_Instance;
    }

    // Registration
    AssetRecord& RegisterAsset(AssetRecord record);
    void RemoveAsset(std::string_view guid);

    // Lookup
    [[nodiscard]] const AssetRecord* FindAsset(std::string_view guid) const;
    [[nodiscard]] AssetRecord* FindAssetMutable(std::string_view guid);
    [[nodiscard]] std::vector<AssetRecord> FindAssetsByType(AssetType type) const;

    // Discovery
    void ScanDirectory(const std::string& directoryPath);
    void Clear();

    [[nodiscard]] size_t GetAssetCount() const noexcept { return m_Assets.size(); }

    // Maps a file extension to an AssetType.
    static AssetType InferAssetType(std::string_view extension);

private:
    AssetRegistry() = default;
    ~AssetRegistry() = default;

    AssetRegistry(const AssetRegistry&) = delete;
    AssetRegistry& operator=(const AssetRegistry&) = delete;

    std::unordered_map<std::string, AssetRecord> m_Assets;
};

} // namespace Vanguard