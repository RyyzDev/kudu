import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function ELetterScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-[#f4f4f0] items-center justify-center">
      <View className="px-4 pt-4 pb-2 flex-row items-center gap-3 absolute top-0 left-0">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center gap-1.5 border-2 border-black bg-white px-3 py-2 rounded-lg border-b-[4px] border-r-[4px]"
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={16} color="black" />
          <Text className="font-black text-black uppercase text-xs">Kembali</Text>
        </TouchableOpacity>
      </View>
      <Feather name="mail" size={48} color="#999" />
      <Text className="font-black text-black/30 text-xl uppercase mt-4 tracking-widest">E-Letter</Text>
      <Text className="text-black/30 mt-1">Segera hadir</Text>
    </SafeAreaView>
  );
}
