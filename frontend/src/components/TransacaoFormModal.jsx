import React, { useState } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

function TransacaoFormModal({ isOpen, onClose, type, onSave }) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!descricao || !valor) {
      toast.error('Descrição e Valor são obrigatórios!');
      return;
    }

    const transacaoData = {
      tipo: type,
      descricao,
      valor: parseFloat(valor),
      categoria,
      data,
    };

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      await apiClient.post('/financeiro/transacao', transacaoData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast.success(`Nova ${type} adicionada com sucesso!`);
      onSave(); // Callback to refresh data
      onClose(); // Close modal
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Adicionar Nova {type}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="descricao" className="block text-sm font-semibold text-slate-600 mb-1">Descrição</label>
            <input
              id="descricao"
              type="text"
              placeholder="Ex: Compra de material"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="valor" className="block text-sm font-semibold text-slate-600 mb-1">Valor (R$)</label>
            <input
              id="valor"
              type="number"
              step="0.01"
              placeholder="0,00"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
           <div>
            <label htmlFor="categoria" className="block text-sm font-semibold text-slate-600 mb-1">Categoria (Opcional)</label>
            <input
              id="categoria"
              type="text"
              placeholder="Ex: Venda, Material, Marketing"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="data" className="block text-sm font-semibold text-slate-600 mb-1">Data</label>
            <input
              id="data"
              type="date"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  <span>Salvando...</span>
                </>
              ) : (
                'Salvar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TransacaoFormModal;
