import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const { signOut, profile } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-6">Perfil</Text>
        
        <View className="bg-white p-4 rounded-xl border border-gray-100 mb-6">
          <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4 mx-auto">
            <Text className="text-2xl font-bold text-blue-600">
              {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text className="text-xl font-bold text-center text-gray-900">{profile?.display_name}</Text>
          <Text className="text-sm text-gray-500 text-center capitalize">{profile?.role === 'parent' ? 'Responsável' : 'Filho(a)'}</Text>
        </View>

        <TouchableOpacity 
          className="bg-red-50 p-4 rounded-xl border border-red-100"
          onPress={handleSignOut}
        >
          <Text className="text-red-600 text-center font-bold">Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
