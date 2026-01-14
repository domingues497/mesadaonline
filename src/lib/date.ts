// Utilitários de data/hora para timezone America/Sao_Paulo
import { format, parseISO, startOfWeek, endOfWeek, addDays, isAfter, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Timezone padrão do Brasil
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Formatar data em português brasileiro
 */
export function formatDate(date: Date | string, pattern: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, pattern, { locale: ptBR });
}

/**
 * Formatar data e hora
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Formato relativo amigável
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  
  if (isToday(dateObj)) {
    return 'Hoje';
  }
  
  const tomorrow = addDays(now, 1);
  if (formatDate(dateObj) === formatDate(tomorrow)) {
    return 'Amanhã';
  }
  
  const yesterday = addDays(now, -1);
  if (formatDate(dateObj) === formatDate(yesterday)) {
    return 'Ontem';
  }
  
  return formatDate(dateObj);
}

/**
 * Início da semana (domingo no Brasil)
 */
export function getStartOfWeekBR(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 0 }); // Domingo = 0
}

/**
 * Fim da semana
 */
export function getEndOfWeekBR(date: Date = new Date()): Date {
  return endOfWeek(date, { weekStartsOn: 0 });
}

/**
 * Verificar se uma data está vencida
 */
export function isOverdue(dueDate: Date | string): boolean {
  const dateObj = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  const now = new Date();
  return isBefore(dateObj, now) && !isToday(dateObj);
}

/**
 * Verificar se uma tarefa vence hoje
 */
export function isDueToday(dueDate: Date | string): boolean {
  const dateObj = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  return isToday(dateObj);
}

/**
 * Verificar se uma tarefa vence amanhã
 */
export function isDueTomorrow(dueDate: Date | string): boolean {
  const dateObj = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  const tomorrow = addDays(new Date(), 1);
  return formatDate(dateObj) === formatDate(tomorrow);
}

/**
 * Obter badge de status da data de vencimento
 */
export function getDueDateBadge(dueDate: Date | string): {
  text: string;
  variant: 'default' | 'secondary' | 'destructive' | 'warning';
} {
  if (isOverdue(dueDate)) {
    return { text: 'Vencida', variant: 'destructive' };
  }
  
  if (isDueToday(dueDate)) {
    return { text: 'Vence hoje', variant: 'warning' };
  }
  
  if (isDueTomorrow(dueDate)) {
    return { text: 'Vence amanhã', variant: 'warning' };
  }
  
  return { text: formatRelativeDate(dueDate), variant: 'secondary' };
}