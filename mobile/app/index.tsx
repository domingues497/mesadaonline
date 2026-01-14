import { View, Text } from "react-native";
import { Link } from "expo-router";

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-4">
      <Text className="text-2xl font-bold text-blue-500 mb-4 text-center">
        Mesada Online
      </Text>
      <Text className="text-gray-600 mb-8 text-center">
        Versão Mobile Nativa
      </Text>
      
      <Link href="/auth" asChild>
        <View className="bg-blue-600 px-6 py-3 rounded-xl active:bg-blue-700">
          <Text className="text-white font-bold text-lg">Entrar</Text>
        </View>
      </Link>
    </View>
  );
}
