#include "Input/InputTypes.h"
#include <array>
#include <algorithm>

namespace Vanguard::Input {

class InputSystem final : public IInputSystem {
public:
    InputSystem() = default;
    ~InputSystem() override = default;

    void OnEvent(const InputEvent& event) override {
        switch (event.Type) {
            case EventType::KeyPressed:
                m_Keys[event.Key.KeyCode] = true;
                break;
            case EventType::KeyReleased:
                m_Keys[event.Key.KeyCode] = false;
                break;
            case EventType::MouseButtonPressed:
                m_MouseButtons[event.MouseButton.Button] = true;
                m_LastMousePosition = {event.MouseButton.X, event.MouseButton.Y};
                break;
            case EventType::MouseButtonReleased:
                m_MouseButtons[event.MouseButton.Button] = false;
                break;
            case EventType::MouseMoved:
                {
                    auto currentPos = std::make_pair(event.MouseMove.X, event.MouseMove.Y);
                    m_MouseDelta = {
                        currentPos.first - m_LastMousePosition.first,
                        currentPos.second - m_LastMousePosition.second
                    };
                    m_LastMousePosition = currentPos;
                }
                break;
            case EventType::MouseScrolled:
                m_MouseScroll = {event.MouseScroll.XOffset, event.MouseScroll.YOffset};
                break;
            case EventType::TouchDown:
                if (m_Touches.size() < MAX_TOUCHES) {
                    TouchState touch;
                    touch.Active = true;
                    touch.Id = event.Touch.TouchId;
                    touch.Position = {event.Touch.X, event.Touch.Y};
                    m_Touches.push_back(touch);
                }
                break;
            case EventType::TouchUp:
                for (auto& touch : m_Touches) {
                    if (touch.Id == event.Touch.TouchId) {
                        touch.Active = false;
                        break;
                    }
                }
                break;
            case EventType::TouchMoved:
                for (auto& touch : m_Touches) {
                    if (touch.Id == event.Touch.TouchId) {
                        touch.Position = {event.Touch.X, event.Touch.Y};
                        break;
                    }
                }
                break;
            case EventType::WindowResized:
                m_WindowSize = {event.WindowResize.Width, event.WindowResize.Height};
                break;
            default:
                break;
        }
    }

    bool IsKeyPressed(int32_t keycode) const override {
        if (keycode < 0 || keycode >= static_cast<int32_t>(m_Keys.size()))
            return false;
        return m_Keys[keycode];
    }

    bool IsMouseButtonPressed(int32_t button) const override {
        if (button < 0 || button >= static_cast<int32_t>(m_MouseButtons.size()))
            return false;
        return m_MouseButtons[button];
    }

    std::pair<int32_t, int32_t> GetMousePosition() const override {
        return m_LastMousePosition;
    }

    std::pair<float, float> GetMouseDelta() const override {
        return m_MouseDelta;
    }

    std::pair<float, float> GetMouseScroll() const override {
        return m_MouseScroll;
    }

    size_t GetTouchCount() const override {
        size_t count = 0;
        for (const auto& touch : m_Touches) {
            if (touch.Active) count++;
        }
        return count;
    }

    std::pair<int32_t, int32_t> GetTouchPosition(size_t index) const override {
        size_t activeIndex = 0;
        for (const auto& touch : m_Touches) {
            if (touch.Active) {
                if (activeIndex == index) {
                    return touch.Position;
                }
                activeIndex++;
            }
        }
        return {-1, -1}; // Invalid touch
    }

    std::pair<uint32_t, uint32_t> GetWindowSize() const override {
        return m_WindowSize;
    }

    void NewFrame() override {
        // Reset per-frame states
        m_MouseDelta = {0.0f, 0.0f};
        m_MouseScroll = {0.0f, 0.0f};
        
        // Note: We don't reset key/mouse button states here as they represent
        // current held state. Only delta values like mouse movement and scroll
        // should be reset each frame.
    }

private:
    static constexpr size_t MAX_KEYS = 512;
    static constexpr size_t MAX_MOUSE_BUTTONS = 32;
    static constexpr size_t MAX_TOUCHES = 10;

    struct TouchState {
        bool Active = false;
        int32_t Id = -1;
        std::pair<int32_t, int32_t> Position = {-1, -1};
    };

    std::array<bool, MAX_KEYS> m_Keys{};
    std::array<bool, MAX_MOUSE_BUTTONS> m_MouseButtons{};
    std::pair<int32_t, int32_t> m_LastMousePosition{0, 0};
    std::pair<float, float> m_MouseDelta{0.0f, 0.0f};
    std::pair<float, float> m_MouseScroll{0.0f, 0.0f};
    std::vector<TouchState> m_Touches;
    std::pair<uint32_t, uint32_t> m_WindowSize{1920, 1080};
};

} // namespace Vanguard::Input