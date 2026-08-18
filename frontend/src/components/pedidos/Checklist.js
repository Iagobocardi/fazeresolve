import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { adicionarTarefa, atualizarTarefa } from '../../api/checklistApi.js';

const CheckIcon = () => <i className="fas fa-check text-xs"></i>;

const Checklist = ({ pedido }) => {
    const queryClient = useQueryClient();
    const [novaTarefa, setNovaTarefa] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const onMutationSuccess = (successMessage) => {
        toast.success(successMessage);
        queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    };

    const addMutation = useMutation({
        mutationFn: adicionarTarefa,
        onSuccess: () => {
            onMutationSuccess("Tarefa adicionada!");
            setNovaTarefa('');
            setIsAdding(false);
        },
        onError: (err) => toast.error(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: atualizarTarefa,
        onSuccess: () => onMutationSuccess("Tarefa atualizada!"),
        onError: (err) => toast.error(err.message),
    });

    const handleAddTarefa = (e) => {
        e.preventDefault();
        if (!novaTarefa.trim()) return;
        addMutation.mutate({ pedidoId: pedido._id, descricao: novaTarefa });
    };

    const handleToggleTarefa = (tarefaId, concluidaAtual) => {
        updateMutation.mutate({ pedidoId: pedido._id, tarefaId, concluida: !concluidaAtual });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
               <h2 className="font-bold text-xl text-gray-800">Checklist de Execução</h2>
               {!isAdding && (
                    <button onClick={() => setIsAdding(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                        <i className="fas fa-plus mr-1"></i> Adicionar Tarefa
                    </button>
               )}
            </div>
            <div className="bg-slate-50 p-6 rounded-lg border space-y-4">
                {pedido.checklist?.map(tarefa => (
                    <div key={tarefa._id} className="checklist-item">
                        <input 
                            type="checkbox" 
                            id={`task-${tarefa._id}`} 
                            className="hidden" 
                            checked={tarefa.concluida}
                            onChange={() => handleToggleTarefa(tarefa._id, tarefa.concluida)}
                            disabled={updateMutation.isLoading}
                        />
                        <label htmlFor={`task-${tarefa._id}`} className="flex items-center cursor-pointer">
                            <div className="checklist-icon h-6 w-6 mr-3 border-2 border-gray-300 rounded-full flex items-center justify-center transition-all">
                                <CheckIcon />
                            </div>
                            <span className="text-gray-800">{tarefa.descricao}</span>
                        </label>
                    </div>
                ))}
                 {pedido.checklist?.length === 0 && !isAdding && (
                    <p className="text-sm text-gray-500 italic">Nenhuma tarefa na checklist.</p>
                )}

                {isAdding && (
                    <form onSubmit={handleAddTarefa} className="flex items-center space-x-2 pt-4 border-t mt-4 -mb-2">
                        <input
                            type="text"
                            value={novaTarefa}
                            onChange={(e) => setNovaTarefa(e.target.value)}
                            placeholder="Descrição da nova tarefa..."
                            className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            disabled={addMutation.isLoading}
                            autoFocus
                        />
                        <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors h-10" disabled={addMutation.isLoading}>
                            {addMutation.isLoading ? '...' : 'Adicionar'}
                        </button>
                        <button type="button" onClick={() => setIsAdding(false)} className="bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm h-10">
                            Cancelar
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Checklist;
