import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../lib/utils.js';
import apiClient from 'api/apiClient';
import AddProductModal from '../components/modals/AddProductModal.js';
import EditProductModal from '../components/modals/EditProductModal.js';
import AjusteEstoqueModal from '../components/modals/AjusteEstoqueModal.js';
import EstoqueInteligenteModal from '../components/modals/EstoqueInteligenteModal.js';

// --- Ícones ---
const EditIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> );
const SettingsIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg> );
const TrashIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg> );
const PlusIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg> );
const CpuIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 10v4"/><path d="M12 18v.01"/><path d="M21.17 12a9.996 9.996 0 0 1-9.17 9c-5.523 0-10-4.477-10-10s4.477-10 10-10c.347 0 .69.018 1.03.054"/><path d="M16 8.54c.411.432.746.93.997 1.46"/></svg> );

// --- COMPONENTE PRINCIPAL DA PÁGINA ---
function EstoquePage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAjusteModal, setShowAjusteModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isEstoqueInteligenteOpen, setIsEstoqueInteligenteOpen] = useState(false);

    const { data: produtos = [], isLoading, error } = useQuery({
        queryKey: ['produtos'],
        queryFn: async () => {
            const { data } = await apiClient.get('/produtos');
            return data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(`/produtos/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['produtos'] });
            toast.success('Produto removido!');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Falha ao apagar produto.');
        }
    });

    const handleDeleteProduto = (id) => {
        if (!window.confirm('Tem certeza que deseja apagar este produto?')) return;
        deleteMutation.mutate(id);
    };

    const handleEditClick = (product) => {
        setSelectedProduct(product);
        setShowEditModal(true);
    };
    
    const handleAjusteClick = (product) => {
        setSelectedProduct(product);
        setShowAjusteModal(true);
    };

    const filteredProdutos = useMemo(() =>
        produtos.filter(p => 
            p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.descricao && p.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
        ),
        [produtos, searchTerm]
    );

    const stats = useMemo(() => {
        const valorTotal = produtos.reduce((acc, p) => acc + ((parseFloat(p.custoUnitario) || 0) * (parseInt(p.quantidadeEmEstoque, 10) || 0)), 0);
        const itensAbaixoMinimo = produtos.filter(p => (parseInt(p.quantidadeEmEstoque, 10) || 0) <= p.estoqueMinimo).length;
        return {
            valorTotal: formatCurrency(valorTotal),
            itensDistintos: produtos.length,
            itensAbaixoMinimo: itensAbaixoMinimo,
        };
    }, [produtos]);

    return (
        <div className="space-y-6">
            {/* CABEÇALHO DA PÁGINA */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Gestão de Estoque</h1>
                    <p className="text-slate-500 mt-1">Controle seus materiais e peças com facilidade.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsEstoqueInteligenteOpen(true)} className="bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 border transition-colors">
                        <CpuIcon className="h-4 w-4" />
                        Estoque Inteligente (IA)
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors">
                        <PlusIcon className="h-4 w-4" />
                        Adicionar Produto
                    </button>
                </div>
            </div>

            {/* INDICADORES PRINCIPAIS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500">Valor Total do Estoque</h3>
                    <p className="text-3xl font-bold mt-2">{stats.valorTotal}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500">Itens Distintos</h3>
                    <p className="text-3xl font-bold mt-2">{stats.itensDistintos}</p>
                </div>
                <div className={`bg-white p-6 rounded-xl shadow-sm ${stats.itensAbaixoMinimo > 0 ? 'border-2 border-red-200' : ''}`}>
                    <h3 className="text-sm font-medium text-slate-500">Itens Abaixo do Mínimo</h3>
                    <p className={`text-3xl font-bold mt-2 ${stats.itensAbaixoMinimo > 0 ? 'text-red-600' : ''}`}>{stats.itensAbaixoMinimo}</p>
                </div>
            </div>
            
            {/* PAINEL DE ITENS EM ESTOQUE */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold text-slate-700">Itens em Estoque</h2>
                    <input 
                        type="text" 
                        placeholder="Buscar por nome ou descrição..." 
                        className="w-full sm:w-72 p-2 border rounded-lg text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="overflow-x-auto">
                    {isLoading ? <p>A carregar...</p> : error ? <p className="text-red-500">{error.message}</p> : (
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600 w-20">Imagem</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Produto</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Qtd. em Estoque</th>
                                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Custo Unitário</th>
                                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredProdutos.map(produto => (
                                    <tr key={produto._id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2">
                                            <img src={produto.imagemUrl || 'https://placehold.co/60x60/E2E8F0/475569?text=S/F'} alt={produto.nome} className="w-12 h-12 object-cover rounded-md" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <p className="font-medium">{produto.nome}</p>
                                            {/* Fornecedor não está no modelo de dados atual */}
                                            {/* <p className="text-xs text-slate-500">Fornecedor: Tecidos & Cia</p> */}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${produto.quantidadeEmEstoque <= produto.estoqueMinimo ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                {produto.quantidadeEmEstoque <= produto.estoqueMinimo ? 'Estoque Baixo' : 'Em Estoque'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-center font-semibold text-lg">
                                            {parseInt(produto.quantidadeEmEstoque, 10) || 0}
                                            <span className="text-xs font-normal text-slate-500 ml-1">{produto.unidade}</span>
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold">{formatCurrency(produto.custoUnitario)}</td>
                                        <td className="px-4 py-2 text-center">
                                            <div className="flex justify-center items-center space-x-1">
                                                <button onClick={() => handleEditClick(produto)} title="Editar Produto" className="p-2 text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-100"><EditIcon /></button>
                                                <button onClick={() => handleAjusteClick(produto)} title="Ajustar Estoque" className="p-2 text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-100"><SettingsIcon /></button>
                                                <button onClick={() => handleDeleteProduto(produto._id)} title="Apagar Produto" className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-100"><TrashIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {!isLoading && filteredProdutos.length === 0 && <p className="text-center text-slate-500 py-6">Nenhum produto encontrado.</p>}
                </div>
            </div>

            <AddProductModal show={showAddModal} onHide={() => setShowAddModal(false)} />
            <EditProductModal 
                show={showEditModal} 
                onHide={() => setShowEditModal(false)} 
                product={selectedProduct} 
                onDelete={() => {
                    if (selectedProduct) {
                        handleDeleteProduto(selectedProduct._id);
                        setShowEditModal(false);
                    }
                }}
            />
            <AjusteEstoqueModal show={showAjusteModal} onHide={() => setShowAjusteModal(false)} product={selectedProduct} />
            {isEstoqueInteligenteOpen && <EstoqueInteligenteModal onClose={() => setIsEstoqueInteligenteOpen(false)} />}
        </div>
    );
}

export default EstoquePage;
