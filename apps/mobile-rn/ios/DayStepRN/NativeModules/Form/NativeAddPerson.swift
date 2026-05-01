/**
 * NativeAddPerson — 사람 추가/편집 시트 (SwiftUI)
 *
 * 디자인: 원동력 새기기 모달 패턴 1:1 모방 (디자인 통일성)
 * - NavigationView + Form (iOS 26 Liquid Glass 자동 캡슐 외관)
 * - .toolbar leading "닫기" / trailing "삭제"(편집 모드)
 *
 * 모드:
 * - "create": 짧은 form (이름만)
 * - "edit":   이름 / 별명 / 관계 chips / 역할 chips / 부서 chips
 *
 * 카테고리 add/rename/recolor 는 .sheet 으로 분리.
 * 인물 삭제는 RN ActionSheet (onDelete callback) — 영향 카운트가 RN store에 있음.
 */

import Foundation
import SwiftUI
import UIKit

// MARK: - Data Models

struct AddPersonPersonData: Codable {
  var id: String?
  var name: String
  var nickname: String
}

struct AddPersonCategoryItem: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let color: String
}

enum CategoryKindKey: String, Codable {
  case relationship, role, department
}

// MARK: - Sub-Sheet State

enum CategorySheetMode: Equatable {
  case add(CategoryKindKey)
  case rename(CategoryKindKey, AddPersonCategoryItem)
  case recolor(CategoryKindKey, AddPersonCategoryItem)
}

// Identifiable wrapper for .sheet(item:)
struct CategorySheetSelection: Identifiable, Equatable {
  let id = UUID()
  let mode: CategorySheetMode
}

// MARK: - Observable State

class AddPersonState: ObservableObject {
  @Published var mode: String = "create"
  @Published var primaryColor: String = "#3B82F6"
  @Published var name: String = ""
  @Published var nickname: String = ""
  @Published var personId: String? = nil

  @Published var relationships: [AddPersonCategoryItem] = []
  @Published var roles: [AddPersonCategoryItem] = []
  @Published var departments: [AddPersonCategoryItem] = []

  @Published var selectedRelationshipIds: Set<String> = []
  @Published var selectedRoleIds: Set<String> = []
  @Published var selectedDepartmentIds: Set<String> = []

  @Published var defaultColors: [String: String] = [:]
  @Published var palette: [String] = []

  @Published var categorySheet: CategorySheetSelection? = nil
}

// MARK: - Flow Layout (iOS 16+)

@available(iOS 16.0, *)
struct FlowLayout: Layout {
  var spacing: CGFloat = 8

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    let containerWidth = proposal.width ?? .infinity
    var totalHeight: CGFloat = 0
    var rowWidth: CGFloat = 0
    var rowHeight: CGFloat = 0

    for subview in subviews {
      let size = subview.sizeThatFits(.unspecified)
      if rowWidth + size.width > containerWidth, rowWidth > 0 {
        totalHeight += rowHeight + spacing
        rowWidth = size.width + spacing
        rowHeight = size.height
      } else {
        rowWidth += size.width + spacing
        rowHeight = max(rowHeight, size.height)
      }
    }
    totalHeight += rowHeight
    return CGSize(width: containerWidth, height: totalHeight)
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    var x = bounds.minX
    var y = bounds.minY
    var rowHeight: CGFloat = 0

    for subview in subviews {
      let size = subview.sizeThatFits(.unspecified)
      if x + size.width > bounds.maxX, x > bounds.minX {
        x = bounds.minX
        y += rowHeight + spacing
        rowHeight = 0
      }
      subview.place(
        at: CGPoint(x: x, y: y),
        anchor: .topLeading,
        proposal: ProposedViewSize(size)
      )
      x += size.width + spacing
      rowHeight = max(rowHeight, size.height)
    }
  }
}

// MARK: - Tag Chip

struct AddPersonTagChip: View {
  let item: AddPersonCategoryItem
  let isSelected: Bool
  let onTap: () -> Void
  let onRename: () -> Void
  let onRecolor: () -> Void
  let onDelete: () -> Void

  var body: some View {
    Button(action: onTap) {
      Text(item.name)
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(isSelected ? Color.white : Color(hex: item.color))
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
          Capsule()
            .fill(isSelected
              ? Color(hex: item.color)
              : Color(hex: item.color).opacity(0.15))
        )
    }
    .buttonStyle(.plain)
    .contextMenu {
      Button {
        onRename()
      } label: {
        Label("이름 수정", systemImage: "pencil")
      }
      Button {
        onRecolor()
      } label: {
        Label("색상 변경", systemImage: "paintpalette")
      }
      Button(role: .destructive) {
        onDelete()
      } label: {
        Label("삭제", systemImage: "trash")
      }
    }
  }
}

// MARK: - Category Section

struct AddPersonCategorySection: View {
  let label: String
  let kind: CategoryKindKey
  let items: [AddPersonCategoryItem]
  let selectedIds: Set<String>
  let onToggle: (String) -> Void
  let onAddRequest: () -> Void
  let onRename: (AddPersonCategoryItem) -> Void
  let onRecolor: (AddPersonCategoryItem) -> Void
  let onDelete: (AddPersonCategoryItem) -> Void

  var body: some View {
    Section {
      VStack(alignment: .leading, spacing: 10) {
        if items.isEmpty {
          Text("아직 추가된 항목이 없습니다")
            .font(.footnote)
            .foregroundStyle(.tertiary)
        } else if #available(iOS 16, *) {
          FlowLayout(spacing: 8) {
            ForEach(items) { item in
              AddPersonTagChip(
                item: item,
                isSelected: selectedIds.contains(item.id),
                onTap: { onToggle(item.id) },
                onRename: { onRename(item) },
                onRecolor: { onRecolor(item) },
                onDelete: { onDelete(item) }
              )
            }
          }
        } else {
          // iOS 15 폴백: 간단 ScrollView 가로 나열
          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
              ForEach(items) { item in
                AddPersonTagChip(
                  item: item,
                  isSelected: selectedIds.contains(item.id),
                  onTap: { onToggle(item.id) },
                  onRename: { onRename(item) },
                  onRecolor: { onRecolor(item) },
                  onDelete: { onDelete(item) }
                )
              }
            }
          }
        }
      }
      .padding(.vertical, 4)
    } header: {
      HStack {
        Text(label)
        Spacer()
        Button {
          onAddRequest()
        } label: {
          Label("추가", systemImage: "plus.circle")
            .font(.system(size: 13, weight: .medium))
            .textCase(nil)
        }
      }
    }
  }
}

// MARK: - Main Content

struct AddPersonContent: View {
  @ObservedObject var state: AddPersonState

  var onSave: (String, String, [String], [String], [String]) -> Void
  var onDelete: () -> Void
  var onClose: () -> Void
  var onCategoryAdd: (CategoryKindKey, String, String) -> Void
  var onCategoryRename: (CategoryKindKey, String, String) -> Void
  var onCategoryRecolor: (CategoryKindKey, String, String) -> Void
  var onCategoryDelete: (CategoryKindKey, String) -> Void

  private var primary: Color { Color(hex: state.primaryColor) }
  private var isCreateMode: Bool { state.mode == "create" }
  private var canSave: Bool {
    !state.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  var body: some View {
    NavigationView {
      Group {
        if isCreateMode {
          createBody
        } else {
          editBody
        }
      }
      .navigationTitle(isCreateMode ? "새 사람 추가" : "정보 수정")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarLeading) {
          Button("닫기") { onClose() }
        }
        // ToolbarItem 자체는 항상 emit (ToolbarContentBuilder.buildIf 는 iOS 16+).
        // 내부 ViewBuilder 의 buildIf 는 iOS 13+ 이므로 content 안에서 분기.
        ToolbarItem(placement: .navigationBarTrailing) {
          if !isCreateMode {
            Button(role: .destructive) {
              onDelete()
            } label: {
              Text("삭제")
                .foregroundStyle(Color(hex: "#DC2626"))
            }
          }
        }
      }
      .sheet(item: $state.categorySheet) { sel in
        CategoryEditSheet(
          state: state,
          mode: sel.mode,
          onAdd: onCategoryAdd,
          onRename: onCategoryRename,
          onRecolor: onCategoryRecolor
        )
      }
    }
    .navigationViewStyle(.stack)
  }

  // MARK: Create Body

  private var createBody: some View {
    Form {
      Section {
        TextField("이름", text: $state.name)
          .font(.system(size: 16))
        Text("소중한 분의 이름을 입력하세요")
          .font(.footnote)
          .foregroundStyle(.tertiary)
          .listRowBackground(Color.clear)
      }

      Section {
        Button {
          let trimmed = state.name.trimmingCharacters(in: .whitespacesAndNewlines)
          if !trimmed.isEmpty {
            onSave(trimmed, "", [], [], [])
          }
        } label: {
          Text("추가")
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
        }
        .buttonStyle(.borderedProminent)
        .tint(canSave ? primary : Color(hex: "#D1D5DB"))
        .disabled(!canSave)
        .listRowBackground(Color.clear)
      }
    }
  }

  // MARK: Edit Body

  private var editBody: some View {
    Form {
      Section("이름") {
        TextField("이름", text: $state.name)
          .font(.system(size: 16))
      }
      Section("별명 (선택)") {
        TextField("나만의 별명", text: $state.nickname)
          .font(.system(size: 16))
      }

      AddPersonCategorySection(
        label: "관계",
        kind: .relationship,
        items: state.relationships,
        selectedIds: state.selectedRelationshipIds,
        onToggle: { id in toggleSelection(.relationship, id) },
        onAddRequest: { state.categorySheet = CategorySheetSelection(mode: .add(.relationship)) },
        onRename: { item in state.categorySheet = CategorySheetSelection(mode: .rename(.relationship, item)) },
        onRecolor: { item in state.categorySheet = CategorySheetSelection(mode: .recolor(.relationship, item)) },
        onDelete: { item in onCategoryDelete(.relationship, item.id) }
      )

      AddPersonCategorySection(
        label: "역할/직분",
        kind: .role,
        items: state.roles,
        selectedIds: state.selectedRoleIds,
        onToggle: { id in toggleSelection(.role, id) },
        onAddRequest: { state.categorySheet = CategorySheetSelection(mode: .add(.role)) },
        onRename: { item in state.categorySheet = CategorySheetSelection(mode: .rename(.role, item)) },
        onRecolor: { item in state.categorySheet = CategorySheetSelection(mode: .recolor(.role, item)) },
        onDelete: { item in onCategoryDelete(.role, item.id) }
      )

      AddPersonCategorySection(
        label: "부서/소속",
        kind: .department,
        items: state.departments,
        selectedIds: state.selectedDepartmentIds,
        onToggle: { id in toggleSelection(.department, id) },
        onAddRequest: { state.categorySheet = CategorySheetSelection(mode: .add(.department)) },
        onRename: { item in state.categorySheet = CategorySheetSelection(mode: .rename(.department, item)) },
        onRecolor: { item in state.categorySheet = CategorySheetSelection(mode: .recolor(.department, item)) },
        onDelete: { item in onCategoryDelete(.department, item.id) }
      )

      Section {
        Button {
          let trimmedName = state.name.trimmingCharacters(in: .whitespacesAndNewlines)
          guard !trimmedName.isEmpty else { return }
          let trimmedNick = state.nickname.trimmingCharacters(in: .whitespacesAndNewlines)
          onSave(
            trimmedName,
            trimmedNick,
            Array(state.selectedRelationshipIds),
            Array(state.selectedRoleIds),
            Array(state.selectedDepartmentIds)
          )
        } label: {
          Text("저장")
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
        }
        .buttonStyle(.borderedProminent)
        .tint(canSave ? primary : Color(hex: "#D1D5DB"))
        .disabled(!canSave)
        .listRowBackground(Color.clear)
      }
    }
  }

  private func toggleSelection(_ kind: CategoryKindKey, _ id: String) {
    switch kind {
    case .relationship:
      if state.selectedRelationshipIds.contains(id) {
        state.selectedRelationshipIds.remove(id)
      } else {
        state.selectedRelationshipIds.insert(id)
      }
    case .role:
      if state.selectedRoleIds.contains(id) {
        state.selectedRoleIds.remove(id)
      } else {
        state.selectedRoleIds.insert(id)
      }
    case .department:
      if state.selectedDepartmentIds.contains(id) {
        state.selectedDepartmentIds.remove(id)
      } else {
        state.selectedDepartmentIds.insert(id)
      }
    }
  }
}

// MARK: - Category Edit Sheet

struct CategoryEditSheet: View {
  @ObservedObject var state: AddPersonState
  let mode: CategorySheetMode
  var onAdd: (CategoryKindKey, String, String) -> Void
  var onRename: (CategoryKindKey, String, String) -> Void
  var onRecolor: (CategoryKindKey, String, String) -> Void

  @State private var draftName: String = ""
  @State private var draftColor: String = "#3B82F6"
  @Environment(\.dismiss) private var dismiss

  private var title: String {
    switch mode {
    case .add: return "추가"
    case .rename: return "이름 수정"
    case .recolor: return "색상 변경"
    }
  }

  private var kind: CategoryKindKey {
    switch mode {
    case .add(let k): return k
    case .rename(let k, _): return k
    case .recolor(let k, _): return k
    }
  }

  private var canSave: Bool {
    switch mode {
    case .add, .rename:
      return !draftName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    case .recolor:
      return true
    }
  }

  private let columns: [GridItem] = Array(
    repeating: GridItem(.flexible(), spacing: 10), count: 5
  )

  var body: some View {
    NavigationView {
      Form {
        if case .rename = mode {
          Section("이름") {
            TextField("이름", text: $draftName)
              .font(.system(size: 16))
          }
        } else if case .add = mode {
          Section("이름") {
            TextField("이름", text: $draftName)
              .font(.system(size: 16))
          }
          Section("색상") {
            colorGrid
          }
        } else if case .recolor = mode {
          Section("색상") {
            colorGrid
          }
        }
      }
      .navigationTitle(title)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarLeading) {
          Button("취소") { dismiss() }
        }
        ToolbarItem(placement: .navigationBarTrailing) {
          Button("저장") {
            commit()
            dismiss()
          }
          .buttonStyle(.borderedProminent)
          .tint(Color(hex: state.primaryColor))
          .disabled(!canSave)
        }
      }
      .onAppear {
        switch mode {
        case .add(let k):
          draftName = ""
          draftColor = state.defaultColors[k.rawValue] ?? state.palette.first ?? "#3B82F6"
        case .rename(_, let item):
          draftName = item.name
          draftColor = item.color
        case .recolor(_, let item):
          draftName = item.name
          draftColor = item.color
        }
      }
    }
    .navigationViewStyle(.stack)
  }

  private var colorGrid: some View {
    LazyVGrid(columns: columns, spacing: 10) {
      ForEach(state.palette, id: \.self) { hex in
        Button {
          draftColor = hex
        } label: {
          Circle()
            .fill(Color(hex: hex))
            .frame(width: 36, height: 36)
            .overlay(
              Circle()
                .strokeBorder(
                  draftColor.lowercased() == hex.lowercased()
                    ? Color(hex: "#1F2937")
                    : .clear,
                  lineWidth: 2.5
                )
            )
        }
        .buttonStyle(.plain)
      }
    }
    .padding(.vertical, 4)
  }

  private func commit() {
    let trimmed = draftName.trimmingCharacters(in: .whitespacesAndNewlines)
    switch mode {
    case .add(let k):
      guard !trimmed.isEmpty else { return }
      onAdd(k, trimmed, draftColor)
    case .rename(let k, let item):
      guard !trimmed.isEmpty else { return }
      onRename(k, item.id, trimmed)
    case .recolor(let k, let item):
      onRecolor(k, item.id, draftColor)
    }
  }
}

// MARK: - UIView Wrapper

class NativeAddPersonUIView: UIView {

  @objc var onSave: RCTDirectEventBlock?
  @objc var onDelete: RCTDirectEventBlock?
  @objc var onClose: RCTDirectEventBlock?
  @objc var onCategoryAdd: RCTDirectEventBlock?
  @objc var onCategoryRename: RCTDirectEventBlock?
  @objc var onCategoryRecolor: RCTDirectEventBlock?
  @objc var onCategoryDelete: RCTDirectEventBlock?

  private let state = AddPersonState()
  private var hostingController: UIHostingController<AnyView>?
  private var hasSetUp = false
  private var personIdAtSetup: String? = nil

  // MARK: Prop Setters

  @objc func setMode(_ value: NSString) {
    state.mode = value as String
  }

  @objc func setPrimaryColor(_ value: NSString) {
    state.primaryColor = value as String
  }

  @objc func setPersonData(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    do {
      let p = try JSONDecoder().decode(AddPersonPersonData.self, from: data)
      state.personId = p.id
      state.name = p.name
      state.nickname = p.nickname
      setupOnce()
    } catch {
      print("[NativeAddPerson] personData decode error: \(error)")
    }
  }

  @objc func setRelationships(_ value: NSString) {
    if let arr = decodeCategories(value) {
      state.relationships = arr
    }
  }

  @objc func setRoles(_ value: NSString) {
    if let arr = decodeCategories(value) {
      state.roles = arr
    }
  }

  @objc func setDepartments(_ value: NSString) {
    if let arr = decodeCategories(value) {
      state.departments = arr
    }
  }

  // 선택 ID — 항상 prop 값으로 덮어씀. JS 측이 useMemo 로 안정화하여
  // mid-edit 토글 중에는 prop 변경이 일어나지 않으므로 native 자체 토글이 보존됨.
  // openEdit 재호출 시에는 JS state(selectedRelIds 등) 가 새 값으로 갱신 → useMemo
  // 재계산 → native가 새 selection 으로 리셋. 의도된 동작.
  @objc func setSelectedRelationshipIds(_ value: NSString) {
    if let arr = decodeStringArray(value) {
      state.selectedRelationshipIds = Set(arr)
    }
  }

  @objc func setSelectedRoleIds(_ value: NSString) {
    if let arr = decodeStringArray(value) {
      state.selectedRoleIds = Set(arr)
    }
  }

  @objc func setSelectedDepartmentIds(_ value: NSString) {
    if let arr = decodeStringArray(value) {
      state.selectedDepartmentIds = Set(arr)
    }
  }

  @objc func setDefaultColorByKind(_ value: NSString) {
    guard let data = (value as String).data(using: .utf8) else { return }
    if let dict = try? JSONDecoder().decode([String: String].self, from: data) {
      state.defaultColors = dict
    }
  }

  @objc func setPaletteColors(_ value: NSString) {
    if let arr = decodeStringArray(value) {
      state.palette = arr
    }
  }

  // MARK: Decoding helpers

  private func decodeCategories(_ value: NSString) -> [AddPersonCategoryItem]? {
    guard let data = (value as String).data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode([AddPersonCategoryItem].self, from: data)
  }

  private func decodeStringArray(_ value: NSString) -> [String]? {
    guard let data = (value as String).data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode([String].self, from: data)
  }

  // MARK: Setup

  private func setupOnce() {
    guard !hasSetUp else { return }
    hasSetUp = true
    personIdAtSetup = state.personId
    backgroundColor = .systemBackground

    let content = AddPersonContent(
      state: state,
      onSave: { [weak self] name, nickname, rels, roles, depts in
        self?.onSave?([
          "name": name,
          "nickname": nickname,
          "selectedRelationshipIds": rels,
          "selectedRoleIds": roles,
          "selectedDepartmentIds": depts,
        ])
      },
      onDelete: { [weak self] in
        self?.onDelete?([:])
      },
      onClose: { [weak self] in
        self?.onClose?([:])
      },
      onCategoryAdd: { [weak self] kind, name, color in
        self?.onCategoryAdd?([
          "kind": kind.rawValue,
          "name": name,
          "color": color,
        ])
      },
      onCategoryRename: { [weak self] kind, id, name in
        self?.onCategoryRename?([
          "kind": kind.rawValue,
          "id": id,
          "name": name,
        ])
      },
      onCategoryRecolor: { [weak self] kind, id, color in
        self?.onCategoryRecolor?([
          "kind": kind.rawValue,
          "id": id,
          "color": color,
        ])
      },
      onCategoryDelete: { [weak self] kind, id in
        // 선택 상태에서도 제거
        switch kind {
        case .relationship: self?.state.selectedRelationshipIds.remove(id)
        case .role:         self?.state.selectedRoleIds.remove(id)
        case .department:   self?.state.selectedDepartmentIds.remove(id)
        }
        self?.onCategoryDelete?([
          "kind": kind.rawValue,
          "id": id,
        ])
      }
    )

    let hc = UIHostingController(rootView: AnyView(content))
    hc.view.backgroundColor = .systemGroupedBackground
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

@objc(NativeAddPersonManager)
class NativeAddPersonManager: RCTViewManager {
  override func view() -> UIView! {
    return NativeAddPersonUIView()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
