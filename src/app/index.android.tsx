import { View, Text, StatusBar } from 'react-native';

export default function AndroidHomeScreen() {
  return (
    <View className="flex-1 bg-white p-4">
      {/* Menyesuaikan StatusBar Android */}
      <StatusBar backgroundColor="#2563eb" barStyle="light-content" />
      <Text className="text-xl font-bold text-blue-600">Layar Utama Android</Text>
    </View>
  );
}