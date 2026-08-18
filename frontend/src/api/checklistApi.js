import apiClient from './apiClient';

// Função para adicionar uma tarefa
export const adicionarTarefa = async ({ pedidoId, descricao }) => {
    try {
        const { data } = await apiClient.post(`/checklist/${pedidoId}/tarefas`, { descricao });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Não foi possível adicionar a tarefa.');
    }
};

// Função para atualizar o status de uma tarefa
export const atualizarTarefa = async ({ pedidoId, tarefaId, concluida }) => {
    try {
        const { data } = await apiClient.patch(`/checklist/${pedidoId}/tarefas/${tarefaId}`, { concluida });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Não foi possível atualizar a tarefa.');
    }
};

// Função para remover uma tarefa
export const removerTarefa = async ({ pedidoId, tarefaId }) => {
    try {
        await apiClient.delete(`/checklist/${pedidoId}/tarefas/${tarefaId}`);
        return { message: 'Tarefa removida com sucesso' }; // DELETE requests might not return a body
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Não foi possível remover a tarefa.');
    }
};
