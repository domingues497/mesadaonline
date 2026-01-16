import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react-native";

export default function StatementScreen() {
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  const loadTransactions = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('daughter_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error loading transactions:", error);
        return;
      }

      if (data) {
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [profile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [profile]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView 
        contentContainerClassName="p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text className="text-2xl font-bold text-gray-900 mb-4">Extrato</Text>
        
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
                  className="bg-white p-4 rounded-xl border border-gray-100 flex-row items-center justify-between"
                >
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
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
