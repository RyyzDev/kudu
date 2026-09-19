import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, ScrollView, FlatList, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { eletterApi } from '../services/eletter/eletterApi';
import { loginELetter, checkELetterSession, ELETTER_URL, DEFAULT_HEADERS } from '../services/eletter/eletterAuthService';
import { getELetterDashboard, getELetterFormAdd, ELetterSurat, ELetterDropdownOption } from '../services/eletter/eletterService';

export default function ELetterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Dashboard State
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [suratList, setSuratList] = useState<ELetterSurat[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Add Form State
  const [formOptions, setFormOptions] = useState<ELetterDropdownOption[]>([]);
  const [selectedSurat, setSelectedSurat] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [mahasiswaInfo, setMahasiswaInfo] = useState({ nim: '', nama: '' });
  const [tipePengajuan, setTipePengajuan] = useState('1'); // 1=Elektronik, 2=Manual

  useEffect(() => {
    checkSessionAndAutoLogin();
  }, []);

  const checkSessionAndAutoLogin = async () => {
    try {
      const sessionValid = await checkELetterSession();
      if (sessionValid) {
        setIsLoggedIn(true);
        loadDashboard();
        return;
      }

      let storedNim = null;
      let storedPwd = null;
      if (Platform.OS !== 'web') {
        storedNim = await SecureStore.getItemAsync('nim');
        storedPwd = await SecureStore.getItemAsync('password');
      }

      if (storedNim && storedPwd) {
        const success = await loginELetter(storedNim, storedPwd);
        if (success) {
          setIsLoggedIn(true);
          loadDashboard();
        }
      }
    } catch (e: any) {
      console.log('Auto login failed:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = async () => {
    if (!username || !password) {
      Alert.alert('Gagal', 'Username dan Password wajib diisi.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const success = await loginELetter(username, password);
      if (success) {
        setIsLoggedIn(true);
        loadDashboard();
      }
    } catch (e: any) {
      Alert.alert('Login Gagal', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const data = await getELetterDashboard();
      setSuratList(data.suratList);
      setCsrfToken(data.csrfToken); // Selalu update token
    } catch (e: any) {
      Alert.alert('Gagal Memuat Dashboard', e.message);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadFormAdd = async () => {
    setLoadingDashboard(true);
    try {
      const data = await getELetterFormAdd();
      setFormOptions(data.options);
      setCsrfToken(data.csrfToken); // Update CSRF
      setMahasiswaInfo({ nim: data.nim, nama: data.nama });
    } catch (e: any) {
      Alert.alert('Gagal Memuat Form', e.message);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const switchTab = (tab: 'list' | 'add') => {
    setActiveTab(tab);
    if (tab === 'list') loadDashboard();
    if (tab === 'add') loadFormAdd();
  };

  const submitPengajuan = async () => {
    if (!selectedSurat) {
      Alert.alert('Peringatan', 'Silahkan pilih jenis surat terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new URLSearchParams({
        _token: csrfToken,
        id_surat: selectedSurat,
        tipe: tipePengajuan
      });

      const res = await eletterApi.post('/pengajuansurat', payload.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': ELETTER_URL + '/persuratan/add'
        }
      });
      
      Alert.alert('Sukses', 'Surat berhasil diajukan!');
      switchTab('list');
    } catch (e: any) {
      Alert.alert('Gagal Mengajukan', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#f4f4f0] items-center justify-center">
        <ActivityIndicator size="large" color="black" />
        <Text className="mt-4 font-bold text-black uppercase tracking-wider">Menghubungkan ke E-Letter...</Text>
      </SafeAreaView>
    );
  }

  if (isLoggedIn) {
    return (
      <SafeAreaView className="flex-1 bg-[#f4f4f0]">
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

        {/* Tab Navigasi */}
        <View className="flex-row px-6 pt-4 gap-3">
          <TouchableOpacity
            onPress={() => switchTab('list')}
            className={`flex-1 items-center justify-center py-3 border-2 border-black rounded-xl border-b-[4px] border-r-[4px] ${activeTab === 'list' ? 'bg-[#ffde59]' : 'bg-white'}`}
          >
            <Text className="font-black text-black uppercase">Riwayat Surat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => switchTab('add')}
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
            {activeTab === 'list' && (
              <FlatList
                data={suratList}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
                ListEmptyComponent={<Text className="text-center font-bold text-black/50 mt-10">Belum ada surat yang diajukan.</Text>}
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

            {activeTab === 'add' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="bg-white border-2 border-black rounded-xl p-4 border-b-[4px] border-r-[4px] mb-4">
                  <Text className="font-black text-black mb-3">PILIH JENIS SURAT</Text>
                  
                  {/* Custom Simple Dropdown Simulation */}
                  <ScrollView className="max-h-64 border-2 border-black rounded-lg bg-black/5" nestedScrollEnabled={true}>
                    <View className="gap-0">
                      {formOptions.map((opt, index) => (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setSelectedSurat(opt.value)}
                          className={`p-3 border-b-2 border-black/20 ${selectedSurat === opt.value ? 'bg-[#ffde59]' : 'bg-transparent'} ${index === formOptions.length - 1 ? 'border-b-0' : ''}`}
                        >
                          <Text className={`text-xs ${selectedSurat === opt.value ? 'font-black text-black' : 'font-bold text-black/70'}`}>{opt.label}</Text>
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
                        onPress={() => setTipePengajuan('1')}
                        className={`flex-1 p-2 border-2 border-black rounded-lg items-center ${tipePengajuan === '1' ? 'bg-white' : 'bg-black/5'}`}
                      >
                        <Text className="font-bold text-xs">Elektronik</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setTipePengajuan('2')}
                        className={`flex-1 p-2 border-2 border-black rounded-lg items-center ${tipePengajuan === '2' ? 'bg-white' : 'bg-black/5'}`}
                      >
                        <Text className="font-bold text-xs">Manual</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={submitPengajuan}
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

  // Tampilan Login
  return (
    <SafeAreaView className="flex-1 bg-[#f4f4f0]">
      <View className="px-6 pt-12 pb-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-12 h-12 bg-white border-2 border-black rounded-xl items-center justify-center border-b-[4px] border-r-[4px]"
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-6 justify-center">
        <View className="mb-8 items-center">
          <View className="w-20 h-20 bg-[#c1ff72] border-2 border-black rounded-2xl items-center justify-center border-b-[6px] border-r-[6px] mb-4">
            <Feather name="mail" size={40} color="black" />
          </View>
          <Text className="text-3xl font-black text-black uppercase tracking-widest text-center">E-Letter FST</Text>
          <Text className="text-sm font-bold text-black/60 mt-1 text-center">Silahkan login menggunakan akun AIS</Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="font-bold text-black mb-2 uppercase text-xs">Username / NIM</Text>
            <TextInput
              className="bg-white border-2 border-black rounded-xl px-4 py-3 font-bold text-black border-b-[4px] border-r-[4px]"
              placeholder="Masukkan Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!isSubmitting}
            />
          </View>

          <View>
            <Text className="font-bold text-black mb-2 uppercase text-xs">Password</Text>
            <View className="relative">
              <TextInput
                className="bg-white border-2 border-black rounded-xl pl-4 pr-12 py-3 font-bold text-black border-b-[4px] border-r-[4px]"
                placeholder="Masukkan Password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                className="absolute right-4 top-4"
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            className="rounded-xl border-2 border-black bg-[#ffde59] p-4 items-center border-b-[6px] border-r-[6px] mt-4"
            onPress={handleManualLogin}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="black" size="small" />
            ) : (
              <Text className="font-black text-black text-xl uppercase tracking-widest">Login</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
