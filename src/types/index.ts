// Tipos principais da aplicação Tarefas & Mesada

export type UserRole = 'parent' | 'child';

export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export type TaskStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'overdue';

export type TransactionKind = 'allowance' | 'task_approved' | 'task_missed' | 'adjustment';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Family {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  family_id: string;
  role: UserRole;
  display_name: string;
  phone?: string;
  created_at: string;
}

export interface Daughter {
  id: string;
  monthly_allowance_cents: number;
  rewards_enabled: boolean;
  profile?: Profile;
}

export interface Task {
  id: string;
  family_id: string;
  title: string;
  description?: string;
  value_cents: number;
  recurrence: TaskRecurrence;
  attachment_required: boolean;
  active: boolean;
}

export interface TaskInstance {
  id: string;
  task_id: string;
  daughter_id: string;
  due_date: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  task?: Task;
  submissions?: Submission[];
}

export interface Submission {
  id: string;
  task_instance_id: string;
  submitted_by: string;
  proof_url?: string;
  note?: string;
  created_at: string;
  status: SubmissionStatus;
}

export interface Transaction {
  id: string;
  daughter_id: string;
  amount_cents: number;
  kind: TransactionKind;
  memo?: string;
  created_at: string;
}

export interface Settings {
  id: string;
  family_id: string;
  weekly_close_weekday: number;
  penalty_on_miss: boolean;
  reminder_whatsapp: boolean;
}

// Tipos utilitários para UI
export interface DashboardKPIs {
  total_balance_cents: number;
  pending_tasks_today: number;
  pending_tasks_week: number;
  pending_approvals: number;
  overdue_tasks: number;
}

export interface MonthlyStats {
  earned_cents: number;
  spent_cents: number;
  tasks_completed: number;
  completion_rate: number;
}