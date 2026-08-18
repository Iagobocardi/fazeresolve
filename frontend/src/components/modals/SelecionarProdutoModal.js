import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProdutos } from '../../api/produtosApi';
import { getCatalogoPessoal } from '../../api/catalogoApi';

const SelecionarProdutoModal = ({ isOpen, onClose, onSelectProduto }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: produtosEstoque = [], isLoading: isLoadingEstoque } = useQuery({
        queryKey: ['produtos'],
        queryFn: getProdutos,
        enabled: isOpen,
    });

    const { data: catalogoPessoal = [], isLoading: isLoadingPessoal } = useQuery({
        queryKey: ['catalogoPessoal'],
        queryFn: () => getCatalogoPessoal().then(res => res.data),
        enabled: isOpen,
    });

    const combinedList = useMemo(() => {
        const estoque = Array.isArray(produtosEstoque) ? produtosEstoque.map(p => ({ ...p, source: 'Estoque', id: p._id, custo: p.custoUnitario })) : [];
        const pessoal = Array.isArray(catalogoPessoal) ? catalogoPessoal.map(p => ({ ...p, source: 'Catálogo', id: p._id, custo: p.meuPrecoCusto })) : [];
        return [...estoque, ...pessoal];
    }, [produtosEstoque, catalogoPessoal]);

    const filteredList = useMemo(() =>
        combinedList.filter(item =>
            item.nome.toLowerCase().includes(searchTerm.toLowerCase())
        ),
    [combinedList, searchTerm]);

    const isLoading = isLoadingEstoque || isLoadingPessoal;

    if (!isOpen) return null;

    return (
        <div className="selection-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">Selecionar Produto</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div className="p-5">
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input
                            type="text"
                            placeholder="Buscar no Estoque ou Catálogo"
                            className="input-field pl-9 w-full border-gray-300 rounded-md"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {isLoading ? (
                        <p className="p-4 text-center">Carregando...</p>
                    ) : filteredList.length > 0 ? (
                        filteredList.map(item => (
                            <div key={item.id} className="search-result-item p-3 border-b cursor-pointer hover:bg-gray-50" onClick={() => onSelectProduto(item)}>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-800">{item.nome}</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.source === 'Estoque' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {item.source}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {item.source === 'Estoque' ? `Em Estoque: ${item.quantidadeEmEstoque} un. | ` : ''}
                                    Custo: R$ {Number(item.custo || 0).toFixed(2)}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="p-4 text-center text-gray-500">Nenhum item encontrado.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SelecionarProdutoModal;
