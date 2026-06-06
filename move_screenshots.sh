#!/bin/bash
# DayStep 포트폴리오 스크린샷 및 데모 GIF 이동 스크립트
# Chrome 다운로드 폴더에서 프로젝트 폴더로 파일을 이동합니다.
#
# 사용법: cd /Users/jonghanna/workspace/inputserver_myMac/ilsangtodo && bash move_screenshots.sh

DOWNLOADS="$HOME/Downloads"
SCREENSHOTS_DIR="./portfolio_screenshots"
PROJECT_DIR="."

echo "=== DayStep 포트폴리오 에셋 이동 스크립트 ==="
echo ""

# 0. 구버전 GIF 파일 백업
echo "[0/3] 구버전 GIF 파일 백업 중..."
OLD_BACKUP="$SCREENSHOTS_DIR/old_backup"
mkdir -p "$OLD_BACKUP"
for file in daystep_01_dashboard.gif daystep_02_mirumbangji.gif daystep_03_timeline.gif daystep_04_execute.gif daystep_05_contact.gif; do
    if [ -f "$SCREENSHOTS_DIR/$file" ]; then
        mv "$SCREENSHOTS_DIR/$file" "$OLD_BACKUP/$file"
        echo "  ✓ $file → old_backup/"
    fi
done

# 1. ZIP 파일에서 스크린샷 추출
echo ""
echo "[1/3] ZIP에서 스크린샷 추출 중..."
if [ -f "$DOWNLOADS/daystep_portfolio_screenshots.zip" ]; then
    unzip -o "$DOWNLOADS/daystep_portfolio_screenshots.zip" -d "$SCREENSHOTS_DIR/"
    echo "  ✓ ZIP 추출 완료 → portfolio_screenshots/"
    rm "$DOWNLOADS/daystep_portfolio_screenshots.zip"
    echo "  ✓ ZIP 파일 삭제"
else
    echo "  ✗ daystep_portfolio_screenshots.zip 을 찾을 수 없습니다"
    echo "    개별 PNG 파일 확인 중..."
    for file in daystep_01_dashboard.png daystep_02_daily_planner.png daystep_03_timeline.png daystep_04_ai_plan.png daystep_05_motivation.png; do
        if [ -f "$DOWNLOADS/$file" ]; then
            mv "$DOWNLOADS/$file" "$SCREENSHOTS_DIR/$file"
            echo "  ✓ $file → portfolio_screenshots/"
        fi
    done
fi

# 2. 데모 GIF 이동
echo ""
echo "[2/3] 데모 GIF 이동 중..."
if [ -f "$DOWNLOADS/daystep_demo_v3.gif" ]; then
    mv "$DOWNLOADS/daystep_demo_v3.gif" "$PROJECT_DIR/daystep_demo_v3.gif"
    echo "  ✓ daystep_demo_v3.gif → 프로젝트 루트"
else
    echo "  ✗ daystep_demo_v3.gif 파일을 찾을 수 없습니다 ($DOWNLOADS)"
    echo "    (이전에 다운로드한 파일이 이미 이동되었을 수 있습니다)"
fi

# 3. 결과 확인
echo ""
echo "[3/3] 최종 확인..."
echo ""
echo "portfolio_screenshots/ 내용:"
ls -la "$SCREENSHOTS_DIR"/*.png 2>/dev/null || echo "  (PNG 파일 없음)"
echo ""
echo "데모 GIF:"
ls -la "$PROJECT_DIR"/daystep_demo_v3.gif 2>/dev/null || echo "  (데모 GIF 없음)"
echo ""
echo "=== 완료! ==="
