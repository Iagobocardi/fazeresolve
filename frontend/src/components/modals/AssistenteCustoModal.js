import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { estimarCusto } from '../../api/utilsApi';
import { X } from 'lucide-react';

const formatCurrency = (value) => {
    const number = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
};

const AssistenteCustoModal = ({ isOpen, onClose, itemDescription, onUsePrice }) => {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['estimarCusto', itemDescription],
        queryFn: () => estimarCusto(itemDescription),
        enabled: isOpen && !!itemDescription,
        staleTime: Infinity, // The price for a description is unlikely to change frequently
    });

    const handleUsePrice = () => {
        if (data?.averagePrice) {
            onUsePrice(data.averagePrice);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card w-full max-w-lg">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Assistente de Custo de Material</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-gray-500 text-sm mt-1">
                        Pesquisando preço de mercado para: "<span className="font-semibold">{itemDescription}</span>"
                    </p>
                </div>

                {isLoading && (
                    <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F5DE4] mx-auto"></div>
                        <p className="mt-4 font-semibold">Buscando preços online...</p>
                    </div>
                )}
                
                {isError && (
                     <div className="p-6 text-center">
                        <p className="text-red-500 font-semibold">Erro ao buscar preço.</p>
                        <p className="text-gray-600 mt-2">{error.message}</p>
                    </div>
                )}

                {data && (
                    <div className="p-6 space-y-4">
                        <div className="text-center bg-blue-50 p-4 rounded-lg">
                            <p className="font-semibold text-gray-600">Preço Médio de Mercado Encontrado</p>
                            <p className="text-3xl font-bold text-[#2F5DE4] my-2">{formatCurrency(data.averagePrice)} / un</p>
                            <button 
                                onClick={handleUsePrice}
                                className="w-full bg-[#2F5DE4] hover:bg-[#254AC7] text-white font-semibold py-2 rounded-lg"
                            >
                                Usar este Preço
                            </button>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm">Detalhes da Estimativa:</h4>
                            <ul className="text-sm text-gray-600 mt-2 border border-gray-200 rounded-md divide-y">
                                <li className="p-3">
                                    <strong>Faixa de Preço:</strong> 
                                    <span> {formatCurrency(data.minPrice)} - {formatCurrency(data.maxPrice)}</span>
                                </li>
                                <li className="p-3">
                                    <strong>Fontes Encontradas:</strong> 
                                    <span> {data.sourceCount}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                <div className="bg-gray-50 p-4 text-right">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssistenteCustoModal;
