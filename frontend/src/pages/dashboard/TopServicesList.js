import React from 'react';
import { Skeleton } from '../../components/ui/Skeleton';

const TopServicesList = ({ servicos, isLoading }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Serviços Mais Realizados</h2>
            <div className="space-y-4">
                {isLoading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-5 w-1/4" />
                        </div>
                    ))
                ) : (
                    <div className="text-center text-slate-500 py-8">
                        <i className="fas fa-tools text-3xl text-slate-300 mb-2"></i>
                        <p className="font-semibold">Dados não disponíveis</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopServicesList;
