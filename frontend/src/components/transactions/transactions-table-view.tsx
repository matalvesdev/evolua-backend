import { TransactionRow } from './transaction-row';
import { TablePagination } from './table-pagination';

interface Transaction {
  id: string;
  date: string;
  time: string;
  patient: {
    name: string;
    avatar?: string;
    initials?: string;
  };
  amount: number;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'overdue';
}

interface TransactionsTableViewProps {
  transactions: Transaction[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
  resultsPerPage: number;
  onPageChange: (page: number) => void;
  onGenerateReceipt: (transactionId: string) => void;
  onSendCharge: (transactionId: string) => void;
  onResend: (transactionId: string) => void;
}

export function TransactionsTableView({
  transactions,
  currentPage,
  totalPages,
  totalResults,
  resultsPerPage,
  onPageChange,
  onGenerateReceipt,
  onSendCharge,
  onResend
}: TransactionsTableViewProps) {
  return (
    <div className="bg-white/60 dark:bg-[#1c1022]/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden flex flex-col">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#f3f0f4] dark:border-white/5">
              <th className="py-5 px-6 text-xs font-bold text-[#7c6189] uppercase tracking-wider">
                Data
              </th>
              <th className="py-5 px-6 text-xs font-bold text-[#7c6189] uppercase tracking-wider">
                Paciente
              </th>
              <th className="py-5 px-6 text-xs font-bold text-[#7c6189] uppercase tracking-wider">
                Valor
              </th>
              <th className="py-5 px-6 text-xs font-bold text-[#7c6189] uppercase tracking-wider">
                Forma de Pgto
              </th>
              <th className="py-5 px-6 text-xs font-bold text-[#7c6189] uppercase tracking-wider">
                Status
              </th>
              <th className="py-5 px-6 text-xs font-bold text-[#7c6189] uppercase tracking-wider text-right">
                Ações Rápidas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f0f4] dark:divide-white/5 text-sm">
            {transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                date={transaction.date}
                time={transaction.time}
                patient={transaction.patient}
                amount={transaction.amount}
                paymentMethod={transaction.paymentMethod}
                status={transaction.status}
                onGenerateReceipt={() => onGenerateReceipt(transaction.id)}
                onSendCharge={() => onSendCharge(transaction.id)}
                onResend={() => onResend(transaction.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalResults={totalResults}
        resultsPerPage={resultsPerPage}
        onPageChange={onPageChange}
      />
    </div>
  );
}
