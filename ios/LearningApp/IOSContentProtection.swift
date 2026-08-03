import Foundation
import UIKit

@objc(IOSContentProtection)
class IOSContentProtection: RCTEventEmitter {
    
    private var isRecording = false
    private var blurView: UIVisualEffectView?
    
    override init() {
        super.init()
        setupObservers()
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return ["onScreenRecordingStatusChanged", "onScreenshotTaken"]
    }
    
    private func setupObservers() {
        NotificationCenter.default.addObserver(self, selector: #selector(handleScreenRecordingChange), name: UIScreen.capturedDidChangeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(handleScreenshotTaken), name: UIApplication.userDidTakeScreenshotNotification, object: nil)
    }
    
    @objc private func handleScreenRecordingChange() {
        let isCaptured = UIScreen.main.isCaptured
        self.isRecording = isCaptured
        
        // Emit event to React Native to pause video/show warnings
        sendEvent(withName: "onScreenRecordingStatusChanged", body: ["isRecording": isCaptured])
        
        DispatchQueue.main.async {
            if isCaptured {
                self.applyBlurOverlay()
            } else {
                self.removeBlurOverlay()
            }
        }
    }
    
    @objc private func handleScreenshotTaken() {
        // Emit event to React Native for auditing/watermarking purposes
        sendEvent(withName: "onScreenshotTaken", body: nil)
    }
    
    private func applyBlurOverlay() {
        guard let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }), blurView == nil else { return }
        
        let blurEffect = UIBlurEffect(style: .dark)
        let visualEffectView = UIVisualEffectView(effect: blurEffect)
        visualEffectView.frame = window.bounds
        visualEffectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        
        // Add a warning label to the blur view
        let warningLabel = UILabel()
        warningLabel.text = "Screen Recording Detected\nRecording must be stopped before protected content can continue."
        warningLabel.textColor = .white
        warningLabel.textAlignment = .center
        warningLabel.numberOfLines = 0
        warningLabel.font = UIFont.boldSystemFont(ofSize: 18)
        warningLabel.translatesAutoresizingMaskIntoConstraints = false
        
        visualEffectView.contentView.addSubview(warningLabel)
        NSLayoutConstraint.activate([
            warningLabel.centerXAnchor.constraint(equalTo: visualEffectView.contentView.centerXAnchor),
            warningLabel.centerYAnchor.constraint(equalTo: visualEffectView.contentView.centerYAnchor),
            warningLabel.leadingAnchor.constraint(equalTo: visualEffectView.contentView.leadingAnchor, constant: 20),
            warningLabel.trailingAnchor.constraint(equalTo: visualEffectView.contentView.trailingAnchor, constant: -20)
        ])
        
        window.addSubview(visualEffectView)
        self.blurView = visualEffectView
    }
    
    private func removeBlurOverlay() {
        UIView.animate(withDuration: 0.3, animations: {
            self.blurView?.alpha = 0
        }) { _ in
            self.blurView?.removeFromSuperview()
            self.blurView = nil
        }
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}
