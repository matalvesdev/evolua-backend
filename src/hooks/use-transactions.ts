import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

// =============================================
// Types
// =============================================
export interface Transaction {
  id: string;
  clinic_id: string;
  user_id: string;
  patient_id?: string;
  appointment_id?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'overdue';
  due_date: string;
  paid_at?: string;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionCategory {
  id: string;
  clinic_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  is_system: boolean;
}

export interface FinancialStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingReceivables: number;
  pendingPayables: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

interface UseTransactionsOptions {
  type?: 'income' | 'expense';
  status?: string[];
  category?: string;
  startDate?: Date;
  endDate?: Date;
  patient_id?: string;
}

// =============================================
// Hook: useTransactions
// =============================================
export function useTransactions(options?: UseTransactionsOptions) {
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', options],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('due_date', { ascending: false });

      if (options?.type) {
        query = query.eq('type', options.type);
      }

      if (options?.status && options.status.length > 0) {
        query = query.in('status', options.status);
      }

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      if (options?.patient_id) {
        query = query.eq('patient_id', options.patient_id);
      }

      if (options?.startDate) {
        query = query.gte('due_date', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('due_date', options.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Transaction[];
    },
  });

  // Create transaction
  const createTransaction = useMutation({
    mutationFn: async (transaction: Partial<Transaction>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
    },
  });

  // Update transaction
  const updateTransaction = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
    },
  });

  // Delete transaction
  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
    },
  });

  // Mark as paid
  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
    },
  });

  return {
    transactions,
    loading: isLoading,
    createTransaction: createTransaction.mutateAsync,
    updateTransaction: updateTransaction.mutateAsync,
    deleteTransaction: deleteTransaction.mutateAsync,
    markAsPaid: markAsPaid.mutateAsync,
    isCreating: createTransaction.isPending,
    isUpdating: updateTransaction.isPending,
    isDeleting: deleteTransaction.isPending,
  };
}

// =============================================
// Hook: useFinancialStats
// =============================================
export function useFinancialStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['financial-stats'],
    queryFn: async () => {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*');

      if (error) throw error;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const stats: FinancialStats = {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        pendingReceivables: 0,
        pendingPayables: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
      };

      transactions.forEach((t) => {
        if (t.status === 'completed') {
          if (t.type === 'income') {
            stats.totalIncome += Number(t.amount);

            const paidDate = new Date(t.paid_at!);
            if (
              paidDate.getMonth() === currentMonth &&
              paidDate.getFullYear() === currentYear
            ) {
              stats.monthlyIncome += Number(t.amount);
            }
          } else {
            stats.totalExpenses += Number(t.amount);

            const paidDate = new Date(t.paid_at!);
            if (
              paidDate.getMonth() === currentMonth &&
              paidDate.getFullYear() === currentYear
            ) {
              stats.monthlyExpenses += Number(t.amount);
            }
          }
        } else if (t.status === 'pending' || t.status === 'overdue') {
          if (t.type === 'income') {
            stats.pendingReceivables += Number(t.amount);
          } else {
            stats.pendingPayables += Number(t.amount);
          }
        }
      });

      stats.balance = stats.totalIncome - stats.totalExpenses;

      return stats;
    },
  });

  return { stats, loading: isLoading };
}

// =============================================
// Hook: useTransactionCategories
// =============================================
export function useTransactionCategories(type?: 'income' | 'expense') {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['transaction-categories', type],
    queryFn: async () => {
      let query = supabase
        .from('transaction_categories')
        .select('*')
        .order('name');

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TransactionCategory[];
    },
  });

  return { categories, loading: isLoading };
}
