/**
 * NativeMotivationJournal — 원동력 새기기/편집 시트 (SwiftUI)
 *
 * 디자인: Apple Journal 스타일 (reflective journaling)
 * - 큰 날짜 헤더 + 성찰 프롬프트 + TextEditor + 연결된 할일 Section(.swipeActions)
 * - NavigationView + .toolbar (iOS 26 Liquid Glass 자동 캡슐 외관)
 *   • 메뉴와 저장 버튼은 분리된 ToolbarItem으로 배치 (HStack 묶음 금지 —
 *     trailing safe-area 침범으로 클리핑 발생)
 *
 * 모드:
 * - "create": 신규 작성 (삭제 없음 · 연결된 할일 없음 · 프롬프트 강조)
 * - "edit":   기존 노트 편집 (삭제/고정 메뉴 · 연결된 할일 섹션 · swipe 해제)
 *
 * RN 측은 pageSheet Modal을 제공하고, 이 뷰가 Modal 내부 전체를 차지합니다.
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct JournalNoteData: Codable {
  var id: String?
  var title: String
  var content: String
  var is_banner_pinned: Bool
  var created_at: String? // ISO8601; nil for create mode
}

struct JournalLinkedTodoData: Codable, Identifiable {
  let id: String
  let title: String
}

// MARK: - Observable State

class JournalState: ObservableObject {
  @Published var mode: String = "edit" // "create" | "edit"
  @Published var title: String = ""
  @Published var content: String = ""
  @Published var isPinned: Bool = false
  @Published var createdAt: Date = Date()
  @Published var linkedTodos: [JournalLinkedTodoData] = []
  @Published var primaryColor: String = "#D97706"
  @Published var prompt: String = "🌱 오늘 당신을 움직인 것은 무엇인가요?"
}

// MARK: - SwiftUI Content

struct MotivationJournalContent: View {
  @ObservedObject var state: JournalState
  @FocusState private var contentFocused: Bool

  // Callbacks
  var onSave: (String, String, Bool) -> Void         // title, content, isPinned
  var onPinToggle: (Bool) -> Void
  var onDelete: () -> Void
  var onUnlinkTodo: (String) -> Void
  var onLinkTodoRequest: () -> Void
  var onClose: () -> Void

  private var primary: Color { Color(hex: state.primaryColor) }
  private var isCreateMode: Bool { state.mode == "create" }
  private var canSave: Bool {
    let trimmed = state.content.trimmingCharacters(in: .whitespacesAndNewlines)
    return !trimmed.isEmpty
  }

  private var formattedDate: String {
    let df = DateFormatter()
    df.locale = Locale(identifier: "ko_KR")
    df.dateFormat = "yyyy년 M월 d일"
    return df.string(from: state.createdAt)
  }

  private var formattedWeekdayTime: String {
    let df = DateFormatter()
    df.locale = Locale(identifier: "ko_KR")
    df.dateFormat = "EEEE · a h:mm"
    return df.string(from: state.createdAt)
  }

  var body: some View {
    NavigationView {
      Form {
        // ─── 날짜 헤더 ───────────────────────
        Section {
          VStack(alignment: .leading, spacing: 4) {
            Text(formattedDate)
              .font(.system(size: 26, weight: .heavy))
              .foregroundStyle(Color(hex: "#111827"))
            Text(formattedWeekdayTime)
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
          .padding(.vertical, 4)
          .listRowBackground(Color.clear)
          .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 8, trailing: 20))
        }

        // ─── 프롬프트 ───────────────────────
        Section {
          Text(state.prompt)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(primary)
            .listRowBackground(primary.opacity(0.08))
        }

        // ─── 제목 + 본문 ───────────────────────
        Section {
          TextField("제목 (선택)", text: $state.title)
            .font(.title3.weight(.semibold))

          ZStack(alignment: .topLeading) {
            if state.content.isEmpty {
              Text("떠오르는 것을 적어보세요…")
                .foregroundStyle(.tertiary)
                .padding(.top, 8)
                .padding(.leading, 4)
                .allowsHitTesting(false)
            }
            if #available(iOS 16, *) {
              TextEditor(text: $state.content)
                .focused($contentFocused)
                .frame(minHeight: 180)
                .scrollContentBackground(.hidden)
            } else {
              TextEditor(text: $state.content)
                .focused($contentFocused)
                .frame(minHeight: 180)
            }
          }
        }

        // ─── 연결된 할일 (편집 모드만) ───────────────────────
        if !isCreateMode {
          Section("연결된 할일") {
            ForEach(state.linkedTodos) { todo in
              HStack(spacing: 10) {
                Image(systemName: "arrow.triangle.2.circlepath")
                  .font(.system(size: 13, weight: .medium))
                  .foregroundStyle(primary)
                  .frame(width: 22)
                Text(todo.title)
                  .font(.system(size: 15))
                  .foregroundStyle(Color(hex: "#1F2937"))
                Spacer()
              }
              .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                Button(role: .destructive) {
                  onUnlinkTodo(todo.id)
                } label: {
                  Label("해제", systemImage: "link.badge.minus")
                }
              }
            }
            if state.linkedTodos.isEmpty {
              Text("연결된 할일이 없습니다")
                .font(.footnote)
                .foregroundStyle(.tertiary)
            }
            Button {
              onLinkTodoRequest()
            } label: {
              Label("할일 연결", systemImage: "link.badge.plus")
                .foregroundStyle(primary)
            }
          }
        }
      }
      .navigationTitle(isCreateMode ? "원동력 새기기" : "원동력")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarLeading) {
          Button("닫기") { onClose() }
        }

        // 메뉴는 EDIT 모드에서만, 별도 ToolbarItem (HStack 사용 금지 — 클리핑 원인)
        ToolbarItem(placement: .navigationBarTrailing) {
          if !isCreateMode {
            Menu {
              Button {
                let next = !state.isPinned
                state.isPinned = next
                onPinToggle(next)
              } label: {
                Label(state.isPinned ? "고정 해제" : "배너에 고정",
                      systemImage: state.isPinned ? "pin.slash" : "pin")
              }
              Divider()
              Button(role: .destructive) {
                onDelete()
              } label: {
                Label("삭제", systemImage: "trash")
              }
            } label: {
              Image(systemName: "ellipsis.circle")
                .font(.system(size: 20))
            }
          }
        }

        ToolbarItem(placement: .navigationBarTrailing) {
          Button {
            onSave(state.title, state.content, state.isPinned)
          } label: {
            Text("저장")
          }
          .buttonStyle(.borderedProminent)
          .tint(primary)
          .disabled(!canSave)
        }
      }
      .onAppear {
        if isCreateMode {
          // 신규 작성 시 자동 포커스
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            contentFocused = true
          }
        }
      }
    }
    .navigationViewStyle(.stack)
  }
}

// MARK: - UIView Wrapper

class NativeMotivationJournalUIView: UIView {

  // RN Event Blocks
  @objc var onSave: RCTDirectEventBlock?
  @objc var onPinToggle: RCTDirectEventBlock?
  @objc var onDelete: RCTDirectEventBlock?
  @objc var onUnlinkTodo: RCTDirectEventBlock?
  @objc var onLinkTodoRequest: RCTDirectEventBlock?
  @objc var onClose: RCTDirectEventBlock?

  private let state = JournalState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setMode(_ value: NSString) {
    state.mode = value as String
  }

  @objc func setPrimaryColor(_ value: NSString) {
    state.primaryColor = value as String
  }

  @objc func setPrompt(_ value: NSString) {
    state.prompt = value as String
  }

  @objc func setNoteData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let note = try JSONDecoder().decode(JournalNoteData.self, from: data)
      state.title = note.title
      state.content = note.content
      state.isPinned = note.is_banner_pinned
      if let iso = note.created_at {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = formatter.date(from: iso) {
          state.createdAt = d
        } else {
          formatter.formatOptions = [.withInternetDateTime]
          if let d2 = formatter.date(from: iso) { state.createdAt = d2 }
        }
      } else {
        state.createdAt = Date()
      }
      setupOnce()
    } catch {
      print("[NativeMotivationJournal] noteData decode error: \(error)")
    }
  }

  @objc func setLinkedTodosData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let todos = try JSONDecoder().decode([JournalLinkedTodoData].self, from: data)
      state.linkedTodos = todos
    } catch {
      print("[NativeMotivationJournal] linkedTodos decode error: \(error)")
    }
  }

  // MARK: Setup

  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .systemBackground

    let content = MotivationJournalContent(
      state: state,
      onSave: { [weak self] title, content, isPinned in
        self?.onSave?([
          "title": title,
          "content": content,
          "isPinned": isPinned,
        ])
      },
      onPinToggle: { [weak self] isPinned in
        self?.onPinToggle?(["isPinned": isPinned])
      },
      onDelete: { [weak self] in
        self?.onDelete?([:])
      },
      onUnlinkTodo: { [weak self] todoId in
        self?.onUnlinkTodo?(["todoId": todoId])
      },
      onLinkTodoRequest: { [weak self] in
        self?.onLinkTodoRequest?([:])
      },
      onClose: { [weak self] in
        self?.onClose?([:])
      }
    )

    let hc = UIHostingController(rootView: AnyView(content))
    hc.view.backgroundColor = .systemGroupedBackground
    // iOS 26 Liquid Glass: toolbar의 자동 캡슐이 underlying button보다 크게 그려져서
    // navigation bar edge에 닿으면 가장자리가 클리핑됨. additionalSafeAreaInsets로
    // 상하좌우 여유를 줘서 캡슐 전체가 안전영역 안쪽에 정렬되도록 함.
    hc.additionalSafeAreaInsets = UIEdgeInsets(top: 8, left: 8, bottom: 0, right: 8)
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

@objc(NativeMotivationJournalManager)
class NativeMotivationJournalManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeMotivationJournalUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
