import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getLmsState, clearLmsState } from '../services/lms/lmsService';
import {
  cleanHtmlText,
  getUrgencyInfo,
  formatLmsDate,
  getModuleIconName,
} from '../services/lms/lmsParser';
import { LmsCourse, LmsAssignment, LmsUser } from '../services/lms/lmsTypes';
import { LmsAuthModal } from '../components/lms/LmsAuthModal';
import { LmsBackgroundSyncer, LmsBackgroundSyncerRef } from '../components/lms/LmsBackgroundSyncer';
import { LmsCourseSearchTab } from '../components/lms/LmsCourseSearchTab';

export default function LmsScreen() {
  const router = useRouter();
  const syncerRef = useRef<LmsBackgroundSyncerRef>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'assignments' | 'courses' | 'search'>('assignments');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncKey, setSyncKey] = useState(0);

  const [isConnected, setIsConnected] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [user, setUser] = useState<LmsUser | null>(null);
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [assignments, setAssignments] = useState<LmsAssignment[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const loadLocalData = useCallback(async () => {
    try {
      const state = await getLmsState();
      setUser(state.user);
      setCourses(state.courses);
      setAssignments(state.assignments);
      setIsConnected(state.isConnected);
      setLastSync(state.lastSyncedAt);
    } catch (err) {
      console.warn('Gagal memuat cache LMS:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  const handleRefresh = () => {
    if (!isConnected) {
      setShowAuthModal(true);
      return;
    }
    setRefreshing(true);
    setSyncKey(prev => prev + 1);
  };

  const handleLogout = () => {
    Alert.alert(
      'Putuskan LMS?',
      'Data mata kuliah dan tugas yang tersimpan di Kudu akan dihapus dari perangkat ini.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Putuskan',
          style: 'destructive',
          onPress: async () => {
            await clearLmsState();
            setIsConnected(false);
            setUser(null);
            setCourses([]);
            setAssignments([]);
            setSessionExpired(false);
          },
        },
      ]
    );
  };

  const openUrl = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Gagal', 'Tidak dapat membuka tautan ini.');
      }
    } catch {
      Alert.alert('Gagal', 'Terjadi kesalahan saat membuka tautan.');
    }
  };

  // Urutkan tugas: yang terlambat atau deadline terdekat berada di posisi paling atas
  const sortedAssignments = [...assignments].sort((a, b) => a.timesort - b.timesort);

  return (
    <SafeAreaView className="flex-1 bg-[#f4f4f0]" style={{ flex: 1, backgroundColor: '#f4f4f0' }}>
      {/* Background Syncer */}
      {isConnected && (
        <LmsBackgroundSyncer
          ref={syncerRef}
          syncKey={syncKey}
          onSyncSuccess={() => {
            setSessionExpired(false);
            loadLocalData();
          }}
          onSessionExpired={() => {
            setSessionExpired(true);
            setRefreshing(false);
          }}
        />
      )}

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

        {isConnected ? (
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center gap-1.5 border-2 border-black bg-[#ff4d4d] px-3 py-2 rounded-lg border-b-[4px] border-r-[4px]"
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={16} color="white" />
            <Text className="font-black text-white uppercase text-xs">Putuskan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setShowAuthModal(true)}
            className="flex-row items-center gap-1.5 border-2 border-black bg-[#c1ff72] px-3.5 py-2 rounded-lg border-b-[4px] border-r-[4px]"
            activeOpacity={0.8}
          >
            <Feather name="log-in" size={16} color="black" />
            <Text className="font-black text-black uppercase text-xs">Hubungkan</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Title & Badge */}
      <View className="px-5 mt-4 mb-3">
        <Text className="text-3xl font-black text-black uppercase tracking-widest">LMS Moodle</Text>
        <Text className="text-xs font-bold text-black uppercase tracking-wider bg-[#70d6ff] px-2 mt-1 self-start border border-black">
          UIN Syarif Hidayatullah
        </Text>
      </View>

      {/* Banner Sesi Kedaluwarsa */}
      {sessionExpired && (
        <TouchableOpacity
          onPress={() => setShowAuthModal(true)}
          className="mx-5 mb-3 p-3.5 rounded-xl border-2 border-black bg-[#ff914d] border-b-[4px] border-r-[4px] flex-row items-center gap-3"
          activeOpacity={0.8}
        >
          <Feather name="alert-triangle" size={20} color="black" />
          <View className="flex-1">
            <Text className="font-black text-black text-xs uppercase">Sesi LMS Kedaluwarsa</Text>
            <Text className="text-xs text-black/80 font-bold">
              Ketuk di sini untuk login Google ulang dan memperbarui data.
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="black" />
        </TouchableOpacity>
      )}

      {/* User Card atau Banner Hubungkan */}
      {isConnected ? (
        <View className="mx-5 mb-3 p-4 rounded-xl border-2 border-black bg-[#1a1a2e] border-b-[5px] border-r-[5px]">
          <View className="flex-row items-center gap-3">
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                className="w-12 h-12 rounded-full border-2 border-[#ffde59]"
              />
            ) : (
              <View className="w-12 h-12 rounded-full bg-[#ffde59] border-2 border-black items-center justify-center">
                <Feather name="user" size={24} color="black" />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-white font-black text-base" numberOfLines={1}>
                {user?.name || 'Mahasiswa UIN'}
              </Text>
              <Text className="text-[#c1ff72] text-xs font-bold mt-0.5">
                ● Terhubung ke Moodle
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing}
              className="w-10 h-10 rounded-lg bg-white border-2 border-black items-center justify-center border-b-[3px] border-r-[3px]"
              activeOpacity={0.7}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Feather name="refresh-cw" size={16} color="black" />
              )}
            </TouchableOpacity>
          </View>

          {lastSync && (
            <Text className="text-white/50 text-[11px] font-bold mt-3 border-t border-white/10 pt-2">
              Terakhir diperbarui: {formatLmsDate(Math.floor(lastSync / 1000))}
            </Text>
          )}
        </View>
      ) : (
        <View className="mx-5 mb-3 p-4 rounded-xl border-2 border-black bg-[#ffde59] border-b-[5px] border-r-[5px]">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-black items-center justify-center">
              <Feather name="link" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text className="font-black text-black text-sm uppercase">LMS Belum Terhubung</Text>
              <Text className="text-xs text-black/80 font-bold mt-0.5">
                Hubungkan dengan Google SSO untuk melihat tugas & matakuliah.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowAuthModal(true)}
            className="mt-3 bg-black py-2.5 px-4 rounded-lg flex-row items-center justify-center gap-2"
            activeOpacity={0.8}
          >
            <Feather name="shield" size={14} color="white" />
            <Text className="text-white font-black text-xs uppercase tracking-wider">
              Hubungkan Sekarang
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Navigation Neobrutalism (3 Tabs) */}
      <View className="px-4 flex-row gap-2 mb-3">
        <TouchableOpacity
          onPress={() => setActiveTab('assignments')}
          className={`flex-1 py-2 px-2 rounded-xl border-2 border-black flex-row items-center justify-center gap-1.5 ${
            activeTab === 'assignments'
              ? 'bg-[#ffde59] border-b-[4px] border-r-[4px]'
              : 'bg-white border-b-2 border-r-2 opacity-75'
          }`}
          activeOpacity={0.8}
        >
          <Feather name="check-square" size={14} color="black" />
          <Text className="font-black text-black uppercase text-[11px]">Tugas</Text>
          {assignments.length > 0 && (
            <View className="bg-black px-1.5 py-0.2 rounded-full">
              <Text className="text-white text-[9px] font-black">{assignments.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('courses')}
          className={`flex-1 py-2 px-2 rounded-xl border-2 border-black flex-row items-center justify-center gap-1.5 ${
            activeTab === 'courses'
              ? 'bg-[#70d6ff] border-b-[4px] border-r-[4px]'
              : 'bg-white border-b-2 border-r-2 opacity-75'
          }`}
          activeOpacity={0.8}
        >
          <Feather name="book-open" size={14} color="black" />
          <Text className="font-black text-black uppercase text-[11px]">Terdaftar</Text>
          {courses.length > 0 && (
            <View className="bg-black px-1.5 py-0.2 rounded-full">
              <Text className="text-white text-[9px] font-black">{courses.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('search')}
          className={`flex-1 py-2 px-2 rounded-xl border-2 border-black flex-row items-center justify-center gap-1.5 ${
            activeTab === 'search'
              ? 'bg-[#c1ff72] border-b-[4px] border-r-[4px]'
              : 'bg-white border-b-2 border-r-2 opacity-75'
          }`}
          activeOpacity={0.8}
        >
          <Feather name="search" size={14} color="black" />
          <Text className="font-black text-black uppercase text-[11px]">Cari Kursus</Text>
        </TouchableOpacity>
      </View>

      {/* Konten Tab */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="mt-3 font-bold text-black text-xs uppercase tracking-wider">
            Memuat data LMS...
          </Text>
        </View>
      ) : activeTab === 'assignments' ? (
        <FlatList
          data={sortedAssignments}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#000000"
            />
          }
          renderItem={({ item }) => {
            const urgency = getUrgencyInfo(item.timesort);
            const iconName = getModuleIconName(item.modulename);
            const title = cleanHtmlText(item.activityname || item.name);
            const courseTitle = item.course ? cleanHtmlText(item.course.fullname) : '';

            return (
              <View className="rounded-xl border-2 border-black bg-white border-b-[5px] border-r-[5px] p-4">
                {/* Header Kartu: Mata Kuliah & Urgency Badge */}
                <View className="flex-row items-center justify-between gap-2 mb-2">
                  <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                    <Feather name={iconName} size={14} color="#666" />
                    <Text className="text-xs font-bold text-black/70 flex-1" numberOfLines={1}>
                      {courseTitle || 'Kegiatan Perkuliahan'}
                    </Text>
                  </View>

                  <View
                    className="border border-black px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: urgency.badgeBg }}
                  >
                    <Text
                      className="text-[11px] font-black uppercase tracking-wider"
                      style={{ color: urgency.textColor }}
                    >
                      {urgency.label}
                    </Text>
                  </View>
                </View>

                {/* Judul Tugas */}
                <Text className="font-black text-black text-base mb-2" numberOfLines={2}>
                  {title}
                </Text>

                {/* Tanggal Deadline & Aksi */}
                <View className="pt-2 border-t border-black/10 flex-row items-center justify-between mt-1">
                  <View className="flex-row items-center gap-1.5">
                    <Feather name="clock" size={13} color="#555" />
                    <Text className="text-xs font-bold text-black/70">
                      {formatLmsDate(item.timesort)}
                    </Text>
                  </View>

                  {item.action?.url ? (
                    <TouchableOpacity
                      onPress={() => openUrl(item.action?.url)}
                      className="bg-[#c1ff72] border border-black px-2.5 py-1 rounded-md flex-row items-center gap-1 border-b-[2px] border-r-[2px]"
                      activeOpacity={0.7}
                    >
                      <Text className="text-[11px] font-black text-black uppercase">
                        {item.action.name || 'Buka'}
                      </Text>
                      <Feather name="external-link" size={11} color="black" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-6">
              <View className="w-16 h-16 rounded-full bg-[#c1ff72] border-2 border-black items-center justify-center mb-3">
                <Feather name="check-circle" size={32} color="black" />
              </View>
              <Text className="text-lg font-black text-black uppercase">Tidak Ada Deadline</Text>
              <Text className="text-xs text-black/60 font-bold text-center mt-1">
                Semua tugas beres atau belum ada jadwal mendatang. Aman terkendali!
              </Text>
            </View>
          }
        />
      ) : activeTab === 'courses' ? (
        <FlatList
          data={courses}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#000000"
            />
          }
          renderItem={({ item }) => {
            const courseName = cleanHtmlText(item.fullname);

            return (
              <View className="rounded-xl border-2 border-black bg-white border-b-[5px] border-r-[5px] p-4">
                <View className="flex-row items-start justify-between gap-2 mb-2">
                  <Text className="font-black text-black text-base flex-1 pr-2" numberOfLines={2}>
                    {courseName}
                  </Text>
                  {item.shortname ? (
                    <View className="bg-[#ffde59] border border-black px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-black text-black uppercase">
                        {item.shortname}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {item.coursecategory ? (
                  <Text className="text-xs text-black/60 font-bold mb-2">
                    {item.coursecategory}
                  </Text>
                ) : null}

                {/* Progress Bar jika ada */}
                {item.hasprogress && typeof item.progress === 'number' ? (
                  <View className="mt-1 mb-2">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-[11px] font-bold text-black/60">Progress Kuliah</Text>
                      <Text className="text-[11px] font-black text-black">{item.progress}%</Text>
                    </View>
                    <View className="h-3 w-full bg-black/10 rounded-full border border-black overflow-hidden">
                      <View
                        className="h-full bg-[#c1ff72]"
                        style={{ width: `${Math.min(item.progress, 100)}%` }}
                      />
                    </View>
                  </View>
                ) : null}

                <View className="pt-2 border-t border-black/10 flex-row items-center justify-end">
                  <TouchableOpacity
                    onPress={() => openUrl(item.viewurl)}
                    className="bg-[#70d6ff] border border-black px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 border-b-[2px] border-r-[2px]"
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-black text-black uppercase">Buka di Moodle</Text>
                    <Feather name="arrow-up-right" size={13} color="black" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-6">
              <View className="w-16 h-16 rounded-full bg-[#ffde59] border-2 border-black items-center justify-center mb-3">
                <Feather name="book" size={32} color="black" />
              </View>
              <Text className="text-lg font-black text-black uppercase">Mata Kuliah Kosong</Text>
              <Text className="text-xs text-black/60 font-bold text-center mt-1">
                Belum ada data mata kuliah yang terdeteksi dari akun Anda.
              </Text>
            </View>
          }
        />
      ) : (
        <LmsCourseSearchTab
          isConnected={isConnected}
          onRequestConnect={() => setShowAuthModal(true)}
          syncerRef={syncerRef}
          openUrl={openUrl}
        />
      )}

      {/* Modal Autentikasi Google LMS */}
      <LmsAuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          loadLocalData();
          setSyncKey(prev => prev + 1);
        }}
      />
    </SafeAreaView>
  );
}
