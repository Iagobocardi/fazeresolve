// src/components/modals/ProdutosFornecedorModal.js
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { fetchProdutosPorFornecedor, createProdutoFornecedor } from '../../api/fornecedoresApi.js';
import { Button } from '../ui/Button.jsx';
import { formatCurrency } from '../../lib/utils.js';

const ProdutosFornecedorModal = ({ fornecedor, onClose }) => {
    const queryClient = useQueryClient();
    const [formState, setFormState] = useState({ nome: '', preco: '', unidade: 'un' });

    const { data: produtos, isLoading, error } = useQuery({
        queryKey: ['produtosFornecedor', fornecedor?._id],
        queryFn: () => fetchProdutosPorFornecedor(fornecedor?._id),
        enabled: !!fornecedor, // Só executa a busca se houver um fornecedor
    });

    const addProdutoMutation = useMutation({
        mutationFn: createProdutoFornecedor,
        onSuccess: () => {
            toast.success("Produto adicionado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['produtosFornecedor', fornecedor?._id] });
            setFormState({ nome: '', preco: '', unidade: 'un' }); // Limpa o formulário
        },
        onError: (err) => toast.error(err.message),
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        addProdutoMutation.mutate({ fornecedorId: fornecedor._id, produtoData: formState });
    };

    if (!fornecedor) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100]">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-foreground">Produtos de {fornecedor.nome}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>X</Button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    {/* Lista de Produtos */}
                    <div>
                        {isLoading && <p>A carregar produtos...</p>}
                        {error && <p className="text-destructive">{error.message}</p>}
                        {produtos && produtos.length > 0 && (
                            <ul className="space-y-2">
                                {produtos.map(produto => (
                                    <li key={produto._id} className="flex justify-between items-center p-3 border rounded-md">
                                        <span className="font-medium">{produto.nome} ({produto.unidade})</span>
                                        <span className="font-semibold text-primary">{formatCurrency(produto.preco)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {produtos && produtos.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum produto registado para este fornecedor.</p>}
                    </div>

                    {/* Formulário para Adicionar Novo Produto */}
                    <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-foreground mb-3">Adicionar Novo Produto</h3>
                        <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4 items-end">
                            <input name="nome" value={formState.nome} onChange={handleInputChange} placeholder="Nome do Produto" className="w-full p-2 border rounded-md bg-background" required />
                            <input name="preco" type="number" value={formState.preco} onChange={handleInputChange} placeholder="Preço (R$)" className="w-full p-2 border rounded-md bg-background" required />
                            <input name="unidade" value={formState.unidade} onChange={handleInputChange} placeholder="Unidade (un, m², kg)" className="w-full p-2 border rounded-md bg-background" />
                            <Button type="submit" disabled={addProdutoMutation.isPending} className="col-span-3">
                                {addProdutoMutation.isPending ? 'A adicionar...' : 'Adicionar Produto'}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProdutosFornecedorModal;