import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { NavigationTabs, AKADEMIK_TABS } from '../components/akademik/NavigationTabs';
import { KrsContent } from '../components/akademik/KrsTab';
import { PresensiContent } from '../components/akademik/PresensiTab';
import { KhsContent } from '../components/akademik/KhsTab';
import { TagihanContent } from '../components/akademik/TagihanTab';
import { ComingSoon } from '../components/akademik/ComingSoon';

export default function AkademikScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('krs');

  const renderContent = () => {
    switch (activeTab) {
      case 'krs':      return <KrsContent />;
      case 'presensi': return <PresensiContent />;
      case 'nilai':    return <KhsContent />;
      case 'tagihan':  return <TagihanContent />;
      default:         return <ComingSoon label={activeTab} />;
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('nim');
    await SecureStore.deleteItemAsync('password');
    await SecureStore.deleteItemAsync('phpSessId');
    router.replace('/' as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4f4f0]">
      {/* Header Bar */}
      <View className="mt-5 px-4 pt-12 pb-2 flex-row items-center justify-between z-20">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center gap-1.5 border-2 border-black bg-white px-3 py-2 rounded-lg border-b-[4px] border-r-[4px]"
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={16} color="black" />
          <Text className="font-black text-black uppercase text-xs">Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center gap-1.5 border-2 border-black bg-[#ff914d] px-3 py-2 rounded-lg border-b-[4px] border-r-[4px]"
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={16} color="black" />
          <Text className="font-black text-black uppercase text-xs">Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Judul Halaman */}
      <View className="px-5 mt-6 mb-2">
        <Text className="text-3xl font-black text-black uppercase tracking-widest">Akademik</Text>
        <Text className="text-xs font-bold text-black uppercase tracking-wider bg-[#ffde59] px-2 mt-1 self-start border border-black">
          e-Semesta
        </Text>
      </View>

      {/* Nav Tab UI */}
      <NavigationTabs tabs={AKADEMIK_TABS} activeTab={activeTab} onSelect={setActiveTab} />

      {/* Konten Tab */}
      <View className="flex-1 mt-2">
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}
