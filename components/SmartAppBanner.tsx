import Script from "next/script";

interface SmartAppBannerProps {
  iosAppId?: string;
  androidPackageName?: string;
  siteUrl?: string;
}

export const SmartAppBanner: React.FC<SmartAppBannerProps> = ({
  iosAppId = process.env.NEXT_PUBLIC_IOS_APP_ID,
  androidPackageName = process.env.NEXT_PUBLIC_ANDROID_PACKAGE_NAME,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://daystep.app",
}) => {
  return (
    <>
      {/* iOS Smart App Banner */}
      {iosAppId && (
        <meta name="apple-itunes-app" content={`app-id=${iosAppId}`} />
      )}

      {/* Android App Links */}
      {androidPackageName && (
        <>
          <link
            rel="alternate"
            href={`android-app://${androidPackageName}/https/${siteUrl.replace("https://", "")}`}
          />
          {/* Google Play Store 앱 연결 */}
          <meta
            name="google-play-app"
            content={`app-id=${androidPackageName}`}
          />
        </>
      )}

      {/* Deep Link 관련 메타 태그 */}
      <meta property="al:ios:app_store_id" content={iosAppId} />
      <meta property="al:ios:app_name" content="DayStep" />
      <meta property="al:ios:url" content="daystep://open" />

      <meta property="al:android:package" content={androidPackageName} />
      <meta property="al:android:app_name" content="DayStep" />
      <meta property="al:android:url" content="daystep://open" />

      <meta property="al:web:url" content={siteUrl} />
      <meta property="al:web:should_fallback" content="true" />

      {/* Universal Links를 위한 apple-app-site-association 설정 */}
      {iosAppId && (
        <Script id="apple-app-site-association" strategy="afterInteractive">
          {`
            // iOS Universal Links를 위한 설정
            if (window.location.pathname === '/.well-known/apple-app-site-association') {
              document.body.innerHTML = JSON.stringify({
                "applinks": {
                  "apps": [],
                  "details": [
                    {
                      "appID": "${iosAppId}.com.daystep.app",
                      "paths": ["*"]
                    }
                  ]
                }
              });
            }
          `}
        </Script>
      )}
    </>
  );
};
