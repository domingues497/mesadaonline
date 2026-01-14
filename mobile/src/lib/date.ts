import { format, parseISO, isToday, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(date: Date | string, pattern: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, pattern, { locale: ptBR });
}

export function isOverdue(dueDate: Date | string): boolean {
  const dateObj = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  // Consideramos vencido se a data for anterior a hoje (00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isBefore(dateObj, today);
}

export function isDueToday(dueDate: Date | string): boolean {
  const dateObj = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  return isToday(dateObj);
}

export function getDueDateBadge(dueDate: Date | string): {
  text: string;
  variant: 'default' | 'secondary' | 'destructive' | 'warning';
  color: string;
} {
  if (isOverdue(dueDate)) {
    return { text: 'Vencida', variant: 'destructive', color: '#ef4444' }; // red-500
  }
  
  if (isDueToday(dueDate)) {
    return { text: 'Vence hoje', variant: 'warning', color: '#f59e0b' }; // amber-500
  }
  
  return { text: formatDate(dueDate, 'dd/MM'), variant: 'default', color: '#6b7280' }; // gray-500
}
