//
//  PiPTimerPlugin.swift
//  App
//
//  Capacitor 플러그인: PiP (Picture-in-Picture) 타이머
//  홈 화면에서도 플로팅 타이머 창을 표시합니다.
//
//  @requires iOS 15.0+
//

import Foundation
import Capacitor
import AVKit
import AVFoundation
import CoreMedia

@objc(PiPTimerPlugin)
public class PiPTimerPlugin: CAPPlugin {

    public override func load() {
        super.load()
        print("[PiPTimerPlugin] ✅ Plugin loaded successfully!")
    }

    // MARK: - Properties

    private var pipController: AVPictureInPictureController?
    private var timerView: UIView?  // PiPTimerView (iOS 15+)
    private var containerViewController: UIViewController?

    // 시작 시간 기반 동기화 (JavaScript와 완벽 동기화)
    private var startTimeMs: Double = 0
    private var durationMs: Double = 0
    private var timerTitle: String = ""
    private var internalTimer: Timer?

    // Delegate wrapper for iOS 15+
    private var delegateWrapper: NSObject?

    // MARK: - Plugin Methods

    /// PiP 사용 가능 여부 확인
    @objc func isPiPAvailable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if #available(iOS 15.0, *) {
                let available = AVPictureInPictureController.isPictureInPictureSupported()
                call.resolve(["available": available])
            } else {
                call.resolve(["available": false])
            }
        }
    }

    /// PiP 타이머 시작
    @objc func startPiP(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("PiP requires iOS 15.0 or later")
            return
        }

        guard AVPictureInPictureController.isPictureInPictureSupported() else {
            call.reject("PiP is not supported on this device")
            return
        }

        // 시작 시간 기반 동기화: startTimeMs와 durationMs를 받음
        let startTime = call.getDouble("startTimeMs") ?? (Date().timeIntervalSince1970 * 1000)
        let duration = call.getDouble("durationMs") ?? Double((call.getInt("duration") ?? 0) * 1000)
        let title = call.getString("title") ?? ""

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.startTimeMs = startTime
            self.durationMs = duration
            self.timerTitle = title

            // 기존 PiP 정리
            self.cleanupPiP()

            // 오디오 세션 설정 (PiP를 위해 필요)
            self.setupAudioSession()

            // 타이머 뷰 생성
            if #available(iOS 15.0, *) {
                self.setupTimerView()

                // PiP 컨트롤러 생성
                self.setupPiPController()

                // 디버깅 로그
                print("[PiPTimer] isPictureInPicturePossible: \(self.pipController?.isPictureInPicturePossible ?? false)")
                if let pipView = self.timerView as? PiPTimerView {
                    print("[PiPTimer] sampleBufferDisplayLayer status: \(pipView.sampleBufferDisplayLayer.status.rawValue)")
                }

                // PiP 시작 (첫 프레임 렌더링 대기를 위해 약간의 딜레이 추가)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
                    guard let self = self else {
                        call.reject("Plugin instance deallocated")
                        return
                    }

                    guard let pipController = self.pipController else {
                        call.reject("PiP controller not initialized")
                        return
                    }

                    print("[PiPTimer] After delay - isPictureInPicturePossible: \(pipController.isPictureInPicturePossible)")

                    if pipController.isPictureInPicturePossible {
                        pipController.startPictureInPicture()
                        // 자체 타이머 시작 (시스템 시계 기반 계산)
                        self.startInternalTimer()
                        call.resolve(["started": true])
                    } else {
                        call.reject("Failed to start PiP - not possible after delay")
                    }
                }
            } else {
                call.reject("iOS 15.0 or later required")
            }
        }
    }

    /// 타이머 업데이트 (일시정지/재개 시 시작 시간 보정용)
    @objc func updateTimer(_ call: CAPPluginCall) {
        // 시작 시간 보정 (일시정지 후 재개 시)
        if let newStartTimeMs = call.getDouble("startTimeMs") {
            self.startTimeMs = newStartTimeMs
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.resolve(["updated": true])
                return
            }

            // 즉시 렌더링 (현재 시스템 시계 기준)
            if #available(iOS 15.0, *) {
                let remaining = self.calculateRemainingSeconds()
                (self.timerView as? PiPTimerView)?.updateTimer(remaining: remaining)
            }
            call.resolve(["updated": true])
        }
    }

    // MARK: - Internal Timer (시스템 시계 기반)

    private func startInternalTimer() {
        stopInternalTimer()

        // 1초마다 시스템 시계 기준으로 남은 시간 계산하여 렌더링
        internalTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }

            let remaining = self.calculateRemainingSeconds()

            if #available(iOS 15.0, *) {
                (self.timerView as? PiPTimerView)?.updateTimer(remaining: remaining)
            }

            // 타이머 완료
            if remaining <= 0 {
                self.stopInternalTimer()
            }
        }

        // RunLoop에 등록 (스크롤 중에도 동작)
        if let timer = internalTimer {
            RunLoop.main.add(timer, forMode: .common)
        }
    }

    private func stopInternalTimer() {
        internalTimer?.invalidate()
        internalTimer = nil
    }

    /// 시스템 시계 기준 남은 시간 계산 (JavaScript와 동일 계산 로직)
    private func calculateRemainingSeconds() -> Int {
        let now = Date().timeIntervalSince1970 * 1000  // 현재 시간 (ms)
        let elapsed = now - startTimeMs                 // 경과 시간 (ms)
        let remaining = durationMs - elapsed            // 남은 시간 (ms)
        return max(0, Int(remaining / 1000))            // 초로 변환
    }

    /// PiP 종료
    @objc func stopPiP(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.cleanupPiP()
            call.resolve(["stopped": true])
        }
    }

    // MARK: - Setup Methods

    private func setupAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playback, mode: .moviePlayback, options: [.mixWithOthers])
            try audioSession.setActive(true)
        } catch {
            print("[PiPTimer] Audio session setup failed: \(error)")
        }
    }

    @available(iOS 15.0, *)
    private func setupTimerView() {
        let viewSize = CGSize(width: 480, height: 270)
        let pipView = PiPTimerView(frame: CGRect(origin: .zero, size: viewSize))
        // 시작 시간 기반으로 초기 남은 시간 계산
        let initialRemaining = calculateRemainingSeconds()
        pipView.startTimer(duration: initialRemaining, title: timerTitle)
        timerView = pipView

        // 컨테이너 뷰 컨트롤러 생성 (화면 밖에 배치)
        containerViewController = UIViewController()
        containerViewController?.view.frame = CGRect(origin: CGPoint(x: -1000, y: -1000), size: viewSize)
        containerViewController?.view.addSubview(timerView!)

        // 윈도우에 추가 (숨겨진 상태)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            window.addSubview(containerViewController!.view)
        }
    }

    @available(iOS 15.0, *)
    private func setupPiPController() {
        guard let pipView = timerView as? PiPTimerView else { return }

        // Delegate wrapper 생성
        let wrapper = PiPDelegateWrapper(plugin: self)
        delegateWrapper = wrapper

        let contentSource = AVPictureInPictureController.ContentSource(
            sampleBufferDisplayLayer: pipView.sampleBufferDisplayLayer,
            playbackDelegate: wrapper
        )

        pipController = AVPictureInPictureController(contentSource: contentSource)
        pipController?.delegate = wrapper

        // 기본 컨트롤 숨기기 (iOS 15.4+)
        if #available(iOS 15.4, *) {
            pipController?.setValue(1, forKey: "controlsStyle")
        }
    }

    func cleanupPiP() {
        // 내부 타이머 정리
        stopInternalTimer()

        if let pipController = pipController, pipController.isPictureInPictureActive {
            pipController.stopPictureInPicture()
        }

        if #available(iOS 15.0, *) {
            (timerView as? PiPTimerView)?.stopTimer()
        }
        timerView?.removeFromSuperview()
        timerView = nil

        containerViewController?.view.removeFromSuperview()
        containerViewController = nil

        pipController = nil
        delegateWrapper = nil
    }

    // MARK: - Delegate Callbacks (called from wrapper)

    func onPiPStarted() {
        notifyListeners("pipStarted", data: [:])
    }

    func onPiPStopped() {
        cleanupPiP()
        notifyListeners("pipStopped", data: [:])
    }

    func onPiPRestoreUI(completion: @escaping (Bool) -> Void) {
        notifyListeners("pipRestoreUI", data: [:])
        completion(true)
    }

    deinit {
        cleanupPiP()
    }
}

// MARK: - Delegate Wrapper

@available(iOS 15.0, *)
class PiPDelegateWrapper: NSObject, AVPictureInPictureControllerDelegate, AVPictureInPictureSampleBufferPlaybackDelegate {

    weak var plugin: PiPTimerPlugin?

    init(plugin: PiPTimerPlugin) {
        self.plugin = plugin
    }

    // MARK: - AVPictureInPictureControllerDelegate

    func pictureInPictureControllerWillStartPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        print("[PiPTimer] PiP will start")
    }

    func pictureInPictureControllerDidStartPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        print("[PiPTimer] PiP started")
        plugin?.onPiPStarted()
    }

    func pictureInPictureControllerWillStopPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        print("[PiPTimer] PiP will stop")
    }

    func pictureInPictureControllerDidStopPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        print("[PiPTimer] PiP stopped")
        plugin?.onPiPStopped()
    }

    func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController, restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completionHandler: @escaping (Bool) -> Void) {
        print("[PiPTimer] Restore UI")
        plugin?.onPiPRestoreUI(completion: completionHandler)
    }

    // MARK: - AVPictureInPictureSampleBufferPlaybackDelegate

    func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController, setPlaying playing: Bool) {
        // 재생/일시정지 버튼 처리 (타이머에서는 사용 안함)
    }

    func pictureInPictureControllerTimeRangeForPlayback(_ pictureInPictureController: AVPictureInPictureController) -> CMTimeRange {
        // 무한 재생 (라이브 스트림처럼)
        return CMTimeRange(start: .negativeInfinity, end: .positiveInfinity)
    }

    func pictureInPictureControllerIsPlaybackPaused(_ pictureInPictureController: AVPictureInPictureController) -> Bool {
        return false
    }

    func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController, didTransitionToRenderSize newRenderSize: CMVideoDimensions) {
        // 크기 변경 시 호출
    }

    func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController, skipByInterval skipInterval: CMTime, completion: @escaping () -> Void) {
        completion()
    }
}
