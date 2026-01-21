import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, Image, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { ArrowDownLeft, ArrowUpRight, Upload, Camera, X, Receipt } from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';

export default function StatementScreen() {
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Parent States
  const [daughters, setDaughters] = useState<any[]>([]);
  const [selectedDaughterId, setSelectedDaughterId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentProofUri, setPaymentProofUri] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      if (profile.role === 'parent') {
        // Load Daughters
        const { data: daughtersData } = await supabase
          .from('profiles')
          .select('id, display_name, role')
          .eq('family_id', profile.family_id)
          .eq('role', 'child');

        if (daughtersData) {
            setDaughters(daughtersData);
            // Select first daughter by default if none selected
            if (!selectedDaughterId && daughtersData.length > 0) {
                setSelectedDaughterId(daughtersData[0].id);
            }
        }

        // Load Transactions for Selected Daughter
        const targetId = selectedDaughterId || daughtersData?.[0]?.id;
        if (targetId) {
            const { data: txData, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('daughter_id', targetId)
                .order('created_at', { ascending: false });
            
            if (txData) {
                setTransactions(txData);
                const total = txData.reduce((acc, curr) => acc + curr.amount_cents, 0);
                setCurrentBalance(total);
                // Pre-fill payment amount with total balance if positive
                if (total > 0) {
                    setPaymentAmount((total / 100).toFixed(2));
                }
            }
        }

      } else {
        // Child Logic
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('daughter_id', profile.id)
            .order('created_at', { ascending: false });
        
        if (data) {
            setTransactions(data);
        }
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile, selectedDaughterId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [profile, selectedDaughterId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPaymentProofUri(result.assets[0].uri);
    }
  };

  const handlePayment = async () => {
    if (!paymentAmount || !selectedDaughterId || !profile) return;
    
    if (!paymentProofUri) {
        Alert.alert("Comprovante necessário", "Por favor, anexe o comprovante do pagamento.");
        return;
    }

    try {
        setSubmittingPayment(true);
        const amountCents = Math.round(parseFloat(paymentAmount.replace(',', '.')) * 100);

        // 1. Upload Proof
        const response = await fetch(paymentProofUri);
        const arrayBuffer = await response.arrayBuffer();
        const fileName = `${profile.id}/payment_${selectedDaughterId}_${Date.now()}.jpg`;

        const { error: uploadError, data } = await supabase.storage
          .from("task-proofs")
          .upload(fileName, arrayBuffer, {
            contentType: "image/jpeg",
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("task-proofs")
          .getPublicUrl(data.path);

        const proofUrl = publicUrlData.publicUrl;

        // 2. Create Transaction
        // Check if proof_url column exists by trying to insert. If it fails, we might need to fallback?
        // We assume migration 20250920000000_add_proof_to_transactions.sql ran.
        
        const { error: txError } = await supabase
            .from('transactions')
            .insert({
                daughter_id: selectedDaughterId,
                amount_cents: -amountCents, // Negative for payout
                kind: 'adjustment', // Using adjustment as generic payout
                memo: 'Pagamento de Recompensas',
                proof_url: proofUrl // This column must exist
            });

        if (txError) throw txError;

        Alert.alert("Sucesso", "Pagamento registrado com sucesso!");
        setShowPaymentModal(false);
        setPaymentProofUri(null);
        setPaymentAmount("");
        await loadData();

    } catch (error: any) {
        console.error("Error processing payment:", error);
        Alert.alert("Erro", error.message || "Erro ao registrar pagamento.");
    } finally {
        setSubmittingPayment(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView 
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-gray-900">Extrato</Text>
        </View>

        {profile?.role === 'parent' && (
            <View className="mb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                    {daughters.map(daughter => (
                        <TouchableOpacity
                            key={daughter.id}
                            onPress={() => setSelectedDaughterId(daughter.id)}
                            className={`mr-2 px-4 py-2 rounded-full border ${
                                selectedDaughterId === daughter.id 
                                ? 'bg-blue-600 border-blue-600' 
                                : 'bg-white border-gray-200'
                            }`}
                        >
                            <Text className={selectedDaughterId === daughter.id ? 'text-white font-medium' : 'text-gray-600'}>
                                {daughter.display_name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {currentBalance > 0 && (
                     <View className="bg-white p-4 rounded-xl border border-gray-100 mb-4 flex-row justify-between items-center">
                        <View>
                            <Text className="text-gray-500 text-xs font-medium uppercase">Saldo a Pagar</Text>
                            <Text className="text-2xl font-bold text-green-600">{formatBRL(currentBalance)}</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={() => setShowPaymentModal(true)}
                            className="bg-green-600 px-4 py-2 rounded-lg flex-row items-center gap-2"
                        >
                            <Text className="text-white font-semibold">Pagar</Text>
                        </TouchableOpacity>
                     </View>
                )}
            </View>
        )}
        
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" className="mt-8" />
        ) : transactions.length === 0 ? (
          <View className="bg-white p-8 rounded-xl border border-gray-100 items-center">
            <Text className="text-gray-500 text-center">Nenhuma movimentação encontrada.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {transactions.map((transaction) => {
              const isPositive = transaction.amount_cents > 0;
              return (
                <View 
                  key={transaction.id} 
                  className="bg-white p-4 rounded-xl border border-gray-100"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-3 flex-1">
                        <View className={`w-10 h-10 rounded-full items-center justify-center ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isPositive ? (
                            <ArrowDownLeft size={20} color="#16a34a" />
                        ) : (
                            <ArrowUpRight size={20} color="#dc2626" />
                        )}
                        </View>
                        <View className="flex-1">
                        <Text className="font-semibold text-gray-900">{transaction.memo || (isPositive ? 'Entrada' : 'Saída')}</Text>
                        <Text className="text-xs text-gray-500">{formatDate(transaction.created_at, "dd/MM/yyyy 'às' HH:mm")}</Text>
                        </View>
                    </View>
                    <Text className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{formatBRL(transaction.amount_cents)}
                    </Text>
                  </View>
                  
                  {/* Show Proof Link if exists */}
                  {transaction.proof_url && (
                    <View className="mt-2 pt-2 border-t border-gray-50 flex-row items-center">
                        <Receipt size={14} color="#6b7280" />
                        <Text className="text-xs text-gray-500 ml-1">Comprovante anexado</Text>
                        {/* In a real app we might want to preview this image on click */}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 justify-end bg-black/50"
        >
            <View className="bg-white rounded-t-3xl p-6">
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-xl font-bold text-gray-900">Registrar Pagamento</Text>
                    <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                        <X size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                <Text className="text-sm font-medium text-gray-700 mb-2">Valor do Pagamento</Text>
                <TextInput
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    keyboardType="numeric"
                    placeholder="0,00"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-xl font-bold text-gray-900 mb-6"
                />

                <Text className="text-sm font-medium text-gray-700 mb-2">Comprovante (Print)</Text>
                {paymentProofUri ? (
                    <View className="mb-6 relative">
                        <Image 
                            source={{ uri: paymentProofUri }} 
                            className="w-full h-40 rounded-xl bg-gray-100"
                            resizeMode="cover"
                        />
                        <TouchableOpacity 
                            onPress={() => setPaymentProofUri(null)}
                            className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"
                        >
                            <X size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity 
                        onPress={pickImage}
                        className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center mb-6"
                    >
                        <Upload size={24} color="#9ca3af" className="mb-2" />
                        <Text className="text-gray-400 font-medium">Toque para enviar print</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={handlePayment}
                    disabled={submittingPayment}
                    className={`w-full py-4 rounded-xl flex-row justify-center items-center ${
                        submittingPayment ? 'bg-green-400' : 'bg-green-600'
                    }`}
                >
                    {submittingPayment ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Confirmar Pagamento</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
