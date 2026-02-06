// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "DaystepWidgetBridge",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "DaystepWidgetBridge", targets: ["DaystepWidgetBridgePlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "DaystepWidgetBridgePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm")
            ],
            path: "ios/Plugin"
        )
    ]
)
