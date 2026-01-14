import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/currency";
import { TaskCard } from "@/components/TaskCard";

export default function Dashboard() {
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const loadData = async () => {
    if (!profile) return;

    try {
        // Load tasks
        const { data: taskData } = await supabase
        .from('task_instances')
        .select(`
            id,
            due_date,
            status,
            task:tasks (
            id,
            title,
            description,
            value_cents,
            attachment_required
            )
        `)
        .eq('daughter_id', profile.id)
        .order('due_date', { ascending: true })
        .limit(5);
        
        if (taskData) {
        setTasks(taskData);
        setPendingCount(taskData.filter(t => t.status === 'pending').length);
        }

        // Load balance (transactions)
        const { data: transactions } = await supabase
            .from('transactions')
            .select('amount_cents')
            .eq('daughter_id', profile.id);

        if (transactions) {
            const total = transactions.reduce((acc, curr) => acc + curr.amount_cents, 0);
            setBalance(total);
        }
    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [profile]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView 
        contentContainerClassName="p-4 gap-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-row justify-between items-center mb-2">
          <View>
            <Text className="text-gray-500">Olá,</Text>
            <Text className="text-2xl font-bold text-gray-900">{profile?.display_name || 'Usuário'}</Text>
          </View>
        </View>

        {/* Balance Card */}
        <View className="bg-blue-600 rounded-2xl p-6 shadow-sm">
          <Text className="text-blue-100 text-sm font-medium mb-1">Saldo Atual</Text>
          <Text className="text-white text-3xl font-bold">{formatBRL(balance)}</Text>
          <Text className="text-blue-200 text-xs mt-2">Próximo pagamento: 05/02</Text>
        </View>

        {/* Quick Stats */}
        <View className="flex-row gap-3">
          <View className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <Text className="text-gray-500 text-xs font-medium">Tarefas Pendentes</Text>
            <Text className="text-2xl font-bold text-gray-900 mt-1">{pendingCount}</Text>
          </View>
          <View className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <Text className="text-gray-500 text-xs font-medium">Ganhos do Mês</Text>
            <Text className="text-2xl font-bold text-green-600 mt-1">R$ --</Text>
          </View>
        </View>

        {/* Recent Tasks Section */}
        <View className="mt-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">Próximas Tarefas</Text>
          {tasks.length === 0 ? (
            <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <Text className="text-gray-500 text-center py-4">Nenhuma tarefa pendente</Text>
            </View>
          ) : (
            tasks.map(task => (
              <TaskCard key={task.id} taskInstance={task} />
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
