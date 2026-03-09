import XCTest

class DayStepRNUITests: XCTestCase {

  var app: XCUIApplication!

  override func setUp() {
    super.setUp()
    continueAfterFailure = false

    app = XCUIApplication()
    setupSnapshot(app)

    // UI Test 인증 바이패스
    app.launchArguments.append("--uitesting")

    // 환경변수에서 세션 정보 주입 (Snapfile에서 설정)
    if let session = ProcessInfo.processInfo.environment["UITEST_SESSION"] {
      app.launchEnvironment["UITEST_SESSION"] = session
    }
    if let sessionKey = ProcessInfo.processInfo.environment["UITEST_SESSION_KEY"] {
      app.launchEnvironment["UITEST_SESSION_KEY"] = sessionKey
    }

    app.launch()
  }

  override func tearDown() {
    app = nil
    super.tearDown()
  }

  func testScreenshots() {
    // 앱 로딩 대기 (React Native 초기 렌더링)
    let firstTab = app.buttons["tab_Home"]
    let exists = firstTab.waitForExistence(timeout: 30)
    XCTAssertTrue(exists, "Tab bar should appear after app loads")

    // 1. Home (대시보드)
    snapshot("01_Home")

    // 2. Planner (할일 관리)
    let plannerTab = app.buttons["tab_Planner"]
    if plannerTab.exists {
      plannerTab.tap()
      sleep(2)
    }
    snapshot("02_Planner")

    // 3. Execute (포모도로 타이머)
    let executeTab = app.buttons["tab_Execute"]
    if executeTab.exists {
      executeTab.tap()
      sleep(2)
    }
    snapshot("03_Execute")

    // 4. Notes (동기부여 노트)
    let notesTab = app.buttons["tab_Notes"]
    if notesTab.exists {
      notesTab.tap()
      sleep(2)
    }
    snapshot("04_Notes")

    // 5. Settings (설정)
    let settingsTab = app.buttons["tab_Settings"]
    if settingsTab.exists {
      settingsTab.tap()
      sleep(2)
    }
    snapshot("05_Settings")
  }
}
