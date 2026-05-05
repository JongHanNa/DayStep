import AppIntents

/// Siri에 등록할 한국어 단축어 문구
@available(iOS 16.0, *)
struct DayStepShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AddTodoIntent(),
      phrases: [
        "\(.applicationName)에 할일 추가",
        "\(.applicationName)에 일정 추가",
        "\(.applicationName) 할일 등록",
      ],
      shortTitle: "할일 추가",
      systemImageName: "plus.circle"
    )
  }
}
