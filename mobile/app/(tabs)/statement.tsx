import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StatementScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Extrato</Text>
        <View className="bg-white p-4 rounded-xl border border-gray-100">
          <Text className="text-gray-500 text-center">Histórico financeiro em breve...</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
