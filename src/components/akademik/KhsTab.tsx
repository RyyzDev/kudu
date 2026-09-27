import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { getKhsSemesters, getKhsData, SemesterOption, KhsItem, KhsSummary } from '../../services/akademik/khsService';

export function KhsContent() {
  const [loading, setLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [activeSemester, setActiveSemester] = useState<string>('');
  const [khsData, setKhsData] = useState<KhsItem[]>([]);
  const [summary, setSummary] = useState<KhsSummary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const phpSessId = await SecureStore.getItemAsync('phpSessId');
        if (!phpSessId) throw new Error('Sesi tidak ditemukan.');

        const sems = await getKhsSemesters();
        setSemesters(sems);

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

        const result = await getKhsData(activeSemester);
        setKhsData(result.items);
        setSummary(result.summary);
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
        <Text className="mt-4 font-bold text-black">Memuat Data KHS...</Text>
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

      {/* Daftar Nilai */}
      {fetchingData ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#1a1a2e" />
        </View>
      ) : (
        <FlatList
          data={khsData}
          keyExtractor={item => item.kode + item.kelas}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          ListHeaderComponent={
            <View className="mb-4 gap-3">
              {summary && (
                <View className="bg-[#1a1a2e] border-2 border-black rounded-xl p-4 border-b-[5px] border-r-[5px]">
                  <Text className="text-white font-black uppercase text-xs mb-3 tracking-wider">Ringkasan Semester</Text>
                  <View className="flex-row gap-2">
                    <View className="flex-1 bg-[#ffde59] border-2 border-black rounded-lg p-3 items-center border-b-[3px] border-r-[3px]">
                      <Text className="text-[10px] font-bold text-black/70 uppercase">IP Semester</Text>
                      <Text className="font-black text-2xl text-black">{summary.ipSemester || '-'}</Text>
                    </View>
                    <View className="flex-1 bg-[#c1ff72] border-2 border-black rounded-lg p-3 items-center border-b-[3px] border-r-[3px]">
                      <Text className="text-[10px] font-bold text-black/70 uppercase">IP Kumulatif</Text>
                      <Text className="font-black text-2xl text-black">{summary.ipKumulatif || '-'}</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2 mt-2">
                    <View className="flex-1 bg-white/10 border border-white/20 rounded-lg p-2 items-center">
                      <Text className="text-[10px] font-bold text-white/60 uppercase">Total SKS</Text>
                      <Text className="font-black text-base text-white">{summary.jumlahSks || '-'}</Text>
                    </View>
                    <View className="flex-1 bg-white/10 border border-white/20 rounded-lg p-2 items-center">
                      <Text className="text-[10px] font-bold text-white/60 uppercase">Mata Kuliah</Text>
                      <Text className="font-black text-base text-white">{summary.jumlahMatkul || '-'}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View className="rounded-xl border-2 border-black bg-white border-b-[5px] border-r-[5px] p-4">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="font-black text-black text-base flex-1 pr-2" numberOfLines={2}>
                  {item.matakuliah}
                </Text>
                <View className="bg-[#ffde59] border border-black px-2 py-0.5 rounded-full justify-center">
                  <Text className="font-black text-black text-xs">{item.sks} SKS</Text>
                </View>
              </View>

              <View className="flex-row gap-2 mb-3">
                <Text className="text-xs text-black/60 font-bold">Kelas {item.kelas}</Text>
                <Text className="text-xs text-black/40 font-bold">|</Text>
                <Text className="text-xs text-black/60 font-bold">{item.kode}</Text>
              </View>

              <View className="flex-row gap-2 mt-1">
                <View className="flex-1 bg-[#f4f4f0] border-2 border-black p-2 rounded-lg items-center">
                  <Text className="text-[10px] font-bold text-black/60 uppercase">Formatif</Text>
                  <Text className="font-black text-sm text-black">{item.formatif || '-'}</Text>
                </View>
                <View className="flex-1 bg-[#f4f4f0] border-2 border-black p-2 rounded-lg items-center">
                  <Text className="text-[10px] font-bold text-black/60 uppercase">UTS</Text>
                  <Text className="font-black text-sm text-black">{item.uts || '-'}</Text>
                </View>
                <View className="flex-1 bg-[#f4f4f0] border-2 border-black p-2 rounded-lg items-center">
                  <Text className="text-[10px] font-bold text-black/60 uppercase">UAS</Text>
                  <Text className="font-black text-sm text-black">{item.uas || '-'}</Text>
                </View>
                <View className="flex-1 bg-[#1a1a2e] border-2 border-black p-2 rounded-lg items-center justify-center">
                  <Text className="text-[10px] font-bold text-white/60 uppercase">Nilai</Text>
                  <Text className="font-black text-lg text-[#ffde59]">{item.nilaiAkhir || '?'}</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Feather name="file-text" size={40} color="#999" />
              <Text className="text-black/40 font-bold mt-3">Tidak ada data nilai di semester ini</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
