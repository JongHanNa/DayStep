/**
 * NativeTodoPicker — 할일 연결 피커 (SwiftUI)
 * List(.insetGrouped) + .searchable
 * 연결됨 / 반복 할일 / 일반 할일 섹션 분리
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct PickerTodoData: Codable, Identifiable {
  let id: String
  let title: String
  let recurrence_pattern: String
  let schedule_type: String
}

// MARK: - Observable State

class TodoPickerState: ObservableObject {
  @Published var todos: [PickerTodoData] = []
  @Published var linkedTodoIds: Set<String> = []
  @Published var primaryColor: String = "#D97706"
}

// MARK: - SwiftUI Content

struct TodoPickerContent: View {
  @ObservedObject var state: TodoPickerState
  @State private var searchText = ""

  var onTodoToggle: (String, String, Bool) -> Void  // (id, title, wasLinked)
  var onClose: () -> Void

  private var primary: Color {
    Color(hex: state.primaryColor)
  }

  private var filteredTodos: [PickerTodoData] {
    let query = searchText.trimmingCharacters(in: .whitespaces).lowercased()
    if query.isEmpty { return state.todos }
    return state.todos.filter { $0.title.lowercased().contains(query) }
  }

  private var linkedTodos: [PickerTodoData] {
    filteredTodos.filter { state.linkedTodoIds.contains($0.id) }
  }

  private var recurringTodos: [PickerTodoData] {
    filteredTodos.filter {
      !state.linkedTodoIds.contains($0.id) &&
      $0.recurrence_pattern != "none" && !$0.recurrence_pattern.isEmpty
    }
  }

  private var normalTodos: [PickerTodoData] {
    filteredTodos.filter {
      !state.linkedTodoIds.contains($0.id) &&
      ($0.recurrence_pattern == "none" || $0.recurrence_pattern.isEmpty)
    }
  }

  var body: some View {
    NavigationView {
      List {
        if !linkedTodos.isEmpty {
          Section(header: Text("연결됨 (\(linkedTodos.count))")) {
            ForEach(linkedTodos) { todo in
              todoRow(todo: todo, isLinked: true)
            }
          }
        }

        if !recurringTodos.isEmpty {
          Section(header: Text("반복 할일")) {
            ForEach(recurringTodos) { todo in
              todoRow(todo: todo, isLinked: false)
            }
          }
        }

        if !normalTodos.isEmpty {
          Section(header: Text("일반 할일")) {
            ForEach(normalTodos) { todo in
              todoRow(todo: todo, isLinked: false)
            }
          }
        }

        if linkedTodos.isEmpty && recurringTodos.isEmpty && normalTodos.isEmpty {
          Section {
            HStack {
              Spacer()
              Text(searchText.isEmpty ? "할일이 없습니다" : "검색 결과가 없습니다")
                .foregroundColor(.secondary)
                .font(.subheadline)
              Spacer()
            }
            .listRowBackground(Color.clear)
          }
        }
      }
      .listStyle(.insetGrouped)
      .searchable(text: $searchText, prompt: "할일 검색")
      .navigationTitle("할일 연결")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
          Button("완료") {
            onClose()
          }
          .font(.body.weight(.semibold))
          .foregroundColor(primary)
        }
      }
    }
    .navigationViewStyle(.stack)
  }

  @ViewBuilder
  private func todoRow(todo: PickerTodoData, isLinked: Bool) -> some View {
    let isRecurring = todo.recurrence_pattern != "none" && !todo.recurrence_pattern.isEmpty

    Button {
      onTodoToggle(todo.id, todo.title, isLinked)
    } label: {
      HStack(spacing: 12) {
        // 타입 아이콘
        ZStack {
          RoundedRectangle(cornerRadius: 8)
            .fill(isRecurring ? Color.purple.opacity(0.12) : Color.orange.opacity(0.12))
            .frame(width: 28, height: 28)

          if isRecurring {
            Image(systemName: "repeat")
              .font(.system(size: 13, weight: .semibold))
              .foregroundColor(.purple)
          } else {
            Image(systemName: "circle")
              .font(.system(size: 13, weight: .medium))
              .foregroundColor(primary)
          }
        }

        // 텍스트
        VStack(alignment: .leading, spacing: 1) {
          Text(todo.title)
            .font(.system(size: 15))
            .foregroundColor(Color(hex: "#1F2937"))
            .lineLimit(1)

          if isRecurring {
            Text(recurrenceLabel(todo.recurrence_pattern))
              .font(.system(size: 11))
              .foregroundColor(.secondary)
          }
        }

        Spacer()

        // 체크 서클
        ZStack {
          Circle()
            .stroke(isLinked ? primary : Color(hex: "#D1D5DB"), lineWidth: 2)
            .frame(width: 22, height: 22)

          if isLinked {
            Circle()
              .fill(primary)
              .frame(width: 22, height: 22)

            Image(systemName: "checkmark")
              .font(.system(size: 12, weight: .bold))
              .foregroundColor(.white)
          }
        }
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
  }

  private func recurrenceLabel(_ pattern: String) -> String {
    switch pattern {
    case "daily": return "매일 반복"
    case "weekly": return "매주 반복"
    default: return "반복"
    }
  }
}

// MARK: - UIView Wrapper

class NativeTodoPickerUIView: UIView {

  @objc var onTodoToggle: RCTDirectEventBlock?
  @objc var onClose: RCTDirectEventBlock?
  @objc var onHeightChange: RCTDirectEventBlock?

  private let pickerState = TodoPickerState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setTodosData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let todos = try JSONDecoder().decode([PickerTodoData].self, from: data)
      pickerState.todos = todos
      setupOnce()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
        self?.emitHeight()
      }
    } catch {
      print("[NativeTodoPicker] JSON decode error: \(error)")
    }
  }

  @objc func setLinkedTodoIds(_ value: NSArray) {
    var ids = Set<String>()
    for item in value {
      if let str = item as? String {
        ids.insert(str)
      }
    }
    pickerState.linkedTodoIds = ids
  }

  @objc func setPrimaryColor(_ value: NSString) {
    pickerState.primaryColor = value as String
  }

  // MARK: - Height Emission

  private func emitHeight() {
    guard let hc = hostingController, bounds.width > 0 else { return }
    let size = hc.sizeThatFits(in: CGSize(width: bounds.width, height: .greatestFiniteMagnitude))
    onHeightChange?(["height": size.height])
  }

  // MARK: - Setup Once

  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .systemGroupedBackground

    let swiftUIView = TodoPickerContent(
      state: pickerState,
      onTodoToggle: { [weak self] todoId, todoTitle, wasLinked in
        self?.onTodoToggle?([
          "todoId": todoId,
          "todoTitle": todoTitle,
          "isLinked": wasLinked,
        ])
      },
      onClose: { [weak self] in
        self?.onClose?([:])
      }
    )

    let hc = UIHostingController(rootView: AnyView(swiftUIView))
    hc.view.backgroundColor = .systemGroupedBackground
    hostingController = hc

    addSubview(hc.view)
    hc.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      hc.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      hc.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      hc.view.topAnchor.constraint(equalTo: topAnchor),
      hc.view.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
      self?.emitHeight()
    }
  }
}

// MARK: - RCTViewManager

@objc(NativeTodoPickerManager)
class NativeTodoPickerManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeTodoPickerUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
