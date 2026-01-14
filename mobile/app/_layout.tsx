import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "@/hooks/use-auth";

export default function Layout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Início" }} />
        <Stack.Screen name="auth" options={{ title: "Autenticação", headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
