//
//  ShareViewController.swift
//  DayStepShareExtension
//
//  Created by JongHanNa on 4/17/26.
//

import UIKit
import SwiftUI
import UniformTypeIdentifiers

/// DayStep Share Extension
/// 카톡/문자 등에서 텍스트를 공유하면 TickTick 스타일 UI로 바로 할일 생성
class ShareViewController: UIViewController {

  override func viewDidLoad() {
    super.viewDidLoad()
    extractSharedText { [weak self] text in
      DispatchQueue.main.async {
        self?.showShareUI(text: text)
      }
    }
  }

  private func showShareUI(text: String) {
    let shareView = ShareExtensionView(
      onClose: { [weak self] in
        self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
      },
      sharedText: text
    )

    let hostingController = UIHostingController(rootView: shareView)
    addChild(hostingController)
    view.addSubview(hostingController.view)
    hostingController.view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
      hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
    ])
    hostingController.didMove(toParent: self)
  }

  private func extractSharedText(completion: @escaping (String) -> Void) {
    guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
      completion("")
      return
    }

    for item in extensionItems {
      guard let attachments = item.attachments else { continue }

      for provider in attachments {
        if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
          provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { data, _ in
            if let text = data as? String {
              completion(text)
            } else {
              completion("")
            }
          }
          return
        }

        if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
          provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { data, _ in
            if let url = data as? URL {
              completion(url.absoluteString)
            } else {
              completion("")
            }
          }
          return
        }
      }
    }

    completion("")
  }
}
