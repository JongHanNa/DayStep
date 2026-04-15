//
//  DayStepRNUITests.swift
//  DayStepRNUITests
//
//  Created by JongHanNa on 3/24/26.
//

import XCTest

final class DayStepRNUITests: XCTestCase {

  var app: XCUIApplication!

  /// 스크린샷 저장 경로 (/tmp는 호스트와 공유되어 추출 용이)
  static let screenshotDir: URL = {
    URL(fileURLWithPath: "/tmp/daystep_screenshots")
  }()

  @MainActor
  override func setUp() {
    super.setUp()
    continueAfterFailure = true

    // 스크린샷 디렉토리 생성
    try? FileManager.default.createDirectory(
      at: Self.screenshotDir, withIntermediateDirectories: true)

    app = XCUIApplication()
    setupSnapshot(app)
    app.launchArguments.append("--uitesting")
    app.launch()
  }

  override func tearDown() {
    app = nil
    super.tearDown()
  }

  /// 스크린샷을 PNG로 저장 + XCTest 첨부
  @MainActor
  private func saveScreenshot(_ name: String) {
    let screenshot = XCUIScreen.main.screenshot()
    let attachment = XCTAttachment(screenshot: screenshot)
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)

    // PNG 파일로 직접 저장
    let path = Self.screenshotDir.appendingPathComponent("\(name).png")
    do {
      try screenshot.pngRepresentation.write(to: path, options: .atomic)
      NSLog("📸 Screenshot saved: \(path.path)")
    } catch {
      NSLog("⚠️ Failed to save screenshot \(name): \(error)")
    }
  }

  /// accessibilityIdentifier로 요소 검색 (전체 뷰 트리)
  @MainActor
  private func findElement(_ identifier: String, timeout: TimeInterval = 5) -> XCUIElement? {
    let predicate = NSPredicate(format: "identifier == %@", identifier)
    let element = app.descendants(matching: .any).matching(predicate).firstMatch
    if element.waitForExistence(timeout: timeout) { return element }
    return nil
  }

  /// 화면에 보이는 텍스트(label)를 탭하는 헬퍼
  @MainActor
  private func tapLabel(_ text: String, timeout: TimeInterval = 5) -> Bool {
    // staticTexts에서 먼저 찾기 (accessible=false인 요소)
    let staticText = app.staticTexts[text]
    if staticText.waitForExistence(timeout: timeout) {
      staticText.tap()
      return true
    }
    // buttons에서 정확히 찾기
    let button = app.buttons[text]
    if button.waitForExistence(timeout: 1) {
      button.tap()
      return true
    }
    // accessible=true 컨테이너: label에 텍스트가 포함된 요소 검색
    let predicate = NSPredicate(format: "label CONTAINS %@", text)
    let match = app.descendants(matching: .any).matching(predicate).firstMatch
    if match.waitForExistence(timeout: 1) {
      match.tap()
      return true
    }
    return false
  }

  /// 스크롤하면서 텍스트 요소를 찾아 탭
  @MainActor
  private func scrollAndTapLabel(_ text: String, maxScrolls: Int = 5) -> Bool {
    if tapLabel(text, timeout: 3) { return true }
    for _ in 0..<maxScrolls {
      app.swipeUp()
      sleep(1)
      if tapLabel(text, timeout: 2) { return true }
    }
    return false
  }

  /// Home 탭으로 복귀 + 스크롤 초기화
  @MainActor
  private func goHome() {
    if let homeTab = findElement("tab_Home", timeout: 3) {
      homeTab.tap()
      sleep(2)
      // 스크롤 맨 위로 복귀 (여러 번 swipeDown)
      app.swipeDown()
      app.swipeDown()
      sleep(1)
    }
  }

  @MainActor
  func testScreenshots() {
    // 앱 로딩 대기 (React Native 초기 렌더링)
    guard findElement("tab_Home", timeout: 30) != nil else {
      XCTFail("Tab bar should appear after app loads")
      return
    }

    // ─── 1. Home (대시보드) ───
    sleep(5) // Metro 번들 로드 + 초기 렌더링 완료 대기
    saveScreenshot("01_Home")

    // ─── 2. Planner (할일 관리) ───
    if let plannerTab = findElement("tab_Planner") {
      plannerTab.tap()
      sleep(2)
    }
    saveScreenshot("02_Planner")

    // ─── 3. Execute (포모도로 타이머) ───
    if let executeTab = findElement("tab_Execute") {
      executeTab.tap()
      sleep(2)
    }
    saveScreenshot("03_Execute")

    // ─── 4. 수면 정원 (Home → 서브스크린) ───
    goHome()
    if scrollAndTapLabel("수면 정원") {
      sleep(8) // 수면 기록 fetch 대기 (Supabase 쿼리 + 네이티브 렌더링)
      saveScreenshot("04_SleepGarden")
      app.swipeRight()
      sleep(1)
    }

    // ─── 5. 청소/정리하기 (Home → 서브스크린) ───
    goHome()
    if scrollAndTapLabel("청소/정리하기") {
      sleep(3)
      saveScreenshot("05_Cleaning")
      app.swipeRight()
      sleep(1)
    }

    // ─── 6. Projects (Home → 서브스크린) ───
    goHome()
    // "계획 세우기" 섹션까지 스크롤
    app.swipeUp()
    sleep(1)
    app.swipeUp()
    sleep(1)
    // "내 계획 보기" 텍스트 위치를 기준으로 카드 중앙(-30pt 위)을 탭
    let projectsLabel = app.staticTexts["내 계획 보기"]
    if projectsLabel.waitForExistence(timeout: 5) {
      let cardCenter = projectsLabel.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: -1.5))
      cardCenter.tap()
      sleep(3)
      saveScreenshot("06_Projects")
      app.swipeRight()
      sleep(1)
    }

    // ─── 7. ADHD 이해하기 (Home → 서브스크린) ───
    goHome()
    if scrollAndTapLabel("ADHD 이해하기") {
      sleep(3)
      saveScreenshot("07_ADHD")
      app.swipeRight()
      sleep(1)
    }

    // ─── 8. 연료/원동력 노트 (Notes 탭) ───
    if let notesTab = findElement("tab_Notes") {
      notesTab.tap()
      sleep(2)
    }
    saveScreenshot("08_Notes")

    // ─── 9. 리플렉션/아이젠하워 (Planner 2페이지) ───
    if let plannerTab = findElement("tab_Planner") {
      plannerTab.tap()
      sleep(2)
      app.swipeLeft() // 2페이지(리플렉션)로 이동
      sleep(2)
    }
    saveScreenshot("09_Reflection")

    // ─── 10. 타임블록킹 주간뷰 (Planner 뷰 전환) ───
    if let plannerTab2 = findElement("tab_Planner") {
      plannerTab2.tap()
      sleep(3)
    }
    // LiquidGlassMenu 트리거 → 네이티브 메뉴에서 "주" 선택
    if let viewMenu = findElement("planner_view_menu", timeout: 10) {
      viewMenu.tap()
      sleep(1)
      // iOS 26 네이티브 SwiftUI Menu → buttons["주"] 시도
      let weekButton = app.buttons["주"]
      if weekButton.waitForExistence(timeout: 3) {
        weekButton.tap()
        sleep(3)
        saveScreenshot("10_TimeBlock")
      } else {
        // ActionSheet 폴백
        let sheetButton = app.sheets.buttons["주"]
        if sheetButton.waitForExistence(timeout: 3) {
          sheetButton.tap()
          sleep(3)
          saveScreenshot("10_TimeBlock")
        }
      }
    }
  }
}
