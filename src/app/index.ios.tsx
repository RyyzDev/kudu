import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IOSHomeScreen() {
  return (
    // Menggunakan SafeAreaView untuk menghindari Notch / Dynamic Island iPhone
    <SafeAreaView className="flex-1 bg-gray-50 p-4">
      <Text className="text-xl font-semibold text-gray-900">Layar Utama iOS</Text>
    </SafeAreaView>
  );
}