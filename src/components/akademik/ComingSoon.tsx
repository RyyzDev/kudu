import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  label: string;
}

export function ComingSoon({ label }: Props) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Feather name="clock" size={40} color="#999" />
      <Text className="font-black text-black/30 text-lg uppercase mt-4 tracking-widest">{label}</Text>
      <Text className="text-black/30 text-sm mt-1">Segera hadir</Text>
    </View>
  );
}
