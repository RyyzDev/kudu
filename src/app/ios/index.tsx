import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';

const services = [
  {
    id: 'akademik',
    label: 'Akademik',
    subtitle: 'e-semesta',
    icon: 'book-open' as const,
    bg: '#ffde59',
  },
  {
    id: 'eletter',
    label: 'E-Letter',
    subtitle: 'Surat Digital',
    icon: 'mail' as const,
    bg: '#c1ff72',
    href: '/eletter',
  },
  {
    id: 'layanan-fst',
    label: 'Layanan FST',
    subtitle: 'Fakultas Saintek',
    icon: 'cpu' as const,
    bg: '#ff914d',
    href: '/layanan-fst',
  },
];

export default function HomeScreen() {
  const router = useRouter();

  const handleAkademikPress = async () => {
    const nim = await SecureStore.getItemAsync('nim');
    const phpSessId = await SecureStore.getItemAsync('phpSessId');

    if (nim && phpSessId) {
      router.push('/akademik' as any);
    } else {
      router.push(Platform.OS === 'android' ? '/android/login' : '/ios/login' as any);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4f4f0]">
      {/* Header */}
      <View className="px-6 pt-16 pb-4 flex-row items-center justify-between border-b-2 border-black bg-white">
        <View>
          <Text className="text-4xl font-black text-black uppercase tracking-widest">KUDU</Text>
          <Text className="text-xs font-bold text-black uppercase tracking-wider bg-[#ffde59] px-2 mt-1 self-start border border-black">
            Layanan Universitas
          </Text>
        </View>
      </View>

      {/* Grid 3 Tombol Besar */}
      <View className="flex-1 px-6 pt-8 gap-5">
        {services.map(svc => (
          <TouchableOpacity
            key={svc.id}
            className="flex-row items-center gap-5 rounded-2xl border-2 border-black border-b-[8px] border-r-[8px] p-6"
            style={{ backgroundColor: svc.bg }}
            onPress={() => {
              if (svc.id === 'akademik') handleAkademikPress();
              else router.push(svc.href as any);
            }}
            activeOpacity={0.8}
          >
            <View className="w-14 h-14 rounded-full bg-black items-center justify-center">
              <Feather name={svc.icon} size={28} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-black text-black uppercase tracking-wider">{svc.label}</Text>
              <Text className="text-sm font-bold text-black/70 mt-0.5">{svc.subtitle}</Text>
            </View>
            <Feather name="arrow-right" size={24} color="black" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Credits */}
      <View className="px-6 pb-8 pt-4 items-center gap-3">
        {/* Traktir Kopi Button */}
        <TouchableOpacity
          onPress={() => Linking.openURL('https://trakteer.id/kyuka_ku/tip')}
          className="flex-row items-center gap-2 bg-[#ff914d] border-2 border-black px-5 py-3 rounded-xl border-b-[4px] border-r-[4px] w-full justify-center"
          activeOpacity={0.8}
        >
          <Text className="text-lg">☕</Text>
          <Text className="font-black text-black uppercase tracking-wider text-sm">Traktir Kopi</Text>
          <Text className="font-bold text-black/60 text-xs ml-1">untuk experience lebih baik</Text>
        </TouchableOpacity>

        {/* Created by */}
        <TouchableOpacity
          onPress={() => Linking.openURL('https://github.com/RyyzDev/')}
          activeOpacity={0.7}
          className="flex-row items-center gap-1.5"
        >
          <Feather name="github" size={14} color="#555" />
          <Text className="text-xs font-bold text-black/50">created by </Text>
          <Text className="text-xs font-black text-black underline">RyyzDev</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
