import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { getTagihanSemesters, getTagihanData, SemesterTagihanOption, TagihanItem } from '../../services/akademik/tagihanService';

export function TagihanContent() {
  const [loading, setLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [semesters, setSemesters] = useState<SemesterTagihanOption[]>([]);
  const [activeSemester, setActiveSemester] = useState<string>('');
  const [tagihanData, setTagihanData] = useState<TagihanItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const phpSessId = await SecureStore.getItemAsync('phpSessId');
        if (!phpSessId) throw new Error('Sesi tidak ditemukan.');

        const sems = await getTagihanSemesters();
        setSemesters(sems);

        // Default ke "SEMUA" jika ada
        if (sems.length > 0) {
          setActiveSemester(sems[0].value);
        }
      } catch (e: any) {
        Alert.alert('Gagal', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeSemester) return;
    (async () => {
      setFetchingData(true);
      try {
        const phpSessId = await SecureStore.getItemAsync('phpSessId');
        if (!phpSessId) throw new Error('Sesi tidak ditemukan.');

        const data = await getTagihanData(activeSemester);
        setTagihanData(data);
      } catch (e: any) {
        Alert.alert('Gagal', e.message);
      } finally {
        setFetchingData(false);
      }
    })();
  }, [activeSemester]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <ActivityIndicator size="large" color="#1a1a2e" />
        <Text className="mt-4 font-bold text-black">Memuat Data Tagihan...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Pilihan Semester */}
      <View className="pt-4 pb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        >
          {semesters.map(sem => (
            <TouchableOpacity
              key={sem.value}
              onPress={() => setActiveSemester(sem.value)}
              className={`border-2 border-black px-4 py-2 rounded-lg border-b-[4px] border-r-[4px] ${
                activeSemester === sem.value ? 'bg-[#ff914d]' : 'bg-white'
              }`}
              activeOpacity={0.8}
            >
              <Text className="font-black text-black uppercase text-xs">{sem.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {fetchingData ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#1a1a2e" />
        </View>
      ) : (
        <FlatList
          data={tagihanData}
          keyExtractor={item => item.noTagihan}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isLunas = item.status.toLowerCase() === 'lunas';
            return (
              <View className={`rounded-xl border-2 border-black border-b-[5px] border-r-[5px] p-4 ${isLunas ? 'bg-white' : 'bg-[#ffde59]'}`}>
                {/* Header: Jenis + Status Badge */}
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 pr-2">
                    <Text className="font-black text-black text-base">{item.jenisPembayaran}</Text>
                    <Text className="text-xs text-black/60 font-bold mt-0.5">{item.semester}</Text>
                  </View>
                  <View className={`border-2 border-black px-3 py-1 rounded-full ${isLunas ? 'bg-[#c1ff72]' : 'bg-[#ff914d]'}`}>
                    <Text className="font-black text-black text-xs uppercase">{item.status}</Text>
                  </View>
                </View>

                {/* No Tagihan */}
                <View className="bg-black/5 border border-black/20 rounded-lg px-3 py-2 mb-3">
                  <Text className="text-[10px] font-bold text-black/50 uppercase">No. Tagihan</Text>
                  <Text className="font-black text-black text-sm tracking-wider">{item.noTagihan}</Text>
                </View>

                {/* Detail Angka */}
                <View className="flex-row gap-2 mb-3">
                  <View className="flex-1 bg-black/5 border border-black/20 rounded-lg p-2 items-center">
                    <Text className="text-[10px] font-bold text-black/50 uppercase">Total</Text>
                    <Text className="font-black text-xs text-black">Rp {item.totalTagihan}</Text>
                  </View>
                  <View className="flex-1 bg-black/5 border border-black/20 rounded-lg p-2 items-center">
                    <Text className="text-[10px] font-bold text-black/50 uppercase">Potongan</Text>
                    <Text className="font-black text-xs text-black">Rp {item.potongan}</Text>
                  </View>
                  <View className={`flex-1 border-2 border-black rounded-lg p-2 items-center ${isLunas ? 'bg-[#c1ff72]' : 'bg-[#ff5c5c]'}`}>
                    <Text className="text-[10px] font-bold text-black/70 uppercase">Sisa</Text>
                    <Text className="font-black text-xs text-black">Rp {item.sisaTagihan}</Text>
                  </View>
                </View>

                {/* Tanggal */}
                <View className="flex-row gap-1 items-center">
                  <Feather name="calendar" size={10} color="#555" />
                  <Text className="text-[10px] text-black/50 font-bold flex-1" numberOfLines={1}>
                    {item.tanggalAwal} — {item.tanggalAkhir}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Feather name="credit-card" size={40} color="#999" />
              <Text className="text-black/40 font-bold mt-3">Tidak ada tagihan di periode ini</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
