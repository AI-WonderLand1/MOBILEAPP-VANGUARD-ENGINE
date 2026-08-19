#pragma once
#include <string>
#include <vector>
#include <functional>
#include <map>
#include <memory>

namespace Vanguard::Editor {

struct ConsoleLogEntry {
    enum class Type { Info, Warning, Error, Command };
    Type LogType;
    std::string Message;
};

using ConsoleCommandHandler = std::function<void(const std::vector<std::string>& args)>;

class ConsoleSystem {
public:
    ConsoleSystem();
    ~ConsoleSystem() = default;

    void RegisterCommand(const std::string& name, const std::string& help, ConsoleCommandHandler handler);
    void Execute(const std::string& commandLine);

    void AddLog(const std::string& message, ConsoleLogEntry::Type type = ConsoleLogEntry::Type::Info);
    void Clear();

    [[nodiscard]] const std::vector<ConsoleLogEntry>& GetLogs() const noexcept { return m_Logs; }
    [[nodiscard]] const std::map<std::string, std::string>& GetCommandsHelp() const noexcept { return m_CommandHelp; }

private:
    void RegisterDefaultCommands();
    std::vector<std::string> Tokenize(const std::string& commandLine);

    std::map<std::string, ConsoleCommandHandler> m_Commands;
    std::map<std::string, std::string> m_CommandHelp;
    std::vector<ConsoleLogEntry> m_Logs;
};

} // namespace Vanguard::Editor
