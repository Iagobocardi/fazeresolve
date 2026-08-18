import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../lib/utils';

const fetchFaturamentoPorCategoria = async () => {
    // Using a try-catch block for better error handling, though useQuery handles it.
    try {
        const { data } = await apiClient.get('/dashboard/faturamento-por-categoria');
        return data;
    } catch (error) {
        console.error("Error fetching faturamento por categoria:", error);
        throw new Error(error.response?.data?.message || 'Erro ao buscar dados de faturamento.');
    }
};

const FaturamentoPorCategoria = () => {
    const { data: categorias, isLoading, error } = useQuery({
        queryKey: ['faturamentoPorCategoria'],
        queryFn: fetchFaturamentoPorCategoria,
    });

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Faturamento por Categoria</h2>
            <div className="space-y-4">
                {isLoading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <Skeleton className="h-5 w-3/5" />
                            <Skeleton className="h-5 w-1/5" />
                        </div>
                    ))
                ) : error ? (
                    <div className="text-center text-red-500 py-8">
                        <i className="fas fa-exclamation-circle text-3xl mb-2"></i>
                        <p className="font-semibold">{error.message}</p>
                    </div>
                ) : categorias && categorias.length > 0 ? (
                    categorias.map(item => (
                        <div key={item.categoria} className="flex items-center justify-between">
                            <div>
                                <span className="font-semibold text-slate-700">{item.categoria}</span>
                                <p className="text-xs text-slate-500">{item.pedidos} pedido(s)</p>
                            </div>
                            <span className="font-bold text-slate-600">{formatCurrency(item.faturamento)}</span>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-slate-500 py-8">
                        <i className="fas fa-chart-pie text-3xl text-slate-300 mb-2"></i>
                        <p className="font-semibold">Nenhum dado de faturamento por categoria.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaturamentoPorCategoria;
