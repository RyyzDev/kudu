import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getDataPresensi, PresensiItem } from '../../services/akademik/presensiService';

export function PresensiContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [presensiList, setPresensiList] = useState<PresensiItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const phpSessId = await SecureStore.getItemAsync('phpSessId');
        if (!phpSessId) throw new Error('Sesi tidak ditemukan.');
        const data = await getDataPresensi();
        setPresensiList(data);
      } catch (e: any) {
        Alert.alert('Gagal', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <ActivityIndicator size="large" color="#1a1a2e" />
        <Text className="mt-4 font-bold text-black">Mengambil data Presensi...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={presensiList}
      keyExtractor={item => item.matakuliah + item.kelas}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      renderItem={({ item }) => {
        const persentase = item.terlaksana === 0 ? 0 : Math.round((item.hadir / item.terlaksana) * 100);
        return (
          <View className="rounded-xl border-2 border-black bg-white border-b-[5px] border-r-[5px] p-4">
            <View className="flex-row justify-between items-start mb-2">
              <Text className="font-black text-black text-base flex-1 pr-2" numberOfLines={2}>
                {item.matakuliah}
              </Text>
              <View className="bg-[#c1ff72] border border-black px-2 py-0.5 rounded-full">
                <Text className="font-black text-black text-xs">{item.sks} SKS</Text>
              </View>
            </View>

            <View className="flex-row gap-2 mb-3">
              <Text className="text-xs text-black/60 font-bold">Kelas {item.kelas}</Text>
            </View>

            {/* Statistik Presensi */}
            <View className="flex-row gap-2">
              <View className="flex-1 bg-[#f4f4f0] border-2 border-black p-2 rounded-lg items-center">
                <Text className="text-[10px] font-bold text-black/60 uppercase">Hadir</Text>
                <Text className="font-black text-lg text-black">{item.hadir}</Text>
              </View>
              <View className="flex-1 bg-[#f4f4f0] border-2 border-black p-2 rounded-lg items-center">
                <Text className="text-[10px] font-bold text-black/60 uppercase">Alpha</Text>
                <Text className="font-black text-lg text-black">{item.tidakHadir}</Text>
              </View>
              <View className="flex-1 bg-[#f4f4f0] border-2 border-black p-2 rounded-lg items-center">
                <Text className="text-[10px] font-bold text-black/60 uppercase">Total</Text>
                <Text className="font-black text-lg text-black">{item.terlaksana}</Text>
              </View>
              <View className="flex-[1.2] bg-[#1a1a2e] border-2 border-black p-2 rounded-lg items-center justify-center">
                <Text className="text-[10px] font-bold text-white/60 uppercase">Ratio</Text>
                <Text className="font-black text-lg text-[#ffde59]">{persentase}%</Text>
              </View>
            </View>

            {/* Tombol Input Presensi */}
            {item.canInputPresensi && item.inputPresensiUrl && (
              <TouchableOpacity
                className="mt-3 bg-[#ffde59] border-2 border-black p-3 rounded-lg items-center border-b-[4px] border-r-[4px]"
                activeOpacity={0.8}
                onPress={() => {
                  router.push({
                    pathname: '/presensi-detail',
                    params: {
                      url: encodeURIComponent(item.inputPresensiUrl!),
                      matkul: item.matakuliah,
                    },
                  });
                }}
              >
                <Text className="font-black text-black uppercase text-sm">Masuk Kelas (Input)</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }}
      ListEmptyComponent={
        <View className="items-center py-20">
          <Feather name="user-check" size={40} color="#999" />
          <Text className="text-black/40 font-bold mt-3">Data Presensi kosong</Text>
        </View>
      }
    />
  );
}
