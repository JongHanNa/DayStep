//
//  PiPTimerView.swift
//  App
//
//  PiP 타이머 렌더링을 위한 커스텀 뷰
//  AVSampleBufferDisplayLayer를 사용하여 타이머 텍스트를 비디오처럼 렌더링
//

import UIKit
import AVFoundation
import CoreMedia

@available(iOS 15.0, *)
public class PiPTimerView: UIView {

    // MARK: - Properties

    public override class var layerClass: AnyClass {
        return AVSampleBufferDisplayLayer.self
    }

    public var sampleBufferDisplayLayer: AVSampleBufferDisplayLayer {
        return layer as! AVSampleBufferDisplayLayer
    }

    private var remainingSeconds: Int = 0
    private var timerTitle: String = ""
    private var controlTimebase: CMTimebase?

    private var isRunning: Bool = false

    // 타이머 스타일
    private let timerBackgroundColor = UIColor.black
    private let textColor = UIColor.white
    private let fontSize: CGFloat = 72

    // MARK: - Initialization

    public override init(frame: CGRect) {
        super.init(frame: frame)
        setupLayer()
    }

    public required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupLayer()
    }

    private func setupLayer() {
        // Sample buffer display layer 설정
        sampleBufferDisplayLayer.videoGravity = .resizeAspect

        // Control timebase 생성
        var timebase: CMTimebase?
        CMTimebaseCreateWithSourceClock(
            allocator: kCFAllocatorDefault,
            sourceClock: CMClockGetHostTimeClock(),
            timebaseOut: &timebase
        )

        if let timebase = timebase {
            controlTimebase = timebase
            sampleBufferDisplayLayer.controlTimebase = timebase
            CMTimebaseSetRate(timebase, rate: 1.0)
            CMTimebaseSetTime(timebase, time: .zero)
        }

        print("[PiPTimerView] Layer setup complete")
    }

    // MARK: - Public Methods

    func startTimer(duration: Int, title: String = "") {
        remainingSeconds = duration
        timerTitle = title
        isRunning = true

        print("[PiPTimerView] startTimer - duration: \(duration), title: \(title)")

        // 기존 버퍼 플러시
        sampleBufferDisplayLayer.flush()

        // 첫 프레임 렌더링
        renderFrame()
    }

    func updateTimer(remaining: Int) {
        remainingSeconds = remaining
        renderFrame()
    }

    func stopTimer() {
        isRunning = false
    }

    // MARK: - Rendering

    private func renderFrame() {
        let size = CGSize(width: 480, height: 270) // 16:9 aspect ratio

        // 타이머 이미지 생성
        UIGraphicsBeginImageContextWithOptions(size, true, 1.0)
        guard let context = UIGraphicsGetCurrentContext() else {
            print("[PiPTimerView] ❌ Failed to get graphics context")
            UIGraphicsEndImageContext()
            return
        }

        // 배경
        context.setFillColor(timerBackgroundColor.cgColor)
        context.fill(CGRect(origin: .zero, size: size))

        // 타이머 텍스트
        let timeString = formatTime(remainingSeconds)
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .center

        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.monospacedDigitSystemFont(ofSize: fontSize, weight: .bold),
            .foregroundColor: textColor,
            .paragraphStyle: paragraphStyle
        ]

        let timeSize = timeString.size(withAttributes: attributes)
        let timeRect = CGRect(
            x: (size.width - timeSize.width) / 2,
            y: (size.height - timeSize.height) / 2,
            width: timeSize.width,
            height: timeSize.height
        )
        timeString.draw(in: timeRect, withAttributes: attributes)

        // 타이틀 (있는 경우)
        if !timerTitle.isEmpty {
            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 18, weight: .medium),
                .foregroundColor: UIColor.lightGray,
                .paragraphStyle: paragraphStyle
            ]
            let titleRect = CGRect(
                x: 0,
                y: timeRect.maxY + 10,
                width: size.width,
                height: 30
            )
            timerTitle.draw(in: titleRect, withAttributes: titleAttributes)
        }

        guard let image = UIGraphicsGetImageFromCurrentImageContext() else {
            print("[PiPTimerView] ❌ Failed to get image from context")
            UIGraphicsEndImageContext()
            return
        }
        UIGraphicsEndImageContext()

        // CGImage → CVPixelBuffer → CMSampleBuffer 변환
        guard let cgImage = image.cgImage else {
            print("[PiPTimerView] ❌ Failed to get CGImage")
            return
        }

        guard let pixelBuffer = createPixelBuffer(from: cgImage, size: size) else {
            print("[PiPTimerView] ❌ Failed to create pixel buffer")
            return
        }

        guard let sampleBuffer = createSampleBuffer(from: pixelBuffer) else {
            print("[PiPTimerView] ❌ Failed to create sample buffer")
            return
        }

        // 렌더링
        if sampleBufferDisplayLayer.isReadyForMoreMediaData {
            sampleBufferDisplayLayer.enqueue(sampleBuffer)
            print("[PiPTimerView] ✅ Frame enqueued - time: \(timeString), status: \(sampleBufferDisplayLayer.status.rawValue)")

            // Layer 에러 체크
            if let error = sampleBufferDisplayLayer.error {
                print("[PiPTimerView] ❌ Layer error: \(error)")
            }
        } else {
            print("[PiPTimerView] ⚠️ Layer not ready for more data")
        }
    }

    private func formatTime(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d", mins, secs)
    }

    // MARK: - Buffer Creation

    private func createPixelBuffer(from cgImage: CGImage, size: CGSize) -> CVPixelBuffer? {
        // ✅ IOSurface 속성 추가 (실제 iOS 기기 렌더링 필수)
        let options: [String: Any] = [
            kCVPixelBufferIOSurfacePropertiesKey as String: [:],  // 필수!
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]

        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            Int(size.width),
            Int(size.height),
            kCVPixelFormatType_32BGRA,  // ✅ ARGB → BGRA 변경
            options as CFDictionary,
            &pixelBuffer
        )

        guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
            print("[PiPTimerView] ❌ Pixel buffer creation failed: \(status)")
            return nil
        }

        CVPixelBufferLockBaseAddress(buffer, [])
        defer { CVPixelBufferUnlockBaseAddress(buffer, []) }

        // ✅ BGRA 호환 bitmapInfo
        guard let context = CGContext(
            data: CVPixelBufferGetBaseAddress(buffer),
            width: Int(size.width),
            height: Int(size.height),
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
        ) else {
            print("[PiPTimerView] ❌ CGContext creation failed")
            return nil
        }

        context.draw(cgImage, in: CGRect(origin: .zero, size: size))

        return buffer
    }

    private func createSampleBuffer(from pixelBuffer: CVPixelBuffer) -> CMSampleBuffer? {
        var formatDescription: CMFormatDescription?
        let formatStatus = CMVideoFormatDescriptionCreateForImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: pixelBuffer,
            formatDescriptionOut: &formatDescription
        )

        guard formatStatus == noErr, let formatDesc = formatDescription else {
            print("[PiPTimerView] ❌ Format description creation failed: \(formatStatus)")
            return nil
        }

        var sampleBuffer: CMSampleBuffer?

        // ✅ controlTimebase 사용 (host clock 대신)
        let presentationTime = controlTimebase != nil ? CMTimebaseGetTime(controlTimebase!) : .zero

        var timingInfo = CMSampleTimingInfo(
            duration: CMTime(value: 1, timescale: 1),
            presentationTimeStamp: presentationTime,
            decodeTimeStamp: .invalid
        )

        let sampleStatus = CMSampleBufferCreateForImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: pixelBuffer,
            dataReady: true,
            makeDataReadyCallback: nil,
            refcon: nil,
            formatDescription: formatDesc,
            sampleTiming: &timingInfo,
            sampleBufferOut: &sampleBuffer
        )

        guard sampleStatus == noErr, let buffer = sampleBuffer else {
            print("[PiPTimerView] ❌ Sample buffer creation failed: \(sampleStatus)")
            return nil
        }

        // PiP용 attachments 추가 - 즉시 표시 가능하도록 설정
        if let attachments = CMSampleBufferGetSampleAttachmentsArray(buffer, createIfNecessary: true) {
            let dict = unsafeBitCast(CFArrayGetValueAtIndex(attachments, 0), to: CFMutableDictionary.self)
            CFDictionarySetValue(dict,
                                 Unmanaged.passUnretained(kCMSampleAttachmentKey_DisplayImmediately).toOpaque(),
                                 Unmanaged.passUnretained(kCFBooleanTrue).toOpaque())
        }

        return buffer
    }

    deinit {
        // Cleanup handled by stopTimer()
    }
}
