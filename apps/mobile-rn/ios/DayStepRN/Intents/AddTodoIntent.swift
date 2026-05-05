import AppIntents

/// Siri Shortcuts: "DayStep에 할일 추가"
/// 사용자가 음성으로 할일 내용을 말하면 App Group UserDefaults에 저장
/// 메인 앱이 포그라운드될 때 useExternalInput 훅에서 읽어감
@available(iOS 16.0, *)
struct AddTodoIntent: AppIntent {
  static var title: LocalizedStringResource = "할일 추가"
  static var description = IntentDescription("DayStep에 새 할일을 추가합니다")

  @Parameter(title: "내용", description: "추가할 할일 내용")
  var text: String

  static var parameterSummary: some ParameterSummary {
    Summary("DayStep에 \(\.$text) 추가")
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    let appGroupID = "group.com.daystep.app"
    let siriTextKey = "siri_todo_pending"

    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      return .result(dialog: "앱 설정 오류가 발생했어요")
    }

    defaults.set(text, forKey: siriTextKey)
    defaults.synchronize()

    return .result(dialog: "DayStep에 '\(text)' 추가할게요! 앱을 열어서 확인해주세요.")
  }
}
