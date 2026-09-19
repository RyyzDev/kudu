import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { getDetailPresensi, PertemuanItem, submitPresensi } from '../services/akademik/presensiService';

export default function PresensiDetailScreen() {
  const router = useRouter();
  const { url, matkul } = useLocalSearchParams<{ url: string; matkul: string }>();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pertemuanList, setPertemuanList] = useState<PertemuanItem[]>([]);

  const fetchDetail = async () => {
    try {
      if (!url) throw new Error('URL kelas tidak valid.');
      const phpSessId = await SecureStore.getItemAsync('phpSessId');
      if (!phpSessId) throw new Error('Sesi tidak ditemukan.');
      
      const decodedUrl = decodeURIComponent(url);
      const data = await getDetailPresensi(decodedUrl, phpSessId);
      setPertemuanList(data);
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [url]);

  const [selectedPrs, setSelectedPrs] = useState<{ prsId: string, no: number } | null>(null);

  const executeSubmit = async (prsId: string, status: '1'|'2'|'3'|'4') => {
    setSelectedPrs(null);
    try {
      setSubmitting(true);
      const phpSessId = await SecureStore.getItemAsync('phpSessId');
      if (!phpSessId) throw new Error('Sesi tidak ditemukan.');
      
      const decodedUrl = decodeURIComponent(url);
      await submitPresensi(decodedUrl, prsId, phpSessId, status);
      
      Alert.alert('Sukses', 'Berhasil mengisi presensi!');
      await fetchDetail();
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Gagal menyimpan presensi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f4f4f0]">
      {/* Header Bar */}
      <View className="px-4 pt-12 pb-2 flex-row items-center gap-3 border-b-2 border-black bg-white z-20">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center justify-center border-2 border-black bg-white w-10 h-10 rounded-lg border-b-[4px] border-r-[4px]"
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={20} color="black" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-black text-black uppercase text-lg" numberOfLines={1}>
            {matkul || 'Detail Presensi'}
          </Text>
          <Text className="text-xs font-bold text-black/60 uppercase">Daftar Pertemuan</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#1a1a2e" />
          <Text className="mt-4 font-bold text-black">Membuka kelas...</Text>
        </View>
      ) : (
        <FlatList
          data={pertemuanList}
          keyExtractor={item => item.no.toString()}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isHadir = item.statusHadir.toLowerCase() === 'hadir';
            
            return (
              <View className="rounded-xl border-2 border-black bg-white border-b-[5px] border-r-[5px] p-4 flex-row items-center gap-4">
                {/* Nomor Pertemuan */}
                <View className="w-12 h-12 rounded-full border-2 border-black bg-[#ffde59] items-center justify-center">
                  <Text className="font-black text-black text-lg">{item.no}</Text>
                </View>

                {/* Info Pertemuan */}
                <View className="flex-1 gap-1">
                  <Text className="font-bold text-black text-xs">
                    {item.tanggalTerlaksana || item.tanggalRencana}
                  </Text>
                  
                  {item.dosen.trim() !== '' && (
                    <Text className="font-bold text-black/60 text-[10px]" numberOfLines={1}>
                      <Feather name="user" size={10} /> {item.dosen}
                    </Text>
                  )}

                  {item.statusHadir ? (
                    <View className={`self-start px-2 py-0.5 rounded border border-black ${isHadir ? 'bg-[#c1ff72]' : 'bg-[#ff914d]'}`}>
                      <Text className="font-black text-black text-[10px] uppercase">{item.statusHadir}</Text>
                    </View>
                  ) : (
                    <Text className="font-bold text-black/40 text-[10px] italic">Belum ada status</Text>
                  )}
                </View>

                {/* Tombol Aksi */}
                {item.canInput && (
                  <TouchableOpacity
                    className={`border-2 border-black px-3 py-2 rounded-lg border-b-[4px] border-r-[4px] ${submitting ? 'bg-gray-400' : 'bg-[#1a1a2e]'}`}
                    activeOpacity={0.8}
                    disabled={submitting}
                    onPress={() => setSelectedPrs({ prsId: item.prsId!, no: item.no })}
                  >
                    <Text className="font-black text-white uppercase text-[10px]">
                      {submitting ? 'Loading...' : 'Isi Absen'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Feather name="calendar" size={40} color="#999" />
              <Text className="text-black/40 font-bold mt-3">Tidak ada data pertemuan</Text>
            </View>
          }
        />
      )}

      {/* Modal Pilihan Status Presensi */}
      <Modal visible={!!selectedPrs} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white border-4 border-black w-full rounded-2xl p-5 border-b-[8px] border-r-[8px]">
            <Text className="text-xl font-black text-black uppercase text-center mb-1">
              Status Presensi
            </Text>
            <Text className="text-xs font-bold text-black/60 text-center mb-5">
              Pertemuan ke-{selectedPrs?.no}
            </Text>
            
            <View className="gap-3">
              <TouchableOpacity 
                className="bg-[#c1ff72] border-2 border-black p-3 rounded-lg items-center border-b-[4px] border-r-[4px]"
                onPress={() => executeSubmit(selectedPrs!.prsId, '2')}
                activeOpacity={0.8}
              >
                <Text className="font-black text-black uppercase">Hadir</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-[#ff914d] border-2 border-black p-3 rounded-lg items-center border-b-[4px] border-r-[4px]"
                onPress={() => executeSubmit(selectedPrs!.prsId, '4')}
                activeOpacity={0.8}
              >
                <Text className="font-black text-black uppercase">Izin</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-[#ffde59] border-2 border-black p-3 rounded-lg items-center border-b-[4px] border-r-[4px]"
                onPress={() => executeSubmit(selectedPrs!.prsId, '3')}
                activeOpacity={0.8}
              >
                <Text className="font-black text-black uppercase">Sakit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-white border-2 border-black p-3 rounded-lg items-center border-b-[4px] border-r-[4px]"
                onPress={() => executeSubmit(selectedPrs!.prsId, '1')}
                activeOpacity={0.8}
              >
                <Text className="font-black text-black uppercase">Alpa</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              className="mt-6 p-2 items-center"
              onPress={() => setSelectedPrs(null)}
            >
              <Text className="font-black text-black/50 uppercase text-xs">Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
