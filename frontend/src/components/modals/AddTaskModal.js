import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { adicionarTarefa } from '../../api/checklistApi';

const AddTaskModal = ({ isOpen, onClose, pedidoId }) => {
  const [descricao, setDescricao] = useState('');
  const queryClient = useQueryClient();

  const addTaskMutation = useMutation({
    mutationFn: () => adicionarTarefa({ pedidoId, descricao }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      toast.success('Tarefa adicionada com sucesso!');
      setDescricao('');
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Ocorreu um erro ao adicionar a tarefa.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!descricao.trim()) {
      toast.error('A descrição da tarefa não pode estar vazia.');
      return;
    }
    addTaskMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Adicionar Tarefa ao Checklist</h1>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição da Tarefa</label>
            <input
              type="text"
              id="descricao"
              name="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Lixar a superfície do móvel"
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-5 border-t mt-6">
            <button
              type="submit"
              disabled={addTaskMutation.isPending}
              className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {addTaskMutation.isPending ? 'Adicionando...' : 'Adicionar Tarefa'}
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

export default AddTaskModal;
