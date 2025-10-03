#!/bin/bash
# Xcode 로그 필터링 스크립트

# 사용법: ./scripts/xcode-log-filter.sh

echo "🔍 DayStep 앱 로그 필터링 시작..."

# iOS 시뮬레이터 로그 실시간 필터링
xcrun simctl spawn booted log stream \
  --predicate 'process == "DayStep"' \
  --style compact \
  --color auto \
  | grep -v -E "(⚡️|To Native|TO JS|UNNotificationRequest|num of pending)" \
  | grep -E "(Error|error|❌|🚨|Warning|warning|⚠️|DayStep|🔔|🔑|✅)"

echo "📱 필터된 로그를 실시간으로 표시합니다."
echo "종료하려면 Ctrl+C를 누르세요."