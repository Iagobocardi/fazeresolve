import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { Skeleton } from '../../components/ui/Skeleton';

const fetchTopRegioes = async () => {
    const { data } = await apiClient.get('/dashboard/top-regioes');
    return data;
};

const PopularRegionsList = () => {
    const { data: regioes, isLoading, error } = useQuery({
        queryKey: ['topRegioes'],
        queryFn: fetchTopRegioes,
    });

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Regiões Mais Populares</h2>
            <div className="space-y-4">
                {isLoading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-5 h-5" />
                                <Skeleton className="h-5 w-48" />
                            </div>
                            <Skeleton className="h-5 w-8" />
                        </div>
                    ))
                ) : error ? (
                    <div className="text-center text-red-500 py-8">
                        <i className="fas fa-exclamation-circle text-3xl mb-2"></i>
                        <p className="font-semibold">Erro ao carregar dados.</p>
                    </div>
                ) : regioes && regioes.length > 0 ? (
                    regioes.map(item => (
                        <div key={item.regiao} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-map-marker-alt w-5 text-center text-slate-400"></i>
                                <span className="font-semibold text-slate-700">{item.regiao}</span>
                            </div>
                            <span className="font-bold text-slate-500">{item.pedidos}</span>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-slate-500 py-8">
                        <i className="fas fa-map-marker-alt text-3xl text-slate-300 mb-2"></i>
                        <p className="font-semibold">Nenhuma região para exibir.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PopularRegionsList;
