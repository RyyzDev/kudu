import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, TextInput, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

interface Props {
  username: string;
  password: string;
  isSubmitting: boolean;
  showPassword: boolean;
  onUsernameChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
}

export function ELetterLoginForm({
  username,
  password,
  isSubmitting,
  showPassword,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
}: Props) {
  const router = useRouter();

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
          <Text className="text-sm font-bold text-black/60 mt-1 text-center">
            Silahkan login menggunakan akun E-Letter anda
          </Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="font-bold text-black mb-2 uppercase text-xs">NIM</Text>
            <TextInput
              className="bg-white border-2 border-black rounded-xl px-4 py-3 font-bold text-black border-b-[4px] border-r-[4px]"
              placeholder="Masukkan Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={onUsernameChange}
              autoCapitalize="none"
              editable={!isSubmitting}
            />
          </View>

          <View>
            <Text className="font-bold text-black mb-2 uppercase text-xs">Password (biasanya NIK)</Text>
            <View className="relative">
              <TextInput
                className="bg-white border-2 border-black rounded-xl pl-4 pr-12 py-3 font-bold text-black border-b-[4px] border-r-[4px]"
                placeholder="Masukkan Password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={onPasswordChange}
                editable={!isSubmitting}
              />
              <TouchableOpacity className="absolute right-4 top-4" onPress={onTogglePassword}>
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            className="rounded-xl border-2 border-black bg-[#ffde59] p-4 items-center border-b-[6px] border-r-[6px] mt-4"
            onPress={onSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="black" size="small" />
            ) : (
              <Text className="font-black text-black text-xl uppercase tracking-widest">Login</Text>
            )}
          </TouchableOpacity>

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
    </SafeAreaView>
  );
}
