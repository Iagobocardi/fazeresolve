import React from 'react';
import { Skeleton } from '../../components/ui/Skeleton';

const PendingPayments = ({ stats, isLoading }) => {
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    const totalPendente = stats?.receitasFuturas || 0;

    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="p-5 bg-red-50 border-b-2 border-red-100">
                <h2 className="text-xl font-bold text-red-800">Pagamentos Pendentes</h2>
                {isLoading ? (
                    <Skeleton className="h-5 w-48 mt-1" />
                ) : (
                    <p className="text-sm text-red-600 mt-1">Valor Total Pendente: <span className="font-bold">{formatCurrency(totalPendente)}</span></p>
                )}
            </div>

            {isLoading ? (
                <div className="p-6">
                    <Skeleton className="h-20 w-full" />
                </div>
            ) : (
                totalPendente > 0 ? (
                    <div className="p-6 text-center text-slate-500">
                        {/* Since we don't have the list of individual payments, we can show a summary or a call to action. */}
                        <p className="font-semibold">Você tem {formatCurrency(totalPendente)} em pagamentos futuros.</p>
                        <p className="text-sm">Veja os detalhes na sua página de finanças.</p>
                    </div>
                ) : (
                    <div className="p-6 text-center text-slate-500">
                        <i className="fas fa-check-circle text-5xl text-green-400 mb-3"></i>
                        <p className="font-semibold">Nenhum pagamento pendente!</p>
                        <p className="text-sm">Todos os seus recebimentos estão em dia.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default PendingPayments;
