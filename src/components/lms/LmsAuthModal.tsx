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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-[#f4f4f0]">
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
                : 'Pilih tombol Google untuk masuk'}
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

        {/* In-App WebView */}
        <View className="flex-1">
          <WebView
            ref={webViewRef}
            source={{ uri: 'https://lms.uinjakarta.id/login/index.php' }}
            userAgent={LMS_USER_AGENT}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            injectedJavaScript={LMS_INJECTED_SCRIPT}
            onMessage={handleMessage}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => {
              setLoading(false);
              // Jalankan injeksi ulang saat halaman selesai dimuat
              webViewRef.current?.injectJavaScript(LMS_INJECTED_SCRIPT);
            }}
            onNavigationStateChange={navState => {
              setCurrentUrl(navState.url);
              // Jika URL berada di /my/ atau halaman beranda setelah login, jalankan ekstraksi
              if (
                navState.url.includes('lms.uinjakarta.id') &&
                !navState.url.includes('/login/') &&
                !navState.url.includes('admin/oauth2callback.php')
              ) {
                webViewRef.current?.injectJavaScript(LMS_INJECTED_SCRIPT);
              }
            }}
            style={{ flex: 1 }}
          />
        </View>

        {/* Petunjuk Bawah */}
        <View className="px-4 py-3 bg-[#ffde59] border-t-2 border-black flex-row items-center gap-2">
          <Feather name="info" size={16} color="black" />
          <Text className="text-xs font-bold text-black flex-1">
            Klik tombol <Text className="font-black">Google</Text> pada halaman di atas untuk login dengan akun kampus Anda.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
