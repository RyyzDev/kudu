import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { LMS_USER_AGENT, saveLmsSyncPayload, setLmsDisconnected } from '../../services/lms/lmsService';
import { LMS_INJECTED_SCRIPT } from '../../services/lms/lmsInjectedScript';
import { LmsSyncMessage } from '../../services/lms/lmsTypes';

export interface LmsBackgroundSyncerRef {
  fetchUrl: (url: string) => Promise<string>;
}

interface LmsBackgroundSyncerProps {
  syncKey: number;
  onSyncSuccess: () => void;
  onSessionExpired: () => void;
}

export const LmsBackgroundSyncer = forwardRef<LmsBackgroundSyncerRef, LmsBackgroundSyncerProps>(
  function LmsBackgroundSyncer({ syncKey, onSyncSuccess, onSessionExpired }, ref) {
    const webViewRef = useRef<WebView>(null);
    const pendingRequests = useRef<
      Map<string, { resolve: (html: string) => void; reject: (err: any) => void }>
    >(new Map());

    useImperativeHandle(ref, () => ({
      fetchUrl: (url: string) => {
        return new Promise<string>((resolve, reject) => {
          const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
          const timeout = setTimeout(() => {
            if (pendingRequests.current.has(requestId)) {
              pendingRequests.current.delete(requestId);
              reject(new Error('Timeout mengambil data dari LMS'));
            }
          }, 15000);

          pendingRequests.current.set(requestId, {
            resolve: (html: string) => {
              clearTimeout(timeout);
              resolve(html);
            },
            reject: (err: any) => {
              clearTimeout(timeout);
              reject(err);
            },
          });

          const script = `
            (async function() {
              try {
                var res = await fetch(${JSON.stringify(url)});
                var text = await res.text();
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'LMS_FETCH_URL_RESULT',
                    requestId: ${JSON.stringify(requestId)},
                    html: text
                  }));
                }
              } catch (e) {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'LMS_FETCH_URL_RESULT',
                    requestId: ${JSON.stringify(requestId)},
                    error: e.toString()
                  }));
                }
              }
            })();
            true;
          `;
          webViewRef.current?.injectJavaScript(script);
        });
      },
    }));

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
        } else if (data.type === 'LMS_FETCH_URL_RESULT') {
          const handler = pendingRequests.current.get(data.requestId);
          if (handler) {
            if (data.error) handler.reject(new Error(data.error));
            else handler.resolve(data.html || '');
            pendingRequests.current.delete(data.requestId);
          }
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
);
