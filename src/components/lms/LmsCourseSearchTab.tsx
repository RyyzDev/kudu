import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LMS_CATEGORIES, LmsCourseCategory, LmsSearchCourseItem } from '../../services/lms/lmsTypes';
import { fetchLmsCourses } from '../../services/lms/lmsSearchService';
import { LmsBackgroundSyncerRef } from './LmsBackgroundSyncer';

interface LmsCourseSearchTabProps {
  isConnected: boolean;
  onRequestConnect: () => void;
  syncerRef: React.RefObject<LmsBackgroundSyncerRef | null>;
  openUrl: (url?: string) => void;
}

export function LmsCourseSearchTab({
  isConnected,
  onRequestConnect,
  syncerRef,
  openUrl,
}: LmsCourseSearchTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [courses, setCourses] = useState<LmsSearchCourseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const executeSearch = useCallback(
    async (query: string, categoryId: number) => {
      setLoading(true);
      setErrorMessage(null);
      setHasSearched(true);

      try {
        const fetcher = syncerRef.current ? syncerRef.current.fetchUrl : undefined;
        const results = await fetchLmsCourses(query, categoryId, fetcher);
        setCourses(results);
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal memuat mata kuliah dari LMS.');
      } finally {
        setLoading(false);
      }
    },
    [syncerRef]
  );

  // Otomatis memuat kategori default saat pertama kali dibuka jika terhubung
  useEffect(() => {
    if (isConnected && !hasSearched) {
      executeSearch('', 0);
    }
  }, [isConnected, hasSearched, executeSearch]);

  const handleSearchSubmit = () => {
    executeSearch(searchQuery, selectedCategory);
  };

  const handleCategorySelect = (cat: LmsCourseCategory) => {
    setSelectedCategory(cat.id);
    executeSearch(searchQuery, cat.id);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    executeSearch('', selectedCategory);
  };

  return (
    <View className="flex-1">
      {/* Search Input Box */}
      <View className="px-5 mb-3">
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-white border-2 border-black rounded-xl px-3 py-2 border-b-[4px] border-r-[4px]">
            <Feather name="search" size={18} color="#555" />
            <TextInput
              className="flex-1 ml-2 text-black font-bold text-sm"
              placeholder="Cari mata kuliah..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} className="p-1">
                <Feather name="x" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handleSearchSubmit}
            disabled={loading}
            className="bg-[#c1ff72] border-2 border-black px-4 py-3 rounded-xl border-b-[4px] border-r-[4px] items-center justify-center"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text className="font-black text-black text-xs uppercase tracking-wider">Cari</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Pills Horizontal Scroll */}
      <View className="mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {LMS_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleCategorySelect(cat)}
                className={`px-3 py-1.5 rounded-lg border-2 border-black ${
                  isSelected
                    ? 'bg-[#ffde59] border-b-[4px] border-r-[4px]'
                    : 'bg-white border-b-2 border-r-2 opacity-80'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-xs font-black uppercase tracking-wider ${
                    isSelected ? 'text-black' : 'text-black/70'
                  }`}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Hasil Pencarian / State */}
      {loading ? (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="mt-3 font-bold text-black text-xs uppercase tracking-wider">
            Mencari mata kuliah di LMS...
          </Text>
        </View>
      ) : errorMessage ? (
        <View className="px-5 py-8 items-center">
          <View className="w-full bg-[#ff914d] border-2 border-black rounded-xl p-4 border-b-[5px] border-r-[5px] mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Feather name="alert-circle" size={20} color="black" />
              <Text className="font-black text-black text-sm uppercase">Pencarian Terkendala</Text>
            </View>
            <Text className="text-xs font-bold text-black/80">{errorMessage}</Text>
          </View>

          {!isConnected && (
            <TouchableOpacity
              onPress={onRequestConnect}
              className="bg-[#ffde59] border-2 border-black px-5 py-3 rounded-xl border-b-[4px] border-r-[4px] flex-row items-center gap-2"
              activeOpacity={0.8}
            >
              <Feather name="log-in" size={16} color="black" />
              <Text className="font-black text-black uppercase text-xs">Hubungkan Akun LMS</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}
          ListHeaderComponent={
            courses.length > 0 ? (
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-black text-black uppercase tracking-wider">
                  Ditemukan {courses.length} Mata Kuliah
                </Text>
                {selectedCategory > 0 && (
                  <Text className="text-[11px] font-bold text-black/60">
                    Kategori:{' '}
                    {LMS_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Kustom'}
                  </Text>
                )}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            return (
              <View className="rounded-xl border-2 border-black bg-white border-b-[5px] border-r-[5px] p-4">
                {/* Header Kartu: Judul Mata Kuliah */}
                <View className="flex-row items-start justify-between gap-2 mb-2">
                  <Text className="font-black text-black text-base flex-1 pr-2" numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View className="bg-[#f0f0f0] border border-black px-2 py-0.5 rounded">
                    <Text className="text-[10px] font-black text-black/70">ID: {item.id}</Text>
                  </View>
                </View>

                {/* Badge Status Enrolment */}
                <View className="flex-row flex-wrap items-center gap-2 mb-2">
                  {item.isSelfEnrol ? (
                    <View className="bg-[#c1ff72] border border-black px-2.5 py-1 rounded-full flex-row items-center gap-1.5">
                      <Feather name="key" size={12} color="black" />
                      <Text className="text-[11px] font-black text-black uppercase">
                        Self Enrolment (Pendaftaran Mandiri)
                      </Text>
                    </View>
                  ) : (
                    <View className="bg-[#e0e0e0] border border-black px-2.5 py-1 rounded-full flex-row items-center gap-1.5">
                      <Feather name="lock" size={12} color="#555" />
                      <Text className="text-[11px] font-black text-black/70 uppercase">
                        Enrolment Tertutup / Terjadwal
                      </Text>
                    </View>
                  )}
                </View>

                {/* Ringkasan Matakuliah jika ada */}
                {item.summary ? (
                  <Text className="text-xs font-bold text-black/70 mb-3" numberOfLines={3}>
                    {item.summary}
                  </Text>
                ) : null}

                {/* Footer Kartu & Tombol Aksi */}
                <View className="pt-3 border-t border-black/10 flex-row items-center justify-end gap-2">
                  {item.infoUrl ? (
                    <TouchableOpacity
                      onPress={() => openUrl(item.infoUrl)}
                      className="bg-[#ffde59] border border-black px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 border-b-[2px] border-r-[2px]"
                      activeOpacity={0.7}
                    >
                      <Feather name="info" size={13} color="black" />
                      <Text className="text-xs font-black text-black uppercase">Info</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => openUrl(item.url)}
                    className="bg-[#70d6ff] border border-black px-3.5 py-1.5 rounded-lg flex-row items-center gap-1.5 border-b-[2px] border-r-[2px]"
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-black text-black uppercase">Masuk Mata Kuliah</Text>
                    <Feather name="arrow-up-right" size={13} color="black" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-6">
              <View className="w-16 h-16 rounded-full bg-[#70d6ff] border-2 border-black items-center justify-center mb-3">
                <Feather name="search" size={28} color="black" />
              </View>
              <Text className="text-base font-black text-black uppercase">
                {hasSearched ? 'Mata Kuliah Tidak Ditemukan' : 'Cari Mata Kuliah di LMS'}
              </Text>
              <Text className="text-xs text-black/60 font-bold text-center mt-1">
                {hasSearched
                  ? 'Coba gunakan kata kunci lain atau pilih kategori yang berbeda.'
                  : 'Gunakan kolom pencarian di atas atau pilih kategori matakuliah untuk menjelajah.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
