import React, { useRef, useEffect } from 'react';
import { View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { LMS_USER_AGENT, saveLmsSyncPayload, setLmsDisconnected } from '../../services/lms/lmsService';
import { LMS_INJECTED_SCRIPT } from '../../services/lms/lmsInjectedScript';
import { LmsSyncMessage } from '../../services/lms/lmsTypes';

interface LmsBackgroundSyncerProps {
  syncKey: number;
  onSyncSuccess: () => void;
  onSessionExpired: () => void;
}

export function LmsBackgroundSyncer({
  syncKey,
  onSyncSuccess,
  onSessionExpired,
}: LmsBackgroundSyncerProps) {
  const webViewRef = useRef<WebView>(null);

  // Injeksi flag headless sebelum script utama berjalan
  const headlessScript = `
    window.__KUDU_HEADLESS__ = true;
    ${LMS_INJECTED_SCRIPT}
  `;

  useEffect(() => {
    if (syncKey > 0) {
      webViewRef.current?.reload();
    }
  }, [syncKey]);

  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data: LmsSyncMessage = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LMS_SYNC_SUCCESS') {
        await saveLmsSyncPayload(data.payload);
        onSyncSuccess();
      } else if (data.type === 'LMS_SESSION_EXPIRED') {
        await setLmsDisconnected();
        onSessionExpired();
      }
    } catch {
      // Ignore non-JSON messages
    }
  };

  return (
    <View style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} pointerEvents="none">
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://lms.uinjakarta.id/my/' }}
        userAgent={LMS_USER_AGENT}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        injectedJavaScript={headlessScript}
        onMessage={handleMessage}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(headlessScript);
        }}
      />
    </View>
  );
}
