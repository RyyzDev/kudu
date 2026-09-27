import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { getDataKRS, StudentProfile, KrsItem } from '../../services/akademik/krsService';

export function KrsContent() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [krsList, setKrsList] = useState<KrsItem[]>([]);
  const [totalSks, setTotalSks] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const phpSessId = await SecureStore.getItemAsync('phpSessId');
        if (!phpSessId) throw new Error('Sesi tidak ditemukan.');
        const data = await getDataKRS();
        setProfile(data.studentProfile);
        setKrsList(data.krsList);
        setTotalSks(data.totalSks);
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
        <Text className="mt-4 font-bold text-black">Mengambil data KRS...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={krsList}
      keyExtractor={item => item.kodeMk + item.kelas}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      ListHeaderComponent={
        profile ? (
          <View className="rounded-xl border-2 border-black bg-[#1a1a2e] border-b-[6px] border-r-[6px] p-4 mb-4">
            <Text className="text-white font-black text-lg">{profile.nama}</Text>
            <Text className="text-[#ffde59] text-sm font-bold">{profile.nim}</Text>
            <Text className="text-white/70 text-xs mt-1">{profile.programStudi} • Sem {profile.semester}</Text>
            <View className="flex-row items-center justify-between mt-3 border-t border-white/20 pt-3">
              <Text className="text-white/70 text-xs">Max SKS: <Text className="text-[#c1ff72] font-black">{profile.maksimumSks}</Text></Text>
              <Text className="text-white/70 text-xs">Total Diambil: <Text className="text-[#ffde59] font-black">{totalSks}</Text></Text>
            </View>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <View className="rounded-xl border-2 border-black bg-white border-b-[5px] border-r-[5px] p-4">
          <View className="flex-row justify-between items-start mb-2">
            <Text className="font-black text-black text-base flex-1 pr-2" numberOfLines={2}>
              {item.matakuliah}
            </Text>
            <View className="bg-[#ffde59] border border-black px-2 py-0.5 rounded-full">
              <Text className="font-black text-black text-xs">{item.sks} SKS</Text>
            </View>
          </View>
          <View className="flex-row gap-2 mb-1">
            <Text className="text-xs text-black/60 font-bold">{item.kodeMk}</Text>
            <Text className="text-xs text-black/60">•</Text>
            <Text className="text-xs text-black/60 font-bold">Kelas {item.kelas}</Text>
          </View>
          {item.jadwalWaktu ? (
            <View className="mt-2 pt-2 border-t border-black/10 flex-row items-center gap-2">
              <Feather name="clock" size={12} color="#666" />
              <Text className="text-xs text-black/70">{item.jadwalWaktu}</Text>
              {item.jadwalRuang ? <Text className="text-xs text-black/40">• {item.jadwalRuang}</Text> : null}
            </View>
          ) : null}
        </View>
      )}
      ListEmptyComponent={
        <View className="items-center py-20">
          <Feather name="inbox" size={40} color="#999" />
          <Text className="text-black/40 font-bold mt-3">Data KRS kosong</Text>
        </View>
      }
    />
  );
}
