import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { getDataKRS, StudentProfile, KrsItem } from '../services/akademik/krsService';

const { width: SCREEN_W } = Dimensions.get('window');

// Daftar tab layanan akademik
const AKADEMIK_TABS = [
  { id: 'krs', label: 'KRS', icon: 'list' as const },
  { id: 'presensi', label: 'Presensi', icon: 'check-square' as const },
  { id: 'nilai', label: 'Nilai', icon: 'award' as const },
  { id: 'tagihan', label: 'Tagihan', icon: 'credit-card' as const },
];

// ==========================================
// KOMPONEN: Navigation Tabs
// ==========================================
function NavigationTabs({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: typeof AKADEMIK_TABS;
  activeTab: string;
  onSelect: (id: string) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View
      className="border-t-4 border-b-4 border-black bg-[#ffde59] w-full z-10"
      style={{ height: 52 }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 16, gap: 8 }}
        style={{ flex: 1 }}
      >
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onSelect(tab.id)}
                activeOpacity={0.7}
                className="flex-row items-center gap-1.5 px-4 py-1.5 rounded-full border-2 border-black"
                style={{ backgroundColor: isActive ? '#1a1a2e' : 'transparent' }}
              >
                <Feather name={tab.icon} size={13} color={isActive ? '#ffde59' : 'black'} />
                <Text
                  className="font-black text-xs uppercase tracking-wide"
                  style={{ color: isActive ? '#ffde59' : 'black' }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
    </View>
  );
}

// ==========================================
// KONTEN TAB: KRS
// ==========================================
function KrsContent() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [krsList, setKrsList] = useState<KrsItem[]>([]);
  const [totalSks, setTotalSks] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const phpSessId = await SecureStore.getItemAsync('phpSessId');
        if (!phpSessId) throw new Error('Sesi tidak ditemukan.');
        const data = await getDataKRS(phpSessId);
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

import { getDataPresensi, PresensiItem } from '../services/akademik/presensiService';

// ==========================================
// KONTEN TAB: PRESENSI
// ==========================================
function PresensiContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [presensiList, setPresensiList] = useState<PresensiItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const phpSessId = await SecureStore.getItemAsync('phpSessId');
        if (!phpSessId) throw new Error('Sesi tidak ditemukan.');
        const data = await getDataPresensi(phpSessId);
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
                      matkul: item.matakuliah 
                    }
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

import { getKhsSemesters, getKhsData, SemesterOption, KhsItem, KhsSummary } from '../services/akademik/khsService';

// ==========================================
// KONTEN TAB: KHS (NILAI)
// ==========================================
function KhsContent() {
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
        
        const sems = await getKhsSemesters(phpSessId);
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
        
        const result = await getKhsData(activeSemester, phpSessId);
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
          {semesters.map((sem) => (
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
          keyExtractor={(item) => item.kode + item.kelas}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          ListHeaderComponent={
            <View className="mb-4 gap-3">
              {/* Kartu IP Ringkasan */}
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

import { getTagihanSemesters, getTagihanData, SemesterTagihanOption, TagihanItem } from '../services/akademik/tagihanService';

// ==========================================
// KONTEN TAB: TAGIHAN
// ==========================================
function TagihanContent() {
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

        const sems = await getTagihanSemesters(phpSessId);
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

        const data = await getTagihanData(activeSemester, phpSessId);
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
          {semesters.map((sem) => (
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
          keyExtractor={(item) => item.noTagihan}
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

// ==========================================
// KONTEN TAB: Coming Soon Placeholder
// ==========================================
function ComingSoon({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Feather name="clock" size={40} color="#999" />
      <Text className="font-black text-black/30 text-lg uppercase mt-4 tracking-widest">{label}</Text>
      <Text className="text-black/30 text-sm mt-1">Segera hadir</Text>
    </View>
  );
}

// ==========================================
// SCREEN UTAMA: Akademik
// ==========================================
export default function AkademikScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('krs');

  const renderContent = () => {
    switch (activeTab) {
      case 'krs': return <KrsContent />;
      case 'presensi': return <PresensiContent />;
      case 'nilai': return <KhsContent />;
      case 'jadwal': return <ComingSoon label="Jadwal" />;
      case 'tagihan': return <TagihanContent />;
      default: return null;
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
