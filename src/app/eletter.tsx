import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, SafeAreaView, Alert, Text, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { loginELetter, checkELetterSession } from '../services/eletter/eletterAuthService';
import { getELetterDashboard, getELetterFormAdd, ELetterSurat, ELetterDropdownOption } from '../services/eletter/eletterService';
import { eletterApi } from '../services/eletter/eletterApi';
import { ELETTER_URL } from '../services/eletter/eletterAuthService';
import { ELetterLoginForm } from '../components/eletter/ELetterLoginForm';
import { ELetterDashboard } from '../components/eletter/ELetterDashboard';

export default function ELetterScreen() {
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
  const [tipePengajuan, setTipePengajuan] = useState('1');

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
      console.log('[ELETTER] Auto login failed:', e.message);
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
      setCsrfToken(data.csrfToken);
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
      setCsrfToken(data.csrfToken);
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
      const payload = new URLSearchParams({ _token: csrfToken, id_surat: selectedSurat, tipe: tipePengajuan });
      await eletterApi.post('/pengajuansurat', payload.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: ELETTER_URL + '/persuratan/add' },
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
      <ELetterDashboard
        activeTab={activeTab}
        suratList={suratList}
        loadingDashboard={loadingDashboard}
        formOptions={formOptions}
        selectedSurat={selectedSurat}
        mahasiswaInfo={mahasiswaInfo}
        tipePengajuan={tipePengajuan}
        isSubmitting={isSubmitting}
        onSwitchTab={switchTab}
        onSelectSurat={setSelectedSurat}
        onSetTipe={setTipePengajuan}
        onSubmit={submitPengajuan}
      />
    );
  }

  return (
    <ELetterLoginForm
      username={username}
      password={password}
      isSubmitting={isSubmitting}
      showPassword={showPassword}
      onUsernameChange={setUsername}
      onPasswordChange={setPassword}
      onTogglePassword={() => setShowPassword(p => !p)}
      onSubmit={handleManualLogin}
    />
  );
}
