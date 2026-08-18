// src/pages/dashboard/PagamentosAtrasados.js
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import SummaryCard from '../../components/ui/SummaryCard.js';
import { formatCurrency } from '../../lib/utils.js';
import apiClient from '../../api/apiClient';

const fetchPagamentosAtrasados = async () => {
    const { data } = await apiClient.get('/dashboard/pagamentos-atrasados');
    return data;
}

const PagamentosAtrasados = ({ onPedidoClick }) => {
    const { data: pedidos, isLoading, error } = useQuery({ 
        queryKey: ['pagamentosAtrasados'], 
        queryFn: fetchPagamentosAtrasados 
    });

    // Calcula o valor total pendente
    const totalPendente = pedidos?.reduce((acc, pedido) => {
        const totalPago = pedido.pagamentos?.reduce((sum, p) => sum + p.valor, 0) || 0;
        const saldoDevedor = (pedido.valorProposto || 0) - totalPago;
        return acc + saldoDevedor;
    }, 0) || 0;

    return (
        <SummaryCard title="Pagamentos Pendentes" isLoading={isLoading} error={error}>
            {pedidos && pedidos.length > 0 ? (
                <div>
                    <div className="mb-4 p-3 bg-red-100 rounded-lg text-center">
                        <p className="text-sm text-red-700 font-semibold">Valor Total Pendente</p>
                        <p className="text-xl font-bold text-red-800">{formatCurrency(totalPendente)}</p>
                    </div>
                    <ul className="space-y-3">
                        {pedidos.map(pedido => {
                            const totalPago = pedido.pagamentos?.reduce((sum, p) => sum + p.valor, 0) || 0;
                            const saldoDevedor = (pedido.valorProposto || 0) - totalPago;

                            return (
                                <li
                                    key={pedido._id}
                                    onClick={() => onPedidoClick(pedido)}
                                    className="text-sm p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex justify-between">
                                        <p className="font-semibold text-gray-800">{pedido.cliente?.nome || "Cliente"}</p>
                                        <p className="font-bold text-red-600">{formatCurrency(saldoDevedor)}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Pedido #{pedido.shortId} - Finalizado em {new Date(pedido.dataFinalizacao).toLocaleDateString('pt-BR')}</p>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ) : (
                <p className="text-sm text-gray-500 h-full flex items-center justify-center">Não há pagamentos pendentes.</p>
            )}
        </SummaryCard>
    );
}

export default PagamentosAtrasados;