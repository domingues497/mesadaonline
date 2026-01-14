import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { TrendingUp, Filter, Download, Calendar } from 'lucide-react';
import { TransactionKind } from '@/types';

interface Transaction {
  id: string;
  amount_cents: number;
  kind: TransactionKind;
  memo?: string;
  created_at: string;
}

export default function Statement() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, [profile]);

  useEffect(() => {
    applyFilters();
  }, [transactions, dateFrom, dateTo, kindFilter]);

  const loadTransactions = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('daughter_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading transactions:', error);
        return;
      }

      const transactionData = (data || []) as Transaction[];
      setTransactions(transactionData);

      // Calculate total balance
      const totalBalance = transactionData.reduce((sum, transaction) => {
        return sum + transaction.amount_cents;
      }, 0);
      setBalance(totalBalance);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Date filters
    if (dateFrom) {
      filtered = filtered.filter(t => new Date(t.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(t => new Date(t.created_at) <= new Date(dateTo + 'T23:59:59'));
    }

    // Kind filter
    if (kindFilter !== 'all') {
      filtered = filtered.filter(t => t.kind === kindFilter);
    }

    setFilteredTransactions(filtered);
  };

  const getKindLabel = (kind: TransactionKind) => {
    const labels = {
      allowance: 'Mesada',
      task_approved: 'Tarefa Aprovada',
      task_missed: 'Penalidade',
      adjustment: 'Ajuste Manual',
    };
    return labels[kind];
  };

  const getKindBadgeVariant = (kind: TransactionKind) => {
    const variants = {
      allowance: 'default',
      task_approved: 'secondary',
      task_missed: 'destructive',
      adjustment: 'outline',
    };
    return variants[kind] as 'default' | 'secondary' | 'destructive' | 'outline';
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setKindFilter('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Extrato Financeiro</h1>
            <p className="text-muted-foreground">
              Histórico completo das suas transações
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/dashboard'}
          >
            Voltar
          </Button>
        </div>

        {/* Balance Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Saldo Atual</p>
              <p className={`text-3xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatBRL(balance)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Data de início</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateTo">Data de fim</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kindFilter">Tipo</Label>
                <Select value={kindFilter} onValueChange={setKindFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="allowance">Mesada</SelectItem>
                    <SelectItem value="task_approved">Tarefa Aprovada</SelectItem>
                    <SelectItem value="task_missed">Penalidade</SelectItem>
                    <SelectItem value="adjustment">Ajuste Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={clearFilters} size="sm">
                Limpar Filtros
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Transações ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma transação encontrada.</p>
                <p>Tente ajustar os filtros ou volte mais tarde.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">
                          {transaction.memo || getKindLabel(transaction.kind)}
                        </h4>
                        <Badge variant={getKindBadgeVariant(transaction.kind)}>
                          {getKindLabel(transaction.kind)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${transaction.amount_cents > 0 ? 'text-success' : 'text-destructive'}`}>
                        {transaction.amount_cents > 0 ? '+' : ''}{formatBRL(transaction.amount_cents)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Mobile Navigation */}
      <div className="block md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}