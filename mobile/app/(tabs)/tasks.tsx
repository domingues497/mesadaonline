import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TasksScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Minhas Tarefas</Text>
        <View className="bg-white p-4 rounded-xl border border-gray-100">
          <Text className="text-gray-500 text-center">Lista de tarefas em breve...</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
