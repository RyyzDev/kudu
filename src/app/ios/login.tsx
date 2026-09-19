import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { authenticateAcademicSystem } from '../../services/akademik/authService';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('nim').then(nim => {
      if (nim) setUsername(nim);
    });
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'NIM dan Password harus diisi');
      return;
    }
    setLoading(true);
    try {
      // authService mengembalikan "PHPSESSID=xxx" (format asli)
      const phpSessId = await authenticateAcademicSystem(username, password);
      await SecureStore.setItemAsync('nim', username);
      await SecureStore.setItemAsync('password', password);
      await SecureStore.setItemAsync('phpSessId', phpSessId);
      router.replace('/akademik' as any);
    } catch (error: any) {
      Alert.alert('Login Gagal', error.message || 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-[#f4f4f0] px-6">
      <View className="w-full max-w-sm rounded-xl border-2 border-b-[8px] border-r-[8px] border-black bg-white p-6">
        {/* Header */}
        <View className="mb-8 items-center border-b-2 border-black pb-4">
          <Text className="text-4xl font-black text-black tracking-widest uppercase">KUDU</Text>
          <Text className="text-xs font-bold text-black uppercase tracking-widest mt-1 bg-[#ffde59] px-2 py-1 border border-black">
            Portal Akademik
          </Text>
        </View>

        {/* NIM */}
        <View className="mb-5">
          <Text className="mb-2 text-sm font-black text-black uppercase tracking-wider">NIM / Username</Text>
          <TextInput
            className="rounded-lg border-2 border-black bg-[#ffde59] p-4 font-bold text-black border-b-[4px] border-r-[4px]"
            placeholder="Masukkan NIM"
            placeholderTextColor="#444"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <View className="mb-8">
          <Text className="mb-2 text-sm font-black text-black uppercase tracking-wider">Password</Text>
          <View className="relative justify-center">
            <TextInput
              className="rounded-lg border-2 border-black bg-[#ff914d] p-4 pr-14 font-bold text-black border-b-[4px] border-r-[4px]"
              placeholder="Masukkan Password"
              placeholderTextColor="#444"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              className="absolute right-4 p-2 bg-white border-2 border-black rounded-md border-b-[2px] border-r-[2px]"
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color="black" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tombol Login */}
        <TouchableOpacity
          className="rounded-xl border-2 border-black bg-[#c1ff72] p-4 items-center border-b-[6px] border-r-[6px]"
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="black" size="small" />
          ) : (
            <Text className="font-black text-black text-xl uppercase tracking-widest">Login SSO</Text>
          )}
        </TouchableOpacity>

        {/* Privacy Note */}
        <TouchableOpacity
          onPress={() => Linking.openURL('https://github.com/RyyzDev/kudu/blob/main/README.md')}
          activeOpacity={0.7}
          className="flex-row flex-wrap justify-center items-center gap-1 mt-2 px-4"
        >
          <Text className="text-xs text-black/40 font-bold text-center">
            Tidak perlu takut mengisi data, tinjau bagaimana data kamu diolah
          </Text>
          <Text className="text-xs font-black text-black/60 underline">di sini</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
