require 'xcodeproj'

project_path = File.join(__dir__, 'DayStepRN.xcodeproj')
project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |t| t.name == 'DayStepRN' }

unless target
  puts "❌ Target 'DayStepRN' not found!"
  exit 1
end

# DayStepWidgetModule.swift 또는 AppDelegate.swift가 있는 그룹 찾기
source_group = nil
project.main_group.recursive_children_groups.each do |g|
  has_app_file = g.children.any? do |f|
    f.respond_to?(:display_name) &&
      (f.display_name == 'DayStepWidgetModule.swift' ||
       f.display_name == 'AppDelegate.swift' ||
       f.display_name == 'DayStepRN-Bridging-Header.h')
  end
  if has_app_file
    source_group = g
    break
  end
end

if source_group
  puts "📁 Target group: #{source_group.display_name || source_group.name || 'root'}"
else
  puts "⚠️  Source group not found, using main group"
  source_group = project.main_group
end

NEW_FILES = %w[
  LiquidGlassUtils.swift
  LiquidGlassTabBar.swift
  LiquidGlassTabBarBridge.m
  LiquidGlassFuelCard.swift
  LiquidGlassFuelCardBridge.m
  LiquidGlassBackgroundView.swift
  LiquidGlassBackgroundBridge.m
]

added = 0
skipped = 0

NEW_FILES.each do |filename|
  # 이미 프로젝트에 있는지 확인
  already_exists = project.files.any? { |f| f.display_name == filename }
  if already_exists
    puts "  ⏭  Skip (already in project): #{filename}"
    skipped += 1
    next
  end

  # 파일이 디스크에 있는지 확인
  file_path = File.join(__dir__, 'DayStepRN', filename)
  unless File.exist?(file_path)
    puts "  ❌ File not found on disk: #{file_path}"
    next
  end

  file_ref = source_group.new_reference(filename)
  target.source_build_phase.add_file_reference(file_ref)
  puts "  ✅ Added: #{filename}"
  added += 1
end

project.save

puts ""
puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
puts "✅ DayStepRN.xcodeproj saved!"
puts "   Added: #{added}  /  Skipped: #{skipped}"
puts ""
puts "Next steps:"
puts "  1. Xcode → Cmd+Shift+K  (Clean Build Folder)"
puts "  2. Xcode → Cmd+R        (Build & Run)"
puts "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
