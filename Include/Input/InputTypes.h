#pragma once
#include <cstdint>
#include <vector>

namespace Vanguard::Input {

enum class EventType : uint32_t {
    None = 0,
    KeyPressed,
    KeyReleased,
    MouseButtonPressed,
    MouseButtonReleased,
    MouseMoved,
    MouseScrolled,
    TouchDown,
    TouchUp,
    TouchMoved,
    WindowResized,
    WindowClosed
};

struct InputEvent {
    EventType Type = EventType::None;
    
    // Keyboard event data
    struct {
        int32_t KeyCode;
        bool Repeat;
    } Key;
    
    // Mouse event data
    struct {
        int32_t Button;
        int32_t X;
        int32_t Y;
    } MouseButton;
    
    struct {
        int32_t X;
        int32_t Y;
    } MouseMove;
    
    struct {
        float XOffset;
        float YOffset;
    } MouseScroll;
    
    // Touch event data
    struct {
        int32_t TouchId;
        int32_t X;
        int32_t Y;
        float Pressure;  // 0.0 to 1.0
    } Touch;
    
    // Window event data
    struct {
        uint32_t Width;
        uint32_t Height;
    } WindowResize;
};

class IInputSystem {
public:
    virtual ~IInputSystem() = default;
    
    // Event processing
    virtual void OnEvent(const InputEvent& event) = 0;
    
    // Input state queries
    virtual bool IsKeyPressed(int32_t keycode) const = 0;
    virtual bool IsMouseButtonPressed(int32_t button) const = 0;
    virtual std::pair<int32_t, int32_t> GetMousePosition() const = 0;
    virtual std::pair<float, float> GetMouseDelta() const = 0;
    
    // Touch input (for mobile)
    virtual size_t GetTouchCount() const = 0;
    virtual std::pair<int32_t, int32_t> GetTouchPosition(size_t index) const = 0;
    
    // Clear state each frame
    virtual void NewFrame() = 0;
};

} // namespace Vanguard::Input