// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.0.2"),
        .package(name: "CapgoCapacitorSocialLogin", path: "../../../../../node_modules/@capgo/capacitor-social-login"),
        .package(name: "CapacitorPreferences", path: "../../../../../node_modules/@capacitor/preferences"),
        .package(name: "CapacitorLocalNotifications", path: "../../../../../node_modules/@capacitor/local-notifications"),
        .package(name: "CapacitorStatusBar", path: "../../../../../node_modules/@capacitor/status-bar"),
        .package(name: "DaystepContactGroups", path: "../../../../web/plugins/contact-groups"),
        .package(name: "DaystepThemeBridge", path: "../../../../web/plugins/theme-bridge"),
        .package(name: "RevenuecatPurchasesCapacitor", path: "../../../../../node_modules/@revenuecat/purchases-capacitor"),
        .package(name: "CapacitorLiveActivity", path: "../../../../../node_modules/capacitor-live-activity")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapgoCapacitorSocialLogin", package: "CapgoCapacitorSocialLogin"),
                .product(name: "CapacitorPreferences", package: "CapacitorPreferences"),
                .product(name: "CapacitorLocalNotifications", package: "CapacitorLocalNotifications"),
                .product(name: "CapacitorStatusBar", package: "CapacitorStatusBar"),
                .product(name: "DaystepContactGroups", package: "DaystepContactGroups"),
                .product(name: "DaystepThemeBridge", package: "DaystepThemeBridge"),
                .product(name: "RevenuecatPurchasesCapacitor", package: "RevenuecatPurchasesCapacitor"),
                .product(name: "CapacitorLiveActivity", package: "CapacitorLiveActivity")
            ]
        )
    ]
)
