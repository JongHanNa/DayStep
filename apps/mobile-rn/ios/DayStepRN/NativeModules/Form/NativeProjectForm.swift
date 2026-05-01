/**
 * NativeProjectForm — 프로젝트 추가/수정 시트 (SwiftUI)
 *
 * 디자인: 원동력 새기기 모달 패턴 1:1 모방 (디자인 통일성)
 * - NavigationView + Form (iOS 26 Liquid Glass 자동 캡슐 외관)
 * - .toolbar leading "닫기" / trailing "만들기"|"수정하기" — 분리된 ToolbarItem
 *
 * 모드:
 * - "create": 신규 (외관 + 제목/설명만)
 * - "edit":   외관 + 상태 Menu + 연결된 할일 Section(.swipeActions)
 *
 * 외관 picker는 .sheet 으로 분리 — RN 왕복 없이 native 안에서 처리
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct ProjectFormProjectData: Codable {
  var id: String?
  var title: String
  var description: String
  var color: String
  var icon: String   // lucide key
  var status: String?
}

struct ProjectFormLinkedTodo: Codable, Identifiable {
  let id: String
  let title: String
  let completed: Bool
  let dateLabel: String
}

struct ProjectFormStatusMenuItem: Codable, Identifiable {
  let title: String
  let key: String
  var id: String { key }
}

// MARK: - Lucide → SF Symbols

func lucideToSFSymbol(_ key: String) -> String {
  switch key {
  case "briefcase":  return "briefcase.fill"
  case "target":     return "target"
  case "lightbulb":  return "lightbulb.fill"
  case "rocket":     return "paperplane.fill"
  case "book":       return "book.fill"
  case "code":       return "chevron.left.forwardslash.chevron.right"
  case "camera":     return "camera.fill"
  case "heart":      return "heart.fill"
  case "star":       return "star.fill"
  case "leaf":       return "leaf.fill"
  case "flame":      return "flame.fill"
  case "zap":        return "bolt.fill"
  case "flag":       return "flag.fill"
  case "music":      return "music.note"
  case "home":       return "house.fill"
  case "globe":      return "globe"
  default:           return "square.grid.2x2"
  }
}

// MARK: - Observable State

class ProjectFormState: ObservableObject {
  @Published var mode: String = "create"
  @Published var primaryColor: String = "#3B82F6"
  @Published var title: String = ""
  @Published var description: String = ""
  @Published var color: String = "#A8DADC"
  @Published var icon: String = "briefcase"
  @Published var status: String? = nil
  @Published var statusLabel: String = ""
  @Published var statusBadgeColor: String = "#6B7280"
  @Published var statusBadgeBg: String = "#F3F4F6"
  @Published var statusMenuItems: [ProjectFormStatusMenuItem] = []
  @Published var linkedTodos: [ProjectFormLinkedTodo] = []
  @Published var loadingTodos: Bool = false
  @Published var paletteColors: [String] = []
  @Published var paletteIcons: [String] = []
  @Published var showAppearanceSheet: Bool = false
}

// MARK: - SwiftUI Content

struct ProjectFormContent: View {
  @ObservedObject var state: ProjectFormState

  var onSave: (String, String, String, String) -> Void  // title, description, color, icon
  var onStatusChange: (String) -> Void
  var onUnlinkTodo: (String) -> Void
  var onClose: () -> Void

  private var primary: Color { Color(hex: state.primaryColor) }
  private var isCreateMode: Bool { state.mode == "create" }
  private var canSave: Bool {
    !state.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  var body: some View {
    NavigationView {
      Form {
        // ─── 미리보기 카드 ───────────────────────
        Section {
          HStack(spacing: 12) {
            Circle()
              .fill(Color(hex: state.color))
              .frame(width: 10, height: 10)
            Image(systemName: lucideToSFSymbol(state.icon))
              .font(.system(size: 18, weight: .medium))
              .foregroundStyle(Color(hex: "#1F2937"))
              .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
              Text(state.title.isEmpty ? "프로젝트 제목" : state.title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(state.title.isEmpty ? Color(hex: "#9CA3AF") : Color(hex: "#1F2937"))
                .lineLimit(1)
              if !state.description.isEmpty {
                Text(state.description)
                  .font(.system(size: 13))
                  .foregroundStyle(Color(hex: "#6B7280"))
                  .lineLimit(1)
              }
            }
            Spacer()
          }
          .padding(.vertical, 4)
          .listRowBackground(Color(hex: state.color).opacity(0.15))
        }

        // ─── 제목 ───────────────────────
        Section("제목") {
          TextField("프로젝트 제목", text: $state.title)
            .font(.system(size: 16))
        }

        // ─── 설명 ───────────────────────
        Section("설명") {
          if #available(iOS 16, *) {
            TextField("프로젝트 설명 (선택)", text: $state.description, axis: .vertical)
              .font(.system(size: 15))
              .lineLimit(3...6)
          } else {
            TextField("프로젝트 설명 (선택)", text: $state.description)
              .font(.system(size: 15))
          }
        }

        // ─── 외관 ───────────────────────
        Section {
          Button {
            state.showAppearanceSheet = true
          } label: {
            HStack(spacing: 12) {
              Image(systemName: "paintpalette")
                .font(.system(size: 17))
                .foregroundStyle(Color(hex: "#6B7280"))
                .frame(width: 22)
              Text("외관")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color(hex: "#1F2937"))
              Spacer()
              Image(systemName: lucideToSFSymbol(state.icon))
                .font(.system(size: 14))
                .foregroundStyle(Color(hex: "#6B7280"))
              Circle()
                .fill(Color(hex: state.color))
                .frame(width: 12, height: 12)
              Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color(hex: "#9CA3AF"))
            }
          }
        }

        // ─── 상태 (편집 모드만) ───────────────────────
        if !isCreateMode, !state.statusMenuItems.isEmpty {
          Section {
            HStack(spacing: 12) {
              Image(systemName: "waveform.path.ecg")
                .font(.system(size: 17))
                .foregroundStyle(Color(hex: "#6B7280"))
                .frame(width: 22)
              Text("상태")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Color(hex: "#1F2937"))
              Spacer()
              Menu {
                ForEach(state.statusMenuItems) { item in
                  Button(item.title) {
                    onStatusChange(item.key)
                  }
                }
              } label: {
                HStack(spacing: 6) {
                  Text(state.statusLabel)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color(hex: state.statusBadgeColor))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(
                      Capsule().fill(Color(hex: state.statusBadgeBg))
                    )
                  Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 14))
                    .foregroundStyle(Color(hex: "#9CA3AF"))
                }
              }
            }
          }
        }

        // ─── 연결된 할일 (편집 모드만) ───────────────────────
        if !isCreateMode {
          Section("연결된 할일") {
            if state.loadingTodos {
              HStack {
                ProgressView()
                Text("불러오는 중…")
                  .font(.footnote)
                  .foregroundStyle(.tertiary)
              }
            } else if state.linkedTodos.isEmpty {
              Text("연결된 할일이 없습니다")
                .font(.footnote)
                .foregroundStyle(.tertiary)
            } else {
              ForEach(state.linkedTodos) { todo in
                HStack(spacing: 10) {
                  Image(systemName: todo.completed ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 16))
                    .foregroundStyle(todo.completed ? Color(hex: "#22C55E") : Color(hex: "#9CA3AF"))
                  VStack(alignment: .leading, spacing: 2) {
                    // iOS 13+ 호환: strikethrough(active:color:) 는 iOS 16+ 이라
                    // 조건부 적용으로 분기 (ternary 가 Text 타입을 통일)
                    (todo.completed
                      ? Text(todo.title).strikethrough()
                      : Text(todo.title))
                      .font(.system(size: 15))
                      .foregroundStyle(
                        todo.completed
                          ? Color(hex: "#9CA3AF")
                          : Color(hex: "#1F2937")
                      )
                    if !todo.dateLabel.isEmpty {
                      Text(todo.dateLabel)
                        .font(.system(size: 12))
                        .foregroundStyle(Color(hex: "#9CA3AF"))
                    }
                  }
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
            }
          }
        }
      }
      .navigationTitle(isCreateMode ? "새 프로젝트" : "프로젝트 수정")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarLeading) {
          Button("닫기") { onClose() }
        }
        ToolbarItem(placement: .navigationBarTrailing) {
          Button {
            onSave(state.title, state.description, state.color, state.icon)
          } label: {
            Text(isCreateMode ? "만들기" : "수정하기")
          }
          .buttonStyle(.borderedProminent)
          .tint(primary)
          .disabled(!canSave)
        }
      }
      .sheet(isPresented: $state.showAppearanceSheet) {
        ProjectAppearanceSheet(state: state)
      }
    }
    .navigationViewStyle(.stack)
  }
}

// MARK: - Appearance Sheet

struct ProjectAppearanceSheet: View {
  @ObservedObject var state: ProjectFormState

  private let columns: [GridItem] = Array(
    repeating: GridItem(.flexible(), spacing: 12), count: 5
  )
  private let iconColumns: [GridItem] = Array(
    repeating: GridItem(.flexible(), spacing: 10), count: 6
  )

  var body: some View {
    NavigationView {
      Form {
        // 미리보기
        Section {
          HStack(spacing: 12) {
            Circle()
              .fill(Color(hex: state.color))
              .frame(width: 10, height: 10)
            Image(systemName: lucideToSFSymbol(state.icon))
              .font(.system(size: 18, weight: .medium))
              .foregroundStyle(Color(hex: "#1F2937"))
              .frame(width: 24)
            Text(state.title.isEmpty ? "프로젝트 제목" : state.title)
              .font(.system(size: 16, weight: .semibold))
              .foregroundStyle(state.title.isEmpty ? Color(hex: "#9CA3AF") : Color(hex: "#1F2937"))
              .lineLimit(1)
            Spacer()
          }
          .padding(.vertical, 4)
          .listRowBackground(Color(hex: state.color).opacity(0.15))
        }

        // 색상
        Section("색상") {
          LazyVGrid(columns: columns, spacing: 12) {
            ForEach(state.paletteColors, id: \.self) { hex in
              Button {
                state.color = hex
              } label: {
                Circle()
                  .fill(Color(hex: hex))
                  .frame(width: 40, height: 40)
                  .overlay(
                    Circle()
                      .strokeBorder(
                        state.color == hex ? Color(hex: "#1F2937") : .clear,
                        lineWidth: 2.5
                      )
                  )
              }
              .buttonStyle(.plain)
            }
          }
          .padding(.vertical, 6)
        }

        // 아이콘
        Section("아이콘") {
          LazyVGrid(columns: iconColumns, spacing: 10) {
            ForEach(state.paletteIcons, id: \.self) { key in
              Button {
                state.icon = key
              } label: {
                Image(systemName: lucideToSFSymbol(key))
                  .font(.system(size: 20))
                  .foregroundStyle(state.icon == key ? Color.white : Color(hex: "#1F2937"))
                  .frame(width: 44, height: 44)
                  .background(
                    RoundedRectangle(cornerRadius: 10)
                      .fill(state.icon == key ? Color(hex: state.primaryColor) : Color(hex: "#F3F4F6"))
                  )
              }
              .buttonStyle(.plain)
            }
          }
          .padding(.vertical, 6)
        }
      }
      .navigationTitle("외관")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
          Button("완료") {
            state.showAppearanceSheet = false
          }
          .buttonStyle(.borderedProminent)
          .tint(Color(hex: state.primaryColor))
        }
      }
    }
    .navigationViewStyle(.stack)
  }
}

// MARK: - UIView Wrapper

class NativeProjectFormUIView: UIView {

  @objc var onSave: RCTDirectEventBlock?
  @objc var onStatusChange: RCTDirectEventBlock?
  @objc var onUnlinkTodo: RCTDirectEventBlock?
  @objc var onClose: RCTDirectEventBlock?

  private let state = ProjectFormState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false

  // MARK: Prop Setters

  @objc func setMode(_ value: NSString) {
    state.mode = value as String
  }

  @objc func setPrimaryColor(_ value: NSString) {
    state.primaryColor = value as String
  }

  @objc func setProjectData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let p = try JSONDecoder().decode(ProjectFormProjectData.self, from: data)
      state.title = p.title
      state.description = p.description
      state.color = p.color
      state.icon = p.icon
      state.status = p.status
      setupOnce()
    } catch {
      print("[NativeProjectForm] projectData decode error: \(error)")
    }
  }

  @objc func setLinkedTodosData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      state.linkedTodos = try JSONDecoder().decode([ProjectFormLinkedTodo].self, from: data)
    } catch {
      print("[NativeProjectForm] linkedTodos decode error: \(error)")
    }
  }

  @objc func setPaletteColors(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    if let arr = try? JSONDecoder().decode([String].self, from: data) {
      state.paletteColors = arr
    }
  }

  @objc func setPaletteIcons(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    if let arr = try? JSONDecoder().decode([String].self, from: data) {
      state.paletteIcons = arr
    }
  }

  @objc func setStatusMenuItemsData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    if let arr = try? JSONDecoder().decode([ProjectFormStatusMenuItem].self, from: data) {
      state.statusMenuItems = arr
    }
  }

  @objc func setStatusLabel(_ value: NSString) {
    state.statusLabel = value as String
  }

  @objc func setStatusBadgeColor(_ value: NSString) {
    state.statusBadgeColor = value as String
  }

  @objc func setStatusBadgeBg(_ value: NSString) {
    state.statusBadgeBg = value as String
  }

  @objc func setLoadingTodos(_ value: Bool) {
    state.loadingTodos = value
  }

  // MARK: Setup

  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    backgroundColor = .systemBackground

    let content = ProjectFormContent(
      state: state,
      onSave: { [weak self] title, desc, color, icon in
        self?.onSave?([
          "title": title,
          "description": desc,
          "color": color,
          "icon": icon,
        ])
      },
      onStatusChange: { [weak self] status in
        self?.onStatusChange?(["status": status])
      },
      onUnlinkTodo: { [weak self] todoId in
        self?.onUnlinkTodo?(["todoId": todoId])
      },
      onClose: { [weak self] in
        self?.onClose?([:])
      }
    )

    let hc = UIHostingController(rootView: AnyView(content))
    hc.view.backgroundColor = .systemGroupedBackground
    // iOS 26 Liquid Glass: toolbar 캡슐 클리핑 회피
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

@objc(NativeProjectFormManager)
class NativeProjectFormManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeProjectFormUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
