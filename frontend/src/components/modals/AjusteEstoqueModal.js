import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import apiClient from 'api/apiClient';

const AjusteEstoqueModal = ({ show, onHide, product }) => {
  const [tipo, setTipo] = useState('Entrada');
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState('Compra de fornecedor');
  const queryClient = useQueryClient();

  useEffect(() => {
    // Reset state when a new product is selected
    setTipo('Entrada');
    setQuantidade(1);
    setMotivo('Compra de fornecedor');
  }, [product]);
  
  const ajusteEstoqueMutation = useMutation({
    mutationFn: (ajuste) => apiClient.patch(`/produtos/${product._id}/ajustar-estoque`, ajuste),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Estoque ajustado com sucesso!');
      onHide();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Ocorreu um erro ao ajustar o estoque.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    ajusteEstoqueMutation.mutate({ tipo, quantidade, motivo });
  };

  const handleQuantityChange = (amount) => {
    setQuantidade(prev => Math.max(1, prev + amount));
  };

  if (!show) {
    return null;
  }

  const baseBtnClasses = "flex items-center justify-center p-3 rounded-lg font-semibold transition-all w-full";
  const activeEntradaClasses = "border-2 border-green-500 bg-green-50 text-green-700";
  const inactiveEntradaClasses = "border border-gray-300 bg-white text-gray-500 hover:border-green-500 hover:text-green-700";
  const activeSaidaClasses = "border-2 border-red-500 bg-red-50 text-red-700";
  const inactiveSaidaClasses = "border border-gray-300 bg-white text-gray-500 hover:border-red-500 hover:text-red-700";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ajustar Estoque</h1>
            <p className="text-gray-500">Produto: <span className="font-semibold text-gray-700">{product?.nome}</span></p>
          </div>
          <button onClick={onHide} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        {/* Current Stock */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
          <p className="text-sm text-blue-700">Estoque atual</p>
          <p className="text-3xl font-bold text-blue-900">{parseInt(product?.quantidadeEmEstoque) || 0} {product?.unidade}</p>
        </div>

        {/* Adjustment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Movement Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimento</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setTipo('Entrada')} className={`${baseBtnClasses} ${tipo === 'Entrada' ? activeEntradaClasses : inactiveEntradaClasses}`}>
                <span className="mr-2">&#x2191;</span> Entrada
              </button>
              <button type="button" onClick={() => setTipo('Saida')} className={`${baseBtnClasses} ${tipo === 'Saida' ? activeSaidaClasses : inactiveSaidaClasses}`}>
                <span className="mr-2">&#x2193;</span> Saída
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
            <div className="flex items-center">
              <button type="button" onClick={() => handleQuantityChange(-1)} className="px-4 py-2 text-lg font-bold text-gray-600 bg-gray-200 rounded-l-lg hover:bg-gray-300">-</button>
              <input type="number" id="quantity" name="quantity" value={quantidade} onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)} className="w-full text-center text-lg font-semibold border-t border-b border-gray-200 focus:ring-blue-500 focus:border-blue-500" />
              <button type="button" onClick={() => handleQuantityChange(1)} className="px-4 py-2 text-lg font-bold text-gray-600 bg-gray-200 rounded-r-lg hover:bg-gray-300">+</button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Motivo</label>
            <select id="reason" name="reason" value={motivo} onChange={(e) => setMotivo(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
              <option>Compra de fornecedor</option>
              <option>Venda para cliente</option>
              <option>Ajuste de inventário</option>
              <option>Perda ou Dano</option>
              <option>Outro</option>
            </select>
          </div>
        
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-4">
            <button type="submit" disabled={ajusteEstoqueMutation.isPending} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md disabled:bg-blue-400">
              {ajusteEstoqueMutation.isPending ? 'Salvando...' : 'Salvar Ajuste'}
            </button>
            <button type="button" onClick={onHide} className="w-full sm:w-auto bg-gray-100 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AjusteEstoqueModal;
