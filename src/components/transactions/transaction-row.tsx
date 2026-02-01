interface TransactionRowProps {
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
  onGenerateReceipt?: () => void;
  onSendCharge?: () => void;
  onResend?: () => void;
}

const statusConfig = {
  paid: {
    label: 'Pago',
    className: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/30'
  },
  pending: {
    label: 'Pendente',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30'
  },
  overdue: {
    label: 'Atrasado',
    className: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30'
  }
};

export function TransactionRow({
  date,
  time,
  patient,
  amount,
  paymentMethod,
  status,
  onGenerateReceipt,
  onSendCharge,
  onResend
}: TransactionRowProps) {
  const statusStyle = statusConfig[status];

  return (
    <tr className="group hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
      {/* Date */}
      <td className="py-4 px-6 font-medium">
        {date}
        <div className="text-[10px] text-[#7c6189]">{time}</div>
      </td>

      {/* Patient */}
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          {patient.avatar ? (
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9"
              style={{ backgroundImage: `url(${patient.avatar})` }}
            />
          ) : (
            <div className="bg-[#820AD1]/10 text-[#820AD1] rounded-full size-9 flex items-center justify-center font-bold text-xs">
              {patient.initials}
            </div>
          )}
          <span className="font-bold">{patient.name}</span>
        </div>
      </td>

      {/* Amount */}
      <td className="py-4 px-6 font-bold">
        {new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(amount)}
      </td>

      {/* Payment method */}
      <td className="py-4 px-6 text-[#7c6189]">{paymentMethod}</td>

      {/* Status */}
      <td className="py-4 px-6">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusStyle.className}`}
        >
          <span className="size-1.5 rounded-full bg-current"></span>
          {statusStyle.label}
        </span>
      </td>

      {/* Actions */}
      <td className="py-4 px-6 text-right">
        <div className="flex items-center justify-end gap-2">
          {status === 'paid' && onGenerateReceipt && (
            <>
              <button
                onClick={onGenerateReceipt}
                className="p-2 rounded-lg text-[#7c6189] hover:bg-[#820AD1]/10 hover:text-[#820AD1] transition-colors"
                title="Gerar Recibo"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '20px' }}
                >
                  receipt_long
                </span>
              </button>
              {onSendCharge && (
                <button
                  onClick={onSendCharge}
                  className="p-2 rounded-lg text-[#7c6189] hover:bg-[#820AD1]/10 hover:text-[#820AD1] transition-colors"
                  title="Enviar Cobrança"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '20px' }}
                  >
                    send_money
                  </span>
                </button>
              )}
            </>
          )}

          {status === 'pending' && onSendCharge && (
            <button
              onClick={onSendCharge}
              className="px-3 py-1.5 rounded-lg bg-[#820AD1]/10 text-[#820AD1] text-xs font-bold hover:bg-[#820AD1] hover:text-white transition-colors"
            >
              Cobrar
            </button>
          )}

          {status === 'overdue' && onResend && (
            <button
              onClick={onResend}
              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
            >
              Reenviar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
