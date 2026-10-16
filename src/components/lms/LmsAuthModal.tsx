import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { LMS_USER_AGENT, saveLmsSyncPayload } from '../../services/lms/lmsService';
import { LMS_INJECTED_SCRIPT } from '../../services/lms/lmsInjectedScript';
import { LmsSyncMessage } from '../../services/lms/lmsTypes';

interface LmsAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LmsAuthModal({ visible, onClose, onSuccess }: LmsAuthModalProps) {
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const webViewRef = useRef<WebView>(null);

  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const data: LmsSyncMessage = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LMS_SYNC_SUCCESS') {
        await saveLmsSyncPayload(data.payload);
        Alert.alert(
          'Berhasil Terhubung! 🎉',
          `Selamat datang, ${data.payload.user.name || 'Mahasiswa'}! Data LMS berhasil disinkronkan ke Kudu.`
        );
        onSuccess();
        onClose();
      } else if (data.type === 'LMS_SYNC_ERROR') {
        console.warn('LMS Sync Error:', data.error);
      }
    } catch {
      // Abaikan message yang bukan JSON format kita
    }
  };

  const handleManualGoogleClick = () => {
    webViewRef.current?.injectJavaScript(`
      var googleBtn = document.querySelector('a[href*="auth/oauth2/login.php?id=1"]');
      if (googleBtn) {
        googleBtn.click();
      } else {
        window.location.href = 'https://lms.uinjakarta.id/login/index.php';
      }
      true;
    `);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f4f0' }}>
        {/* Header Neobrutalism */}
        <View className="px-4 py-3 bg-white border-b-2 border-black flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center gap-2">
              <Text className="font-black text-black uppercase tracking-wider text-base">
                Login LMS Moodle
              </Text>
              <View className="bg-[#c1ff72] border border-black px-1.5 py-0.5 rounded">
                <Text className="text-[10px] font-black uppercase text-black">Google SSO</Text>
              </View>
            </View>
            <Text className="text-xs text-black/60 font-bold" numberOfLines={1}>
              {currentUrl.includes('accounts.google.com')
                ? 'Sedang di halaman Google Sign-In'
                : 'Pilih akun Google Anda untuk masuk'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 border-2 border-black bg-[#ff4d4d] rounded-lg items-center justify-center border-b-[3px] border-r-[3px]"
            activeOpacity={0.8}
          >
            <Feather name="x" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar Loading */}
        {loading && (
          <View className="bg-[#ffde59] px-4 py-1.5 border-b border-black flex-row items-center justify-center gap-2">
            <ActivityIndicator size="small" color="#000000" />
            <Text className="text-xs font-black text-black uppercase tracking-wider">
              Memuat Halaman LMS...
            </Text>
          </View>
        )}

        {/* In-App WebView with explicit flex and dimension styling */}
        <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#ffffff' }}>
          <WebView
            ref={webViewRef}
            source={{ uri: 'https://lms.uinjakarta.id/login/index.php' }}
            userAgent={LMS_USER_AGENT}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures={true}
            originWhitelist={['*']}
            injectedJavaScript={LMS_INJECTED_SCRIPT}
            onMessage={handleMessage}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => {
              setLoading(false);
              webViewRef.current?.injectJavaScript(LMS_INJECTED_SCRIPT);
            }}
            onError={e => {
              console.warn('LMS WebView Error:', e.nativeEvent);
              setLoading(false);
            }}
            onHttpError={e => {
              console.warn('LMS WebView HTTP Error:', e.nativeEvent);
              setLoading(false);
            }}
            onNavigationStateChange={navState => {
              setCurrentUrl(navState.url);
              if (
                navState.url.includes('lms.uinjakarta.id') &&
                !navState.url.includes('/login/') &&
                !navState.url.includes('admin/oauth2callback.php')
              ) {
                webViewRef.current?.injectJavaScript(LMS_INJECTED_SCRIPT);
              }
            }}
            style={{ flex: 1, width: '100%', height: '100%' }}
          />
        </View>

        {/* Bottom Bar: Action Helper Button */}
        <View className="px-4 py-3 bg-[#ffde59] border-t-2 border-black flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[11px] font-bold text-black" numberOfLines={2}>
              Aplikasi akan otomatis mengarahkan ke Google Sign-In.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleManualGoogleClick}
            className="bg-black border border-black px-3 py-2 rounded-lg flex-row items-center gap-1.5"
            activeOpacity={0.8}
          >
            <Feather name="log-in" size={14} color="white" />
            <Text className="text-white text-xs font-black uppercase">Buka Google</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
