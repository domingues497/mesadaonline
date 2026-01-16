import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import * as Crypto from "expo-crypto";
import QRCode from "react-native-qrcode-svg";

type Invite = {
  id: string;
  token: string;
  family_id: string;
  role: "parent" | "child";
  display_name: string;
  email: string;
  expires_at: string;
  used_at: string | null;
};

type FamilyMember = {
  id: string;
  display_name: string;
  role: "parent" | "child";
  phone: string | null;
};

export default function ProfileScreen() {
  const { signOut, profile, loading, user, createFamily } = useAuth();
  const router = useRouter();
  
  const [familyName, setFamilyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"parent" | "child">("child");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [lastInviteCode, setLastInviteCode] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setPhone(profile.phone || "");
    } else if (user?.user_metadata?.display_name) {
      setDisplayName(user.user_metadata.display_name);
    }
  }, [user, profile]);

  const loadInvites = async () => {
    if (!profile?.family_id) return;

    try {
      setLoadingInvites(true);
      const { data, error } = await supabase
        .from("invites")
        .select("*")
        .eq("family_id", profile.family_id)
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert(
          "Erro ao carregar convites",
          error.message || "Tente novamente em instantes."
        );
        return;
      }

      const now = new Date();
      const pending = ((data || []) as Invite[]).filter(
        (invite) =>
          !invite.used_at && new Date(invite.expires_at) > now
      );

      setInvites(pending);
    } catch (err: any) {
      Alert.alert(
        "Erro inesperado",
        err?.message || "Não foi possível carregar os convites."
      );
    } finally {
      setLoadingInvites(false);
    }
  };

  const loadMembers = async () => {
    if (!profile?.family_id) return;

    try {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role, phone")
        .eq("family_id", profile.family_id)
        .neq("id", profile.id) // Exclude current user
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading members:", error);
        return;
      }

      setMembers((data || []) as FamilyMember[]);
    } catch (err: any) {
      console.error("Error loading members:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (profile?.role === "parent" && profile.family_id) {
      loadInvites();
      loadMembers();
    }
  }, [profile?.role, profile?.family_id]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  const handleCompleteSetup = async () => {
    if (!familyName.trim() || !displayName.trim()) {
        Alert.alert("Campos obrigatórios", "Por favor, preencha todos os campos.");
        return;
    }

    setSaving(true);
    const { error } = await createFamily(familyName, displayName, phone || undefined);
    setSaving(false);

    if (error) {
        Alert.alert("Erro", error);
    } else {
        Alert.alert("Sucesso", "Perfil criado com sucesso!");
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;

    if (!displayName.trim()) {
      Alert.alert("Nome obrigatório", "Informe o nome do responsável.");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", profile.id);

      if (error) {
        Alert.alert("Erro ao atualizar perfil", error.message);
        return;
      }

      Alert.alert("Perfil atualizado", "Seus dados foram salvos com sucesso.");
    } catch (err: any) {
      Alert.alert(
        "Erro inesperado",
        err?.message || "Não foi possível atualizar o perfil."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!profile?.family_id) {
      Alert.alert("Erro", "Família não encontrada.");
      return;
    }

    if (!inviteName.trim()) {
      Alert.alert("Dados incompletos", "Informe o nome da pessoa.");
      return;
    }

    if (inviteRole === "parent" && !inviteEmail.trim()) {
      Alert.alert("Dados incompletos", "Informe o e-mail do novo responsável.");
      return;
    }

    try {
      setCreatingInvite(true);
      const token = Crypto.randomUUID();

      const { error } = await supabase.from("invites").insert({
        token,
        family_id: profile.family_id,
        role: inviteRole,
        display_name: inviteName.trim(),
        email: inviteEmail.trim() || `${token}@placeholder.local`,
      });

      if (error) {
        Alert.alert(
          "Erro ao criar convite",
          error.message || "Tente novamente em instantes."
        );
        return;
      }

      setLastInviteCode(token);
      setInviteName("");
      setInviteEmail("");

      loadInvites();

      Alert.alert(
        "Convite criado",
        inviteRole === "child"
          ? "Convite criado com sucesso. Use o código na tela inicial do app."
          : "Convite criado com sucesso. Envie o código ou e-mail para o novo responsável."
      );
    } catch (err: any) {
      Alert.alert(
        "Erro inesperado",
        err?.message || "Não foi possível criar o convite."
      );
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    try {
      setDeletingInviteId(id);

      const { error } = await supabase
        .from("invites")
        .delete()
        .eq("id", id);

      if (error) {
        Alert.alert(
          "Erro ao excluir convite",
          error.message || "Tente novamente em instantes."
        );
        return;
      }

      setInvites((current) => current.filter((invite) => invite.id !== id));
    } catch (err: any) {
      Alert.alert(
        "Erro inesperado",
        err?.message || "Não foi possível excluir o convite."
      );
    } finally {
      setDeletingInviteId(null);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      "Remover membro",
      `Tem certeza que deseja remover ${memberName} da família? Essa ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingMemberId(memberId);
              
              // Only delete from profiles, assuming cascading or soft delete logic isn't strictly required by RLS yet
              // Ideally, we should check if there are related records, but profiles usually cascade to daughters
              const { error } = await supabase
                .from("profiles")
                .delete()
                .eq("id", memberId);

              if (error) {
                Alert.alert("Erro", "Não foi possível remover o membro. Verifique suas permissões.");
                return;
              }

              setMembers(current => current.filter(m => m.id !== memberId));
              Alert.alert("Sucesso", "Membro removido da família.");
            } catch (err: any) {
              Alert.alert("Erro", err?.message || "Erro ao remover membro.");
            } finally {
              setDeletingMemberId(null);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-6">Perfil</Text>
        
        {!profile ? (
            <View className="bg-white p-6 rounded-xl border border-red-100 mb-6">
                <Text className="text-lg font-bold text-red-600 mb-2">Perfil incompleto</Text>
                <Text className="text-gray-600 mb-4">
                    Parece que houve um problema ao criar seu perfil. Por favor, complete as informações abaixo para continuar.
                </Text>

                <Text className="text-sm font-medium text-gray-700 mb-1">Seu Nome</Text>
                <TextInput 
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Seu nome"
                    className="border border-gray-200 rounded-lg px-3 py-2 mb-3"
                />

                <Text className="text-sm font-medium text-gray-700 mb-1">Telefone (opcional)</Text>
                <TextInput 
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="DDD + número"
                    keyboardType="phone-pad"
                    className="border border-gray-200 rounded-lg px-3 py-2 mb-3"
                />

                <Text className="text-sm font-medium text-gray-700 mb-1">Nome da Família</Text>
                <TextInput 
                    value={familyName}
                    onChangeText={setFamilyName}
                    placeholder="Ex: Família Silva"
                    className="border border-gray-200 rounded-lg px-3 py-2 mb-4"
                />

                <TouchableOpacity 
                    className={`bg-blue-600 p-3 rounded-lg mb-4 items-center ${saving ? 'opacity-70' : ''}`}
                    onPress={handleCompleteSetup}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold">Salvar e Continuar</Text>
                    )}
                </TouchableOpacity>
            </View>
        ) : (
            <>
              <View className="bg-white p-4 rounded-xl border border-gray-100 mb-6">
                <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4 mx-auto">
                  <Text className="text-2xl font-bold text-blue-600">
                    {profile.display_name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <Text className="text-xl font-bold text-center text-gray-900">{profile.display_name}</Text>
                <Text className="text-sm text-gray-500 text-center capitalize">
                  {profile.role === 'parent' ? 'Responsável' : 'Filho(a)'}
                </Text>
              </View>

              {profile.role === "parent" && (
                <View className="bg-white p-4 rounded-xl border border-gray-100 mb-6">
                  <Text className="text-lg font-bold text-gray-900 mb-2">Seus dados</Text>
                  <Text className="text-gray-500 text-xs mb-4">
                    Ajuste seus dados antes de convidar outros responsáveis e filhos.
                  </Text>

                  <Text className="text-sm font-medium text-gray-700 mb-1">Seu nome</Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Seu nome"
                    className="border border-gray-200 rounded-lg px-3 py-2 mb-3"
                  />

                  <Text className="text-sm font-medium text-gray-700 mb-1">Telefone (opcional)</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="DDD + número"
                    keyboardType="phone-pad"
                    className="border border-gray-200 rounded-lg px-3 py-2 mb-4"
                  />

                  <TouchableOpacity
                    className={`bg-blue-600 p-3 rounded-lg items-center ${saving ? "opacity-70" : ""}`}
                    onPress={handleUpdateProfile}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold">Salvar alterações</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {profile.role === "parent" && (
                <View className="bg-white p-4 rounded-xl border border-gray-100 mb-6">
                  <Text className="text-lg font-bold text-gray-900 mb-2">Convidar pessoas para a família</Text>
                  <Text className="text-gray-500 text-xs mb-4">
                    Crie convites para novos responsáveis ou filhos. Eles usarão o código na tela inicial do app.
                  </Text>

                  <View className="flex-row mb-3 rounded-full bg-gray-100 p-1">
                    <TouchableOpacity
                      className={`flex-1 py-1 rounded-full ${inviteRole === "child" ? "bg-white" : ""}`}
                      onPress={() => setInviteRole("child")}
                    >
                      <Text className="text-center text-xs font-medium">
                        Filho(a)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`flex-1 py-1 rounded-full ${inviteRole === "parent" ? "bg-white" : ""}`}
                      onPress={() => setInviteRole("parent")}
                    >
                      <Text className="text-center text-xs font-medium">
                        Responsável
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Nome do convidado
                  </Text>
                  <TextInput
                    value={inviteName}
                    onChangeText={setInviteName}
                    placeholder={inviteRole === "child" ? "Nome do filho(a)" : "Nome do responsável"}
                    className="border border-gray-200 rounded-lg px-3 py-2 mb-3"
                  />

                  {inviteRole === "parent" && (
                    <>
                      <Text className="text-sm font-medium text-gray-700 mb-1">
                        E-mail do responsável
                      </Text>
                      <TextInput
                        value={inviteEmail}
                        onChangeText={setInviteEmail}
                        placeholder="email@exemplo.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        className="border border-gray-200 rounded-lg px-3 py-2 mb-3"
                      />
                    </>
                  )}

                  <TouchableOpacity
                    className={`bg-green-600 p-3 rounded-lg items-center ${creatingInvite ? "opacity-70" : ""}`}
                    onPress={handleCreateInvite}
                    disabled={creatingInvite}
                  >
                    {creatingInvite ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold">
                        {inviteRole === "child" ? "Criar convite para filho(a)" : "Criar convite para responsável"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {lastInviteCode && (
                    <View className="mt-4 p-3 rounded-lg bg-gray-50 border border-dashed border-gray-300">
                      <Text className="text-xs text-gray-500 mb-1">
                        Código do último convite criado:
                      </Text>
                      <Text className="text-base font-mono text-gray-900 text-center">
                        {lastInviteCode}
                      </Text>
                      <View className="mt-3 items-center">
                        <QRCode value={lastInviteCode} size={96} />
                      </View>
                    </View>
                  )}

                  <View className="mt-6 border-t border-gray-100 pt-4">
                    <Text className="text-sm font-semibold text-gray-900 mb-2">
                      Convites pendentes
                    </Text>
                    {loadingInvites ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : invites.length === 0 ? (
                      <Text className="text-xs text-gray-500">
                        Nenhum convite pendente no momento. Novos convites ficam aqui até serem usados ou excluídos.
                      </Text>
                    ) : (
                      invites.map((invite) => (
                        <View
                          key={invite.id}
                          className="flex-row items-center justify-between mb-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
                        >
                          <View className="flex-1 mr-3">
                            <Text className="text-sm font-semibold text-gray-900">
                              {invite.display_name}
                            </Text>
                            <Text className="text-xs text-gray-500 mb-1 capitalize">
                              {invite.role === "child" ? "Filho(a)" : "Responsável"}
                            </Text>
                            <Text className="text-xs font-mono text-gray-800">
                              {invite.token}
                            </Text>
                          </View>
                          <View className="items-center">
                            <View className="mb-2">
                              <QRCode value={invite.token} size={72} />
                            </View>
                            <TouchableOpacity
                              onPress={() => handleDeleteInvite(invite.id)}
                              disabled={deletingInviteId === invite.id}
                              className="px-3 py-1 rounded-full bg-red-50"
                            >
                              <Text className="text-xs font-semibold text-red-600">
                                {deletingInviteId === invite.id ? "Removendo..." : "Excluir"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                    <Text className="text-[10px] text-gray-400 mt-1">
                      Convites expiram automaticamente após alguns dias.
                    </Text>
                  </View>
                </View>
              )}

              {profile.role === "parent" && (
                <View className="bg-white p-4 rounded-xl border border-gray-100 mb-6">
                  <Text className="text-lg font-bold text-gray-900 mb-2">Membros da Família</Text>
                  <Text className="text-gray-500 text-xs mb-4">
                    Gerencie os membros da sua família. Ao remover um membro, o acesso dele será revogado permanentemente.
                  </Text>
                  
                  {loadingMembers ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : members.length === 0 ? (
                    <Text className="text-xs text-gray-500">
                      Nenhum outro membro na família. Convide alguém!
                    </Text>
                  ) : (
                    members.map((member) => (
                      <View key={member.id} className="flex-row items-center justify-between mb-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <View className="flex-1 mr-3">
                            <Text className="text-sm font-semibold text-gray-900">
                                {member.display_name}
                            </Text>
                            <Text className="text-xs text-gray-500 capitalize">
                                {member.role === 'parent' ? 'Responsável' : 'Filho(a)'}
                            </Text>
                            {member.phone && (
                                <Text className="text-xs text-gray-400">
                                    {member.phone}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={() => handleDeleteMember(member.id, member.display_name)}
                            disabled={deletingMemberId === member.id}
                            className="px-3 py-1 rounded-full bg-red-50"
                        >
                            <Text className="text-xs font-semibold text-red-600">
                                {deletingMemberId === member.id ? "Removendo..." : "Excluir"}
                            </Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}
            </>
        )}

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
