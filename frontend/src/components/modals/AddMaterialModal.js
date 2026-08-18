import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getProdutos, addMaterialToPedido } from '../../api/produtosApi';

const AddMaterialModal = ({ isOpen, onClose, pedidoId }) => {
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const queryClient = useQueryClient();

  const { data: produtos, isLoading: isLoadingProdutos } = useQuery({
    queryKey: ['produtos'],
    queryFn: getProdutos,
    enabled: isOpen, // Only fetch when the modal is open
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const addMaterialMutation = useMutation({
    mutationFn: () => addMaterialToPedido({ pedidoId, produtoId: produtoSelecionadoId, quantidade }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      toast.success('Material adicionado com sucesso!');
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setProdutoSelecionadoId(produtos?.[0]?._id || '');
      setQuantidade(1);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!produtoSelecionadoId) {
      toast.error('Por favor, selecione um produto.');
      return;
    }
    if (quantidade <= 0) {
      toast.error('A quantidade deve ser maior que zero.');
      return;
    }
    addMaterialMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Adicionar Material do Estoque</h1>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="produto" className="block text-sm font-medium text-gray-700">Produto</label>
            {isLoadingProdutos ? (
              <p>Carregando produtos...</p>
            ) : (
              <select
                id="produto"
                value={produtoSelecionadoId}
                onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="" disabled>Selecione um produto</option>
                {produtos?.map(p => (
                  <option key={p._id} value={p._id}>{p.nome} ({p.quantidade} em estoque)</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label htmlFor="quantidade" className="block text-sm font-medium text-gray-700">Quantidade</label>
            <input
              type="number"
              id="quantidade"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
          </div>
          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-5 border-t mt-6">
            <button
              type="submit"
              disabled={addMaterialMutation.isPending || isLoadingProdutos}
              className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {addMaterialMutation.isPending ? 'Adicionando...' : 'Adicionar Material'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto bg-gray-100 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterialModal;
