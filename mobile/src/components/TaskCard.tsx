import { View, Text, TouchableOpacity } from 'react-native';
import { formatBRL } from '@/lib/currency';
import { getDueDateBadge } from '@/lib/date';
import { CheckCircle2, Circle, Clock } from 'lucide-react-native';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  taskInstance: any;
  onPress?: () => void;
}

export function TaskCard({ taskInstance, onPress }: TaskCardProps) {
  const { task, due_date, status } = taskInstance;
  const badge = getDueDateBadge(due_date);
  
  const isCompleted = status === 'approved';
  const isPendingApproval = status === 'submitted';
  const isRejected = status === 'rejected';
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-3"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-4">
          <Text className="text-gray-900 font-semibold text-base mb-1">{task.title}</Text>
          {task.description ? (
            <Text className="text-gray-500 text-sm mb-2" numberOfLines={2}>{task.description}</Text>
          ) : null}
          
          <View className="flex-row items-center gap-2">
            <View className={cn("px-2 py-0.5 rounded text-xs flex-row items-center gap-1", 
              badge.variant === 'destructive' && "bg-red-100",
              badge.variant === 'warning' && "bg-amber-100",
              badge.variant === 'default' && "bg-gray-100"
            )}>
              <Clock size={12} color={badge.color} />
              <Text style={{ color: badge.color, fontSize: 12, fontWeight: '500' }}>{badge.text}</Text>
            </View>
            
            {status === 'pending' && (
              <View className="px-2 py-0.5 rounded bg-gray-100">
                <Text className="text-gray-500 text-xs font-medium">Pendente</Text>
              </View>
            )}
             {status === 'submitted' && (
              <View className="px-2 py-0.5 rounded bg-blue-100">
                <Text className="text-blue-600 text-xs font-medium">Aguardando</Text>
              </View>
            )}
             {status === 'rejected' && (
              <View className="px-2 py-0.5 rounded bg-red-100">
                <Text className="text-red-600 text-xs font-medium">Rejeitada</Text>
              </View>
            )}
          </View>
        </View>

        <View className="items-end">
          <Text className="text-green-600 font-bold text-base">{formatBRL(task.value_cents)}</Text>
          <View className="mt-2">
            {isCompleted ? (
              <CheckCircle2 size={24} color="#22c55e" />
            ) : isPendingApproval ? (
              <Clock size={24} color="#3b82f6" />
            ) : isRejected ? (
               <CheckCircle2 size={24} color="#ef4444" />
            ) : (
              <Circle size={24} color="#d1d5db" />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
