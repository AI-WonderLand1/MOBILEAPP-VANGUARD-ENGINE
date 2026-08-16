// ============================================================================
// Standard PBR Material Package Binary
// ============================================================================
// Compile the reference standard PBR material and embed the resulting package:
//
//     matc -p all -a opengl -a vulkan standard_pbr.mat -o standard_pbr.filamat
//     xxd -i standard_pbr.filamat > StandardPbrPackage.inc
//
// This placeholder defines an empty package so the editor links cleanly; with
// STANDARD_PBR_PACKAGE_SIZE == 0, FilamentSceneSetup gracefully skips
// material creation until a real package is embedded.

#include <cstddef>
#include <cstdint>

extern const uint8_t STANDARD_PBR_PACKAGE[] = {};
extern const size_t STANDARD_PBR_PACKAGE_SIZE = 0;