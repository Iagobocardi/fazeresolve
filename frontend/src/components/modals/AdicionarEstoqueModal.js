import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchProdutos } from '../../api/produtosApi';
import { useDebounce } from '../../hooks/useDebounce';
import { X } from 'lucide-react';

const AdicionarEstoqueModal = ({ isOpen, onClose, onAddItem }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const { data: products, isLoading } = useQuery({
        queryKey: ['products', debouncedSearchTerm],
        queryFn: () => searchProdutos(debouncedSearchTerm),
        enabled: !!debouncedSearchTerm,
    });

    const handleAddItem = (product) => {
        onAddItem({
            description: product.nome,
            qty: 1,
            price: product.custoUnitario,
            produtoId: product._id, // Keep track of the original product ID
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Buscar Produto no Estoque</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6">
                    <input
                        type="search"
                        id="stock-search"
                        placeholder="Buscar por nome ou código..."
                        className="w-full border-gray-300 rounded-lg shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="p-6 overflow-y-auto">
                    {isLoading && <p className="text-center">Buscando...</p>}
                    {!isLoading && !products?.length && debouncedSearchTerm && (
                        <p className="text-center text-gray-500">Nenhum produto encontrado para "{debouncedSearchTerm}".</p>
                    )}
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left font-semibold pb-2">Produto</th>
                                <th className="text-left font-semibold pb-2">Em Estoque</th>
                                <th className="text-left font-semibold pb-2">Custo</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody id="stock-list">
                            {products?.map(p => (
                                <tr key={p._id} className="border-b hover:bg-gray-50">
                                    <td className="py-3 font-semibold">{p.nome}</td>
                                    <td className="py-3">{p.quantidadeEmEstoque} un.</td>
                                    <td className="py-3">R$ {(p.custoUnitario || 0).toFixed(2)}</td>
                                    <td className="py-3">
                                        <button 
                                            onClick={() => handleAddItem(p)}
                                            className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full hover:bg-blue-200"
                                        >
                                            Add
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-gray-50 p-4 mt-auto flex justify-end gap-2">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export default AdicionarEstoqueModal;
