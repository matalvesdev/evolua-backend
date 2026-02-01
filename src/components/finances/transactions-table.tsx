interface Transaction {
  id: string;
  description: string;
  category: string;
  categoryType: 'income' | 'expense';
  date: string;
  amount: number;
}

interface TransactionsTableProps {
  transactions: Transaction[];
}

const categoryStyles = {
  income: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  expense: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
};

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Últimas Movimentações</h3>
        <a 
          href="#" 
          className="text-sm font-bold text-[#820AD1] hover:underline"
        >
          Ver extrato completo
        </a>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs font-bold text-[#7c6189] border-b border-[#f3f0f4] dark:border-white/10">
              <th className="py-3 pl-2">Descrição</th>
              <th className="py-3">Categoria</th>
              <th className="py-3">Data</th>
              <th className="py-3 text-right pr-2">Valor</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {transactions.map((transaction, index) => (
              <tr 
                key={transaction.id}
                className={`group hover:bg-[#820AD1]/5 transition-colors ${
                  index < transactions.length - 1 
                    ? 'border-b border-[#f3f0f4] dark:border-white/5' 
                    : ''
                }`}
              >
                <td className="py-4 pl-2 font-medium">
                  {transaction.description}
                </td>
                <td className="py-4">
                  <span 
                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                      categoryStyles[transaction.categoryType]
                    }`}
                  >
                    {transaction.category}
                  </span>
                </td>
                <td className="py-4 text-[#7c6189]">
                  {transaction.date}
                </td>
                <td 
                  className={`py-4 text-right pr-2 font-bold ${
                    transaction.amount > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {transaction.amount > 0 ? '+ ' : '- '}
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(Math.abs(transaction.amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
