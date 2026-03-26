//
//  DayStepRNUITests.swift
//  DayStepRNUITests
//
//  Created by JongHanNa on 3/24/26.
//

import XCTest

final class DayStepRNUITests: XCTestCase {

  var app: XCUIApplication!

  /// 스크린샷 저장 경로 (테스트 러너 앱의 Documents)
  static let screenshotDir: URL = {
    FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
      .appendingPathComponent("screenshots")
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

  /// React Native Pressable은 XCUITest에서 button 또는 other로 잡힐 수 있음
  @MainActor
  private func findElement(_ identifier: String, timeout: TimeInterval = 5) -> XCUIElement? {
    let button = app.buttons[identifier]
    if button.waitForExistence(timeout: timeout) { return button }
    let other = app.otherElements[identifier]
    if other.waitForExistence(timeout: 2) { return other }
    return nil
  }

  @MainActor
  func testScreenshots() {
    // 앱 로딩 대기 (React Native 초기 렌더링)
    guard let firstTab = findElement("tab_Home", timeout: 30) else {
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
    firstTab.tap()
    sleep(1)

    if let sleepButton = findElement("feature_sleep") {
      sleepButton.tap()
      sleep(8) // 수면 기록 fetch 대기 (Supabase 쿼리 + 네이티브 렌더링)
      saveScreenshot("04_SleepGarden")
      app.swipeRight()
      sleep(1)
    } else {
      app.swipeUp()
      sleep(1)
      if let sleepButton = findElement("feature_sleep", timeout: 3) {
        sleepButton.tap()
        sleep(3)
        saveScreenshot("04_SleepGarden")
        app.swipeRight()
        sleep(1)
      }
    }

    // ─── 5. 청소/정리하기 (Home → 서브스크린) ───
    firstTab.tap()
    sleep(1)
    app.swipeDown() // 스크롤 맨 위로 복귀
    sleep(1)

    if let cleaningButton = findElement("feature_cleaning") {
      cleaningButton.tap()
      sleep(3)
      saveScreenshot("05_Cleaning")
      app.swipeRight()
      sleep(1)
    } else {
      app.swipeUp()
      sleep(1)
      if let cleaningButton = findElement("feature_cleaning", timeout: 3) {
        cleaningButton.tap()
        sleep(3)
        saveScreenshot("05_Cleaning")
        app.swipeRight()
        sleep(1)
      }
    }

    // ─── 6. Projects (Home → 서브스크린) ───
    firstTab.tap()
    sleep(1)
    app.swipeDown() // 스크롤 맨 위로 복귀
    sleep(1)

    if let projectsButton = findElement("feature_projects") {
      projectsButton.tap()
      sleep(3)
      saveScreenshot("06_Projects")
      app.swipeRight()
      sleep(1)
    } else {
      app.swipeUp()
      sleep(1)
      if let projectsButton = findElement("feature_projects", timeout: 3) {
        projectsButton.tap()
        sleep(3)
        saveScreenshot("06_Projects")
        app.swipeRight()
        sleep(1)
      }
    }

    // ─── 7. ADHD 이해하기 (Home → 서브스크린) ───
    firstTab.tap()
    sleep(1)
    app.swipeDown()
    sleep(1)

    if let adhdButton = findElement("feature_adhd-understanding") {
      adhdButton.tap()
      sleep(3)
      saveScreenshot("07_ADHD")
      app.swipeRight()
      sleep(1)
    } else {
      app.swipeUp()
      sleep(1)
      if let adhdButton = findElement("feature_adhd-understanding", timeout: 3) {
        adhdButton.tap()
        sleep(3)
        saveScreenshot("07_ADHD")
        app.swipeRight()
        sleep(1)
      }
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
    // Planner 탭 재진입 (1페이지 상태 보장)
    if let plannerTab2 = findElement("tab_Planner") {
      plannerTab2.tap()
      sleep(2)
    }
    // LiquidGlassMenu 트리거 → ActionSheet에서 "주" 선택
    if let viewMenu = findElement("planner_view_menu", timeout: 10) {
      viewMenu.tap()
      sleep(1)
      let weekButton = app.sheets.buttons["주"]
      if weekButton.waitForExistence(timeout: 5) {
        weekButton.tap()
        sleep(3)
        saveScreenshot("10_TimeBlock")
      }
    }
  }
}
