import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { ArrowLeft, LogIn, UserPlus, Users } from "lucide-react-native";

type AuthMode = "selection" | "signin" | "signup_parent" | "signup_child";

export default function Index() {
  const { signIn, signUp } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<AuthMode>("selection");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const isParentSignup = mode === "signup_parent";
  const isChildSignup = mode === "signup_child";

  const handleOpenScanner = async () => {
    try {
      if (!permission?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert(
            "Permissão necessária",
            "Precisamos da câmera para ler o QRCode do convite."
          );
          return;
        }
      }
      setIsScanning(true);
    } catch (error: any) {
      Alert.alert(
        "Erro ao abrir câmera",
        error?.message || "Não foi possível acessar a câmera."
      );
    }
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    setIsScanning(false);

    if (!data) return;

    let token = String(data).trim();

    const marker = "/convite/";
    const index = token.lastIndexOf(marker);

    if (index !== -1) {
      token = token.slice(index + marker.length);
      const stopChars = ["?", "#", " "];
      let end = token.length;

      stopChars.forEach((ch) => {
        const i = token.indexOf(ch);
        if (i !== -1 && i < end) {
          end = i;
        }
      });

      token = token.slice(0, end);
    }

    setFamilyCode(token);
  };

  const handleSubmit = async () => {
    try {
      if (!email || !password) {
        Alert.alert("Dados incompletos", "Preencha email e senha.");
        return;
      }

      if (isParentSignup && (!name || !familyName)) {
        Alert.alert("Dados incompletos", "Preencha seu nome e o nome da família.");
        return;
      }

      if (isChildSignup && !familyCode) {
        Alert.alert("Dados incompletos", "Informe o código da família.");
        return;
      }

      setIsLoading(true);

      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (!error) {
            // Success is handled by _layout redirect
        }
        return;
      }

      if (mode === "signup_parent") {
        const { error } = await signUp(
            email, 
            password, 
            name.trim(), 
            "parent", 
            familyName.trim()
        );

        if (!error) {
            Alert.alert(
                "Família criada",
                "Sua conta e família foram configuradas com sucesso."
            );
        }
        return;
      }

      // Child signup flow (kept as is for now, or could be moved to useAuth later)
      const { data: invite, error: inviteError } = await supabase
        .from("invites")
        .select("*")
        .eq("token", familyCode.trim())
        .maybeSingle();

      if (inviteError || !invite) {
        Alert.alert(
          "Convite inválido",
          "Não encontramos esse código de família."
        );
        return;
      }

      if (invite.used_at) {
        Alert.alert(
          "Convite já usado",
          "Peça um novo convite ao seu responsável."
        );
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: invite.display_name,
            role: invite.role,
            family_id: invite.family_id,
          },
        },
      });

      if (authError) {
        Alert.alert("Erro no cadastro", authError.message);
        return;
      }

      if (!authData.user) {
        Alert.alert("Cadastro incompleto", "Não foi possível criar o usuário.");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        family_id: invite.family_id,
        role: invite.role,
        display_name: invite.display_name,
      });

      if (profileError) {
        Alert.alert(
          "Erro ao criar perfil",
          profileError.message || "Tente novamente em instantes."
        );
        return;
      }

      if (invite.role === "child") {
        const { error: daughterError } = await supabase.from("daughters").insert({
          id: authData.user.id,
          monthly_allowance_cents: 0,
          rewards_enabled: true,
        });

        if (daughterError) {
          Alert.alert(
            "Erro ao vincular filha(o)",
            daughterError.message || "Tente novamente em instantes."
          );
          return;
        }
      }

      const { error: updateError } = await supabase.rpc("mark_invite_used", {
        invite_id: invite.id,
      });

      if (updateError) {
        Alert.alert(
          "Erro ao atualizar convite",
          updateError.message || "Tente novamente em instantes."
        );
        return;
      }

      Alert.alert(
        "Conta criada",
        "Sua conta foi criada e associada à família."
      );
    } catch (error: any) {
      Alert.alert(
        "Erro inesperado",
        error?.message || "Ocorreu um erro. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
        backgroundColor: "#f9fafb",
      }}
    >
      <View style={{ width: "100%", maxWidth: 420 }}>
        {isScanning && (
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.9)",
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 24,
              zIndex: 20,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Aponte a câmera para o QRCode do convite
            </Text>
            <View
              style={{
                width: 260,
                height: 260,
                borderRadius: 24,
                overflow: "hidden",
                backgroundColor: "#000",
                borderWidth: 2,
                borderColor: "#22c55e",
              }}
            >
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
              />
            </View>
            <TouchableOpacity
              onPress={() => setIsScanning(false)}
              style={{
                marginTop: 24,
                paddingHorizontal: 24,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: "#f97316",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mode !== "selection" && (
          <TouchableOpacity
            onPress={() => setMode("selection")}
            style={{
              marginBottom: 20,
              alignSelf: "flex-start",
            }}
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
        )}

        <Text
          style={{
            fontSize: 32,
            fontWeight: "700",
            color: "#2563eb",
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          Mesada Online
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#6b7280",
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Organize a mesada em família de forma simples e visual
        </Text>

        {mode === "selection" ? (
          <View style={{ gap: 16 }}>
            <TouchableOpacity
              onPress={() => setMode("signin")}
              style={{
                backgroundColor: "#fff",
                padding: 20,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#e5e7eb",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <View style={{ padding: 10, backgroundColor: "#eff6ff", borderRadius: 12, marginRight: 16 }}>
                <LogIn size={24} color="#2563eb" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>Já tenho conta</Text>
                <Text style={{ fontSize: 13, color: "#6b7280" }}>Entrar com email e senha</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("signup_parent")}
              style={{
                backgroundColor: "#fff",
                padding: 20,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#e5e7eb",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <View style={{ padding: 10, backgroundColor: "#f0fdf4", borderRadius: 12, marginRight: 16 }}>
                <Users size={24} color="#16a34a" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>Criar nova família</Text>
                <Text style={{ fontSize: 13, color: "#6b7280" }}>Para pais e responsáveis</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("signup_child")}
              style={{
                backgroundColor: "#fff",
                padding: 20,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#e5e7eb",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <View style={{ padding: 10, backgroundColor: "#fdf2f8", borderRadius: 12, marginRight: 16 }}>
                <UserPlus size={24} color="#db2777" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>Entrar com convite</Text>
                <Text style={{ fontSize: 13, color: "#6b7280" }}>Para filhos e dependentes</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", textAlign: "center", marginBottom: 20 }}>
                {mode === "signin" ? "Acesse sua conta" : mode === "signup_parent" ? "Criar conta de responsável" : "Entrar com código da família"}
              </Text>
            </View>

            {isParentSignup && (
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Seu nome
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Ana, Paulo..."
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: Platform.OS === "ios" ? 12 : 8,
                    backgroundColor: "#fff",
                    fontSize: 15,
                  }}
                />
              </View>
            )}

            {isParentSignup && (
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Nome da família
                </Text>
                <TextInput
                  value={familyName}
                  onChangeText={setFamilyName}
                  placeholder="Ex: Família Silva"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: Platform.OS === "ios" ? 12 : 8,
                    backgroundColor: "#fff",
                    fontSize: 15,
                  }}
                />
              </View>
            )}

            {isChildSignup && (
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  Código da família
                </Text>
                <TextInput
                  value={familyCode}
                  onChangeText={setFamilyCode}
                  placeholder="Informe o código que seu responsável enviou"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: Platform.OS === "ios" ? 12 : 8,
                    backgroundColor: "#fff",
                    fontSize: 15,
                  }}
                />
                <TouchableOpacity
                  onPress={handleOpenScanner}
                  style={{ marginTop: 8, alignSelf: "flex-start" }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#2563eb",
                    }}
                  >
                    Ler QRCode do convite
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: 4,
                }}
              >
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="voce@email.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: Platform.OS === "ios" ? 12 : 8,
                  backgroundColor: "#fff",
                  fontSize: 15,
                }}
              />
            </View>

            <View style={{ marginBottom: 18 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: 4,
                }}
              >
                Senha
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: Platform.OS === "ios" ? 12 : 8,
                  backgroundColor: "#fff",
                  fontSize: 15,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              style={{
                backgroundColor: "#2563eb",
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: "center",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  {mode === "signin"
                    ? "Entrar"
                    : isParentSignup
                    ? "Criar família"
                    : "Entrar na família"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <Text
          style={{
            marginTop: 16,
            fontSize: 12,
            textAlign: "center",
            color: "#9ca3af",
          }}
        >
          Esta tela é a base da identidade e relacionamento familiar.
        </Text>
      </View>
    </View>
  );
}
