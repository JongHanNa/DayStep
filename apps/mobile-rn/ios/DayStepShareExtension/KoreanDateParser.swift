import Foundation

/// 한국어 텍스트에서 날짜/시간을 추출하는 파서
/// TypeScript koreanNLP.ts의 Swift 포팅 (간소화)
struct KoreanDateParser {
  struct ParseResult {
    var date: Date?
    var time: (hour: Int, minute: Int)?
    var title: String
  }

  static func parse(_ text: String, reference: Date = Date()) -> ParseResult {
    var working = text.trimmingCharacters(in: .whitespacesAndNewlines)
    var result = ParseResult(date: nil, time: nil, title: text)

    let calendar = Calendar.current

    // --- 날짜 추출 ---

    // 상대 날짜
    let relativePairs: [(String, Int)] = [
      ("글피", 3), ("모레", 2), ("내일", 1), ("오늘", 0)
    ]
    for (keyword, offset) in relativePairs {
      if let range = working.range(of: keyword) {
        result.date = calendar.date(byAdding: .day, value: offset, to: reference)
        working.removeSubrange(range)
        break
      }
    }

    // 다음주 X요일
    if result.date == nil {
      let dayMap: [(String, Int)] = [
        ("일", 1), ("월", 2), ("화", 3), ("수", 4), ("목", 5), ("금", 6), ("토", 7)
      ]
      for (dayName, weekday) in dayMap {
        let patterns = ["다음주 \(dayName)요일", "다음주 \(dayName)", "다음주\(dayName)요일", "다음주\(dayName)"]
        for pattern in patterns {
          if let range = working.range(of: pattern) {
            result.date = nextWeekday(weekday, from: reference, nextWeek: true)
            working.removeSubrange(range)
            break
          }
        }
        if result.date != nil { break }
      }
    }

    // 단독 요일 (다음 해당 요일)
    if result.date == nil {
      let dayMap: [(String, Int)] = [
        ("일요일", 1), ("월요일", 2), ("화요일", 3), ("수요일", 4), ("목요일", 5), ("금요일", 6), ("토요일", 7)
      ]
      for (dayName, weekday) in dayMap {
        if let range = working.range(of: dayName) {
          result.date = nextWeekday(weekday, from: reference, nextWeek: false)
          working.removeSubrange(range)
          break
        }
      }
    }

    // M월 D일
    if result.date == nil {
      if let match = working.range(of: #"(\d{1,2})월\s*(\d{1,2})일"#, options: .regularExpression) {
        let matched = String(working[match])
        let nums = matched.components(separatedBy: CharacterSet.decimalDigits.inverted).filter { !$0.isEmpty }
        if nums.count >= 2, let month = Int(nums[0]), let day = Int(nums[1]),
           month >= 1, month <= 12, day >= 1, day <= 31 {
          var components = calendar.dateComponents([.year], from: reference)
          components.month = month
          components.day = day
          if let d = calendar.date(from: components), d >= reference {
            result.date = d
          } else {
            components.year = (components.year ?? 2026) + 1
            result.date = calendar.date(from: components)
          }
          working.removeSubrange(match)
        }
      }
    }

    // --- 시간 추출 ---

    // 한국어 시간: (오전|오후|저녁|밤|새벽|아침) N시 (M분|반)
    let timePattern = #"(새벽|오전|아침|낮|오후|저녁|밤)?\s*(\d{1,2})시\s*(?:(\d{1,2})분|반)?"#
    if let match = working.range(of: timePattern, options: .regularExpression) {
      let matched = String(working[match])
      let periodPatterns = ["새벽", "오전", "아침", "낮", "오후", "저녁", "밤"]
      var period: String? = nil
      for p in periodPatterns {
        if matched.contains(p) { period = p; break }
      }

      let nums = matched.components(separatedBy: CharacterSet.decimalDigits.inverted).filter { !$0.isEmpty }
      if let hourStr = nums.first, var hour = Int(hourStr) {
        let minute: Int
        if matched.contains("반") {
          minute = 30
        } else if nums.count >= 2, let m = Int(nums[1]) {
          minute = m
        } else {
          minute = 0
        }

        // 시간대 보정
        if let p = period {
          if ["오후", "저녁", "밤"].contains(p) && hour < 12 { hour += 12 }
          if ["오전", "새벽", "아침"].contains(p) && hour == 12 { hour = 0 }
        } else if hour >= 1 && hour <= 6 {
          hour += 12 // 시간대 없이 1~6시면 오후로 추정
        }

        result.time = (hour, minute)
        working.removeSubrange(match)
      }
    }

    // HH:MM 패턴
    if result.time == nil {
      if let match = working.range(of: #"(\d{1,2}):(\d{2})"#, options: .regularExpression) {
        let matched = String(working[match])
        let nums = matched.split(separator: ":").compactMap { Int($0) }
        if nums.count == 2, nums[0] >= 0, nums[0] <= 23, nums[1] >= 0, nums[1] <= 59 {
          result.time = (nums[0], nums[1])
          working.removeSubrange(match)
        }
      }
    }

    // --- 제목 생성 ---
    let cleaned = working
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
    result.title = cleaned.isEmpty ? text.trimmingCharacters(in: .whitespacesAndNewlines) : cleaned

    return result
  }

  /// 다음 특정 요일 계산
  private static func nextWeekday(_ weekday: Int, from date: Date, nextWeek: Bool) -> Date {
    let calendar = Calendar.current
    let current = calendar.component(.weekday, from: date)
    var daysAhead = weekday - current
    if daysAhead <= 0 { daysAhead += 7 }
    if nextWeek { daysAhead += 7 }
    return calendar.date(byAdding: .day, value: daysAhead, to: date) ?? date
  }
}
