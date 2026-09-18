import { View, Text } from 'react-native';

export default function WebHomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-100 p-8">
      {/* Di Web Anda bisa menggunakan layout dengan Max Width dan Sidebar */}
      <View className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-lg">
        <Text className="text-2xl font-bold text-slate-900">Dashboard Web</Text>
        <Text className="mt-2 text-slate-600">Tampilan ini khusus dioptimalkan untuk browser desktop.</Text>
      </View>
    </View>
  );
}