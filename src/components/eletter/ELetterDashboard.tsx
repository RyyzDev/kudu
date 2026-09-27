import React from 'react';
import {
  View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator,
  FlatList, ScrollView, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ELetterSurat, ELetterDropdownOption } from '../../services/eletter/eletterService';

interface Props {
  activeTab: 'list' | 'add';
  suratList: ELetterSurat[];
  loadingDashboard: boolean;
  formOptions: ELetterDropdownOption[];
  selectedSurat: string;
  mahasiswaInfo: { nim: string; nama: string };
  tipePengajuan: string;
  isSubmitting: boolean;
  onSwitchTab: (tab: 'list' | 'add') => void;
  onSelectSurat: (val: string) => void;
  onSetTipe: (val: string) => void;
  onSubmit: () => void;
}

export function ELetterDashboard({
  activeTab, suratList, loadingDashboard, formOptions,
  selectedSurat, mahasiswaInfo, tipePengajuan, isSubmitting,
  onSwitchTab, onSelectSurat, onSetTipe, onSubmit,
}: Props) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#f4f4f0]">
      {/* Header */}
      <View className="px-6 pt-16 pb-4 flex-row items-center justify-between border-b-2 border-black bg-white">
        <View>
          <Text className="text-4xl font-black text-black uppercase tracking-widest">E-LETTER</Text>
          <Text className="text-xs font-bold text-black uppercase tracking-wider bg-[#c1ff72] px-2 mt-1 self-start border border-black">
            Surat Digital FST
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-12 h-12 bg-white border-2 border-black rounded-xl items-center justify-center border-b-[4px] border-r-[4px]"
          activeOpacity={0.8}
        >
          <Feather name="x" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Tab Nav */}
      <View className="flex-row px-6 pt-4 gap-3">
        <TouchableOpacity
          onPress={() => onSwitchTab('list')}
          className={`flex-1 items-center justify-center py-3 border-2 border-black rounded-xl border-b-[4px] border-r-[4px] ${activeTab === 'list' ? 'bg-[#ffde59]' : 'bg-white'}`}
        >
          <Text className="font-black text-black uppercase">Riwayat Surat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onSwitchTab('add')}
          className={`flex-1 items-center justify-center py-3 border-2 border-black rounded-xl border-b-[4px] border-r-[4px] ${activeTab === 'add' ? 'bg-[#c1ff72]' : 'bg-white'}`}
        >
          <Text className="font-black text-black uppercase">Buat Surat</Text>
        </TouchableOpacity>
      </View>

      {loadingDashboard ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="black" />
        </View>
      ) : (
        <View className="flex-1 px-6 pt-4 pb-6">
          {/* Tab: Riwayat Surat */}
          {activeTab === 'list' && (
            <FlatList
              data={suratList}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
              ListEmptyComponent={
                <Text className="text-center font-bold text-black/50 mt-10">
                  Belum ada surat yang diajukan.
                </Text>
              }
              renderItem={({ item }) => (
                <View className={`bg-white border-2 border-black rounded-xl p-4 border-b-[4px] border-r-[4px] ${item.isSigned ? 'bg-white' : 'bg-[#ffde59]'}`}>
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="font-black text-lg text-black flex-1 mr-2">{item.jenisSurat}</Text>
                    <View className="bg-black/10 px-2 py-1 rounded">
                      <Text className="text-[10px] font-bold text-black uppercase">{item.tanggal}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between mt-2">
                    <View className="flex-row items-center gap-2">
                      <Feather name="file-text" size={14} color="#555" />
                      <Text className="text-xs font-bold text-black/70">Tipe: {item.tipe || 'Tidak diketahui'}</Text>
                    </View>
                    <View className={`px-2 py-1 border-2 border-black rounded-lg ${item.isSigned ? 'bg-[#c1ff72]' : 'bg-white'}`}>
                      <Text className="text-[10px] font-black text-black uppercase">{item.statusText}</Text>
                    </View>
                  </View>
                  {item.isSigned && item.printUrl && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(item.printUrl!)}
                      className="mt-3 flex-row items-center justify-center gap-2 bg-black py-2 rounded-lg"
                    >
                      <Feather name="printer" size={16} color="white" />
                      <Text className="font-black text-white uppercase text-xs">Cetak / Download Surat</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}

          {/* Tab: Buat Surat */}
          {activeTab === 'add' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="bg-white border-2 border-black rounded-xl p-4 border-b-[4px] border-r-[4px] mb-4">
                <Text className="font-black text-black mb-3">PILIH JENIS SURAT</Text>
                <ScrollView className="max-h-64 border-2 border-black rounded-lg bg-black/5" nestedScrollEnabled>
                  <View className="gap-0">
                    {formOptions.map((opt, index) => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => onSelectSurat(opt.value)}
                        className={`p-3 border-b-2 border-black/20 ${selectedSurat === opt.value ? 'bg-[#ffde59]' : 'bg-transparent'} ${index === formOptions.length - 1 ? 'border-b-0' : ''}`}
                      >
                        <Text className={`text-xs ${selectedSurat === opt.value ? 'font-black text-black' : 'font-bold text-black/70'}`}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {selectedSurat ? (
                <View className="bg-[#c1ff72] border-2 border-black rounded-xl p-4 border-b-[4px] border-r-[4px] mb-4">
                  <Text className="font-black text-black mb-2">DATA PENGAJU</Text>
                  <Text className="font-bold text-black/70 text-xs">NIM: <Text className="text-black">{mahasiswaInfo.nim}</Text></Text>
                  <Text className="font-bold text-black/70 text-xs mt-1">Nama: <Text className="text-black">{mahasiswaInfo.nama}</Text></Text>

                  <Text className="font-black text-black mt-4 mb-2">TIPE PENGAJUAN</Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => onSetTipe('1')}
                      className={`flex-1 p-2 border-2 border-black rounded-lg items-center ${tipePengajuan === '1' ? 'bg-white' : 'bg-black/5'}`}
                    >
                      <Text className="font-bold text-xs">Elektronik</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onSetTipe('2')}
                      className={`flex-1 p-2 border-2 border-black rounded-lg items-center ${tipePengajuan === '2' ? 'bg-white' : 'bg-black/5'}`}
                    >
                      <Text className="font-bold text-xs">Manual</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={onSubmit}
                    disabled={isSubmitting}
                    className="mt-6 bg-black p-3 rounded-lg items-center"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-black text-white uppercase">Ajukan Surat</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
