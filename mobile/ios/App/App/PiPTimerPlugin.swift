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

    private var remainingSeconds: Int = 0
    private var timerTitle: String = ""

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

        let duration = call.getInt("duration") ?? 0
        let title = call.getString("title") ?? ""

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.remainingSeconds = duration
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

    /// 타이머 업데이트
    @objc func updateTimer(_ call: CAPPluginCall) {
        let remaining = call.getInt("remaining") ?? 0

        DispatchQueue.main.async { [weak self] in
            self?.remainingSeconds = remaining
            if #available(iOS 15.0, *) {
                (self?.timerView as? PiPTimerView)?.updateTimer(remaining: remaining)
            }
            call.resolve(["updated": true])
        }
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
        pipView.startTimer(duration: remainingSeconds, title: timerTitle)
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
