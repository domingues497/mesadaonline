import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'expo-router';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (!error) {
      router.replace('/');
    }
  };

  return (
    <View className="flex-1 justify-center p-8 bg-gray-50">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-blue-600 text-center mb-2">Mesada Online</Text>
        <Text className="text-gray-500 text-center">Entre para gerenciar tarefas e mesadas</Text>
      </View>

      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
          <TextInput
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Senha</Text>
          <TextInput
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3"
            placeholder="********"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          className={`w-full bg-blue-600 rounded-lg py-3 mt-4 ${isLoading ? 'opacity-70' : ''}`}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
