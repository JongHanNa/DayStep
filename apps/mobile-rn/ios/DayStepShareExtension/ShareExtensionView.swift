import SwiftUI

/// Share Extension 메인 뷰 — TickTick 스타일 할일 빠른 생성
struct ShareExtensionView: View {
  @Environment(\.dismiss) private var dismiss
  let onClose: () -> Void
  let sharedText: String

  @State private var title: String = ""
  @State private var content: String = ""
  @State private var selectedDate: Date = Date()
  @State private var hasTime: Bool = false
  @State private var showDatePicker: Bool = false
  @State private var isLoading: Bool = false
  @State private var errorMessage: String? = nil
  @State private var showSuccess: Bool = false

  private let supabase = SupabaseClient()
  private let primaryColor = Color(red: 0.231, green: 0.510, blue: 0.965) // #3B82F6

  var body: some View {
    NavigationView {
      VStack(spacing: 0) {
        // 제목 입력
        VStack(alignment: .leading, spacing: 8) {
          TextField("할일 제목", text: $title)
            .font(.system(size: 17, weight: .semibold))
            .padding(.horizontal, 16)
            .padding(.top, 16)

          TextField("설명 (선택)", text: $content)
            .font(.system(size: 15))
            .foregroundColor(.secondary)
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }

        Divider().padding(.horizontal, 16)

        // 날짜/시간 행
        Button(action: { showDatePicker.toggle() }) {
          HStack(spacing: 8) {
            Image(systemName: "calendar")
              .foregroundColor(primaryColor)
              .font(.system(size: 16))

            Text(dateDisplayText)
              .foregroundColor(primaryColor)
              .font(.system(size: 15))

            Spacer()

            Image(systemName: "chevron.right")
              .foregroundColor(.secondary)
              .font(.system(size: 13))
          }
          .padding(.horizontal, 16)
          .padding(.vertical, 14)
        }

        if showDatePicker {
          VStack(spacing: 12) {
            DatePicker(
              "날짜",
              selection: $selectedDate,
              displayedComponents: hasTime ? [.date, .hourAndMinute] : [.date]
            )
            .datePickerStyle(WheelDatePickerStyle())
            .labelsHidden()
            .environment(\.locale, Locale(identifier: "ko_KR"))

            Toggle("시간 설정", isOn: $hasTime)
              .padding(.horizontal, 16)
              .tint(primaryColor)
          }
          .padding(.bottom, 12)
        }

        Divider().padding(.horizontal, 16)

        // 에러 메시지
        if let error = errorMessage {
          Text(error)
            .font(.system(size: 13))
            .foregroundColor(.red)
            .padding(.horizontal, 16)
            .padding(.top, 12)
        }

        // 성공 메시지
        if showSuccess {
          HStack {
            Image(systemName: "checkmark.circle.fill")
              .foregroundColor(.green)
            Text("할일이 추가되었습니다!")
              .font(.system(size: 15, weight: .medium))
              .foregroundColor(.green)
          }
          .padding(.top, 16)
        }

        Spacer()
      }
      .navigationTitle("DayStep")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("취소") { onClose() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button(action: { addTodo() }) {
            Text("추가")
              .font(.system(size: 15, weight: .bold))
              .foregroundColor(.white)
              .padding(.horizontal, 14)
              .padding(.vertical, 7)
              .background(
                (title.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)
                  ? primaryColor.opacity(0.4)
                  : primaryColor
              )
              .cornerRadius(18)
          }
          .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)
          .buttonStyle(PlainButtonStyle())
        }
      }
    }
    .onAppear { parseSharedText() }
  }

  private var dateDisplayText: String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "ko_KR")

    if Calendar.current.isDateInToday(selectedDate) {
      formatter.dateFormat = hasTime ? "'오늘' HH:mm" : "'오늘'"
    } else if Calendar.current.isDateInTomorrow(selectedDate) {
      formatter.dateFormat = hasTime ? "'내일' HH:mm" : "'내일'"
    } else {
      formatter.dateFormat = hasTime ? "yyyy. M. d. HH:mm" : "yyyy. M. d."
    }
    return formatter.string(from: selectedDate)
  }

  private func parseSharedText() {
    let parsed = KoreanDateParser.parse(sharedText)
    title = parsed.title

    if let date = parsed.date {
      selectedDate = date
    }

    if let time = parsed.time {
      var components = Calendar.current.dateComponents([.year, .month, .day], from: selectedDate)
      components.hour = time.hour
      components.minute = time.minute
      if let dateWithTime = Calendar.current.date(from: components) {
        selectedDate = dateWithTime
        hasTime = true
      }
    }
  }

  private func addTodo() {
    let trimmedTitle = title.trimmingCharacters(in: .whitespaces)
    guard !trimmedTitle.isEmpty else { return }

    isLoading = true
    errorMessage = nil

    let scheduleType = hasTime ? "timed" : "anytime"
    let startTime: Date? = hasTime ? selectedDate : Calendar.current.startOfDay(for: selectedDate)

    supabase.insertTodo(
      title: trimmedTitle,
      content: content.trimmingCharacters(in: .whitespaces),
      scheduleType: scheduleType,
      startTime: startTime
    ) { result in
      DispatchQueue.main.async {
        isLoading = false
        switch result {
        case .success:
          showSuccess = true
          // 0.8초 후 자동 닫기
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            onClose()
          }
        case .failure(let error):
          errorMessage = error.localizedDescription
        }
      }
    }
  }
}
