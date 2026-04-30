/**
 * NativeFeedbackEditor — 새 제보(버그 신고/기능 요청) 작성 시트 (SwiftUI)
 *
 * 디자인: 원동력 새기기(NativeMotivationJournal)와 동일 패턴
 * - NavigationView + Form + .toolbar(분리된 ToolbarItem)
 * - 닫기 = 자동 iOS 26 Liquid Glass 캡슐 / 보내기 = .borderedProminent + .tint(primary)
 * - Picker(.segmented), TextField, TextEditor (placeholder overlay)
 * - 한글 IME: SwiftUI 기본 TextField/TextEditor가 자동 처리
 *
 * RN 측은 pageSheet Modal을 제공하고, 이 뷰가 Modal 내부 전체를 차지합니다.
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct FeedbackEditorData: Codable {
  var type: String   // "bug" | "feature"
  var title: String
  var content: String
}

// MARK: - Observable State

class FeedbackEditorState: ObservableObject {
  @Published var typeIndex: Int = 0   // 0=버그, 1=기능
  @Published var title: String = ""
  @Published var content: String = ""
  @Published var submitting: Bool = false
  @Published var primaryColor: String = "#3B82F6"
}

// MARK: - SwiftUI Content

struct FeedbackEditorContent: View {
  @ObservedObject var state: FeedbackEditorState
  @FocusState private var titleFocused: Bool

  var onSubmit: (String, String, String) -> Void   // type, title, content
  var onClose: () -> Void

  private var primary: Color { Color(hex: state.primaryColor) }
  private var isBug: Bool { state.typeIndex == 0 }
  private var typeKey: String { isBug ? "bug" : "feature" }

  private var canSubmit: Bool {
    let t = state.title.trimmingCharacters(in: .whitespacesAndNewlines)
    let c = state.content.trimmingCharacters(in: .whitespacesAndNewlines)
    return !t.isEmpty && !c.isEmpty && !state.submitting
  }

  private var titlePlaceholder: String {
    isBug ? "어떤 버그인지 한 줄로" : "어떤 기능을 원하시나요?"
  }

  private var contentLabel: String {
    isBug ? "재현 방법 & 상황" : "자세한 설명"
  }

  private var contentPlaceholder: String {
    isBug
      ? "어떤 상황에서, 어떤 동작을 했을 때, 어떤 결과가 나왔는지 적어주세요."
      : "어떤 상황에서 이 기능이 필요한지, 어떻게 동작하면 좋을지 적어주세요."
  }

  var body: some View {
    NavigationView {
      Form {
        // ─── 유형 선택 ───────────────────────
        Section {
          Picker("유형", selection: $state.typeIndex) {
            Text("버그 신고").tag(0)
            Text("기능 요청").tag(1)
          }
          .pickerStyle(.segmented)
          .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
          .listRowBackground(Color.clear)
        }

        // ─── 제목 ───────────────────────
        Section("제목") {
          TextField(titlePlaceholder, text: $state.title)
            .font(.body)
            .focused($titleFocused)
            .submitLabel(.next)
        }

        // ─── 본문 ───────────────────────
        Section {
          ZStack(alignment: .topLeading) {
            if state.content.isEmpty {
              Text(contentPlaceholder)
                .font(.body)
                .foregroundStyle(.tertiary)
                .padding(.top, 8)
                .padding(.leading, 4)
                .allowsHitTesting(false)
            }
            if #available(iOS 16, *) {
              TextEditor(text: $state.content)
                .frame(minHeight: 220)
                .scrollContentBackground(.hidden)
            } else {
              TextEditor(text: $state.content)
                .frame(minHeight: 220)
            }
          }
        } header: {
          Text(contentLabel)
        } footer: {
          Text("작성자와 개발팀(관리자)만 내용을 열람할 수 있어요.")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      }
      .navigationTitle("새 제보")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarLeading) {
          Button("취소") { onClose() }
        }
        ToolbarItem(placement: .navigationBarTrailing) {
          Button {
            onSubmit(typeKey, state.title, state.content)
          } label: {
            Text(state.submitting ? "보내는 중…" : "보내기")
          }
          .buttonStyle(.borderedProminent)
          .tint(primary)
          .disabled(!canSubmit)
        }
      }
      .onAppear {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
          titleFocused = true
        }
      }
    }
    .navigationViewStyle(.stack)
  }
}

// MARK: - UIView Wrapper

class NativeFeedbackEditorUIView: UIView {

  // RN Event Blocks
  @objc var onSubmit: RCTDirectEventBlock?
  @objc var onClose: RCTDirectEventBlock?

  private let state = FeedbackEditorState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setPrimaryColor(_ value: NSString) {
    state.primaryColor = value as String
  }

  @objc func setEditorData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else {
      setupOnce()
      return
    }
    do {
      let payload = try JSONDecoder().decode(FeedbackEditorData.self, from: data)
      state.typeIndex = (payload.type == "feature") ? 1 : 0
      state.title = payload.title
      state.content = payload.content
    } catch {
      print("[NativeFeedbackEditor] editorData decode error: \(error)")
    }
    setupOnce()
  }

  @objc func setSubmitting(_ value: Bool) {
    state.submitting = value
  }

  // MARK: Setup

  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .systemBackground

    let content = FeedbackEditorContent(
      state: state,
      onSubmit: { [weak self] type, title, content in
        self?.onSubmit?([
          "type": type,
          "title": title,
          "content": content,
        ])
      },
      onClose: { [weak self] in
        self?.onClose?([:])
      }
    )

    let hc = UIHostingController(rootView: AnyView(content))
    hc.view.backgroundColor = .systemGroupedBackground
    // iOS 26 Liquid Glass: toolbar의 자동 캡슐이 underlying button보다 넓어서
    // navigation bar의 leading/trailing edge에 닿으면 캡슐 가장자리가 화면 밖으로
    // 밀려 나감. additionalSafeAreaInsets로 좌우 8pt 여유를 줘서 캡슐을 안쪽으로 정렬.
    hc.additionalSafeAreaInsets = UIEdgeInsets(top: 0, left: 8, bottom: 0, right: 8)
    hostingController = hc

    addSubview(hc.view)
    hc.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      hc.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      hc.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      hc.view.topAnchor.constraint(equalTo: topAnchor),
      hc.view.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }
}

// MARK: - RCTViewManager

@objc(NativeFeedbackEditorManager)
class NativeFeedbackEditorManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeFeedbackEditorUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
