// Configuração do Supabase Client
// Esta configuração será usada quando o backend estiver conectado

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Placeholder para configuração futura do Supabase
export const getSupabaseConfig = (): SupabaseConfig | null => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    console.warn('Supabase não configurado. Conecte seu projeto ao Supabase para habilitar funcionalidades backend.');
    return null;
  }
  
  return { url, anonKey };
};

// Mock para desenvolvimento sem Supabase
export const mockUser = {
  id: 'demo-user-id',
  role: 'child' as const,
  family_id: 'demo-family-id',
  display_name: 'Maria Santos',
  email: 'maria@exemplo.com'
};

export const mockTasks = [
  {
    id: '1',
    title: 'Arrumar a cama',
    description: 'Deixar o quarto organizado toda manhã',
    value_cents: 500,
    due_date: new Date().toISOString(),
    status: 'pending' as const
  },
  {
    id: '2', 
    title: 'Lavar a louça',
    description: 'Ajudar nas tarefas da cozinha',
    value_cents: 800,
    due_date: new Date(Date.now() + 86400000).toISOString(),
    status: 'submitted' as const
  }
];

export const mockBalance = 2850; // R$ 28,50 em centavos