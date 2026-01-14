import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/currency';
import { Users, Plus, Settings, Phone } from 'lucide-react';

interface FamilyMember {
  id: string;
  role: 'parent' | 'child';
  display_name: string;
  phone?: string;
  created_at: string;
}

interface DaughterData {
  id: string;
  monthly_allowance_cents: number;
  rewards_enabled: boolean;
}

export default function Family() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [daughters, setDaughters] = useState<Record<string, DaughterData>>({});

  useEffect(() => {
    loadFamilyData();
  }, [profile]);

  const loadFamilyData = async () => {
    if (!profile?.family_id) return;

    try {
      // Load family members
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', profile.family_id);

      if (membersError) {
        console.error('Error loading members:', membersError);
      } else {
        setMembers((membersData || []) as FamilyMember[]);
      }

      // Load daughters data
      const childIds = membersData?.filter(m => m.role === 'child').map(m => m.id) || [];
      if (childIds.length > 0) {
        const { data: daughtersData, error: daughtersError } = await supabase
          .from('daughters')
          .select('*')
          .in('id', childIds);

        if (!daughtersError && daughtersData) {
          const daughtersMap = daughtersData.reduce((acc, daughter) => {
            acc[daughter.id] = daughter;
            return acc;
          }, {} as Record<string, DaughterData>);
          setDaughters(daughtersMap);
        }
      }
    } catch (error) {
      console.error('Error loading family data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAllowance = async (daughterId: string, newAllowance: number) => {
    try {
      const { error } = await supabase
        .from('daughters')
        .update({ monthly_allowance_cents: newAllowance })
        .eq('id', daughterId);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a mesada.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Mesada atualizada!",
          description: "O valor da mesada foi atualizado com sucesso.",
        });
        loadFamilyData();
      }
    } catch (error) {
      console.error('Error updating allowance:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Gerenciar Família
            </h1>
            <p className="text-sm text-muted-foreground">
              Membros da sua família
            </p>
          </div>
          <div>
            <Button
              onClick={() => window.location.href = '/convites'}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Convidar Filha
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-20 space-y-6">
        {/* Family Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Membros da Família
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {members.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum membro encontrado
              </p>
            ) : (
              members.map((member) => {
                const daughterData = daughters[member.id];
                
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{member.display_name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          member.role === 'parent' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-secondary/10 text-secondary-foreground'
                        }`}>
                          {member.role === 'parent' ? 'Pai/Mãe' : 'Filha'}
                        </span>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {member.phone}
                        </div>
                      )}
                      {daughterData && (
                        <p className="text-sm text-muted-foreground">
                          Mesada: {formatBRL(daughterData.monthly_allowance_cents)}
                        </p>
                      )}
                    </div>
                    {member.role === 'child' && daughterData && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Mesada (centavos)"
                          defaultValue={daughterData.monthly_allowance_cents}
                          onBlur={(e) => {
                            const newValue = parseInt(e.target.value);
                            if (newValue !== daughterData.monthly_allowance_cents) {
                              updateAllowance(member.id, newValue);
                            }
                          }}
                          className="w-32 text-sm"
                        />
                        <Button size="sm" variant="outline">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}