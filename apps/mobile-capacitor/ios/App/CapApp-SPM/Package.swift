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
        .package(name: "CapgoCapacitorSocialLogin", path: "../../../../node_modules/@capgo/capacitor-social-login"),
        .package(name: "CapacitorPreferences", path: "../../../../node_modules/@capacitor/preferences"),
        .package(name: "CapacitorLocalNotifications", path: "../../../../node_modules/@capacitor/local-notifications"),
        .package(name: "CapacitorCommunityContacts", path: "../../../../node_modules/@capacitor-community/contacts"),
        .package(name: "DaystepWidgetBridge", path: "../../../../plugins/widget-bridge"),
        .package(name: "DaystepContactGroups", path: "../../../../plugins/contact-groups"),
        .package(name: "DaystepThemeBridge", path: "../../../../plugins/theme-bridge"),
        .package(name: "RevenuecatPurchasesCapacitor", path: "../../../../node_modules/@revenuecat/purchases-capacitor"),
        .package(name: "CapacitorLiveActivity", path: "../../../../node_modules/capacitor-live-activity")
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
                .product(name: "CapacitorCommunityContacts", package: "CapacitorCommunityContacts"),
                .product(name: "DaystepWidgetBridge", package: "DaystepWidgetBridge"),
                .product(name: "DaystepContactGroups", package: "DaystepContactGroups"),
                .product(name: "DaystepThemeBridge", package: "DaystepThemeBridge"),
                .product(name: "RevenuecatPurchasesCapacitor", package: "RevenuecatPurchasesCapacitor"),
                .product(name: "CapacitorLiveActivity", package: "CapacitorLiveActivity")
            ]
        )
    ]
)
