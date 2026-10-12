import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getProfileData, StudentProfileData } from '../../services/akademik/profileService';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<StudentProfileData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchProfile = async (isPullRefresh: boolean = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const data = await getProfileData();
      setProfileData(data);
    } catch (err: any) {
      console.error('[PROFILE] Error fetching profile:', err);
      setErrorMessage(err.message || 'Gagal memuat profil mahasiswa.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchProfile();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-[#f4f4f0]">
        {/* Header Bar */}
        <View className="mt-5 px-4 pt-12 pb-3 flex-row items-center justify-between border-b-2 border-black bg-white z-20">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-lg bg-[#ffde59] border-2 border-black items-center justify-center border-b-[3px] border-r-[3px]">
              <Feather name="user" size={16} color="black" />
            </View>
            <View>
              <Text className="text-xl font-black text-black uppercase tracking-wider">Profil</Text>
              <Text className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Portal Akademik</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="flex-row items-center gap-1 border-2 border-black bg-[#ff914d] px-3 py-1.5 rounded-lg border-b-[4px] border-r-[4px]"
            activeOpacity={0.8}
          >
            <Feather name="x" size={16} color="black" />
            <Text className="font-black text-black uppercase text-xs">Tutup</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading && !refreshing ? (
          <View className="flex-1 items-center justify-center p-6">
            <View className="p-6 bg-white border-2 border-black rounded-xl border-b-[6px] border-r-[6px] items-center">
              <ActivityIndicator size="large" color="#000" />
              <Text className="font-black text-black text-sm uppercase mt-4 tracking-wider">Memuat Profil...</Text>
            </View>
          </View>
        ) : errorMessage ? (
          <View className="flex-1 items-center justify-center p-6">
            <View className="p-6 bg-white border-2 border-black rounded-xl border-b-[6px] border-r-[6px] items-center max-w-sm w-full">
              <View className="w-12 h-12 rounded-full bg-[#ff914d] border-2 border-black items-center justify-center mb-3">
                <Feather name="alert-circle" size={24} color="black" />
              </View>
              <Text className="font-black text-black text-base uppercase text-center mb-2">Terjadi Kesalahan</Text>
              <Text className="font-bold text-gray-700 text-xs text-center mb-4">{errorMessage}</Text>
              <TouchableOpacity
                onPress={() => fetchProfile()}
                className="flex-row items-center gap-2 border-2 border-black bg-[#ffde59] px-4 py-2.5 rounded-lg border-b-[4px] border-r-[4px]"
                activeOpacity={0.8}
              >
                <Feather name="refresh-cw" size={14} color="black" />
                <Text className="font-black text-black uppercase text-xs">Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : profileData ? (
          <ScrollView
            className="flex-1 px-4 pt-4"
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchProfile(true)} colors={['#000']} />
            }
          >
            {/* Card Hero: Avatar & Nama Mahasiswa */}
            <View className="bg-white border-2 border-black rounded-xl p-5 mb-5 border-b-[6px] border-r-[6px]">
              <View className="flex-row items-center gap-4">
                <View className="w-16 h-16 rounded-xl bg-[#ffde59] border-2 border-black items-center justify-center border-b-[4px] border-r-[4px]">
                  <Text className="text-2xl font-black text-black">
                    {profileData.nama.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-black text-black uppercase tracking-wide" numberOfLines={2}>
                    {profileData.nama}
                  </Text>
                  <View className="flex-row flex-wrap items-center gap-2 mt-2">
                    <View className="bg-[#f4f4f0] border border-black px-2 py-0.5 rounded">
                      <Text className="text-[11px] font-black text-black">NIM: {profileData.nim}</Text>
                    </View>
                    <View className="bg-[#a6e22e] border border-black px-2 py-0.5 rounded">
                      <Text className="text-[11px] font-black text-black">{profileData.status}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Quick Contact Chips */}
              <View className="mt-4 pt-4 border-t-2 border-black/10 flex-col gap-2">
                {profileData.emailUniversitas !== '-' && (
                  <View className="flex-row items-center gap-2">
                    <Feather name="mail" size={13} color="#555" />
                    <Text className="text-xs font-bold text-gray-800 flex-1">{profileData.emailUniversitas}</Text>
                  </View>
                )}
                {profileData.noHandphone !== '-' && (
                  <View className="flex-row items-center gap-2">
                    <Feather name="phone" size={13} color="#555" />
                    <Text className="text-xs font-bold text-gray-800">{profileData.noHandphone}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Sections List */}
            {profileData.sections.map((sec, secIdx) => (
              <View
                key={secIdx}
                className="bg-white border-2 border-black rounded-xl mb-4 p-4 border-b-[5px] border-r-[5px]"
              >
                {/* Section Header */}
                <View className="flex-row items-center gap-2 mb-3 pb-2 border-b-2 border-black">
                  <View className="w-2.5 h-2.5 bg-[#ff914d] border border-black" />
                  <Text className="font-black text-black text-xs uppercase tracking-widest">{sec.title}</Text>
                </View>

                {/* Items */}
                <View className="flex-col gap-2.5">
                  {sec.items.map((item, itemIdx) => (
                    <View
                      key={itemIdx}
                      className="flex-row justify-between items-start py-1 border-b border-gray-100 last:border-b-0"
                    >
                      <Text className="text-xs font-bold text-gray-600 uppercase w-5/12 pr-2">{item.label}</Text>
                      <Text
                        className="text-xs font-black text-black text-right flex-1 select-text"
                        selectable
                      >
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
