import apiClient from './apiClient';

/**
 * Busca todos os produtos do estoque.
 */
export const getProdutos = async () => {
    try {
        const { data } = await apiClient.get('/produtos');
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Não foi possível buscar os produtos do estoque.');
    }
};

/**
 * Busca produtos no estoque com base em um termo de pesquisa.
 */
export const searchProdutos = async (searchTerm) => {
    if (!searchTerm) return [];
    try {
        const { data } = await apiClient.get(`/produtos?search=${searchTerm}`);
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Não foi possível buscar os produtos.');
    }
};

/**
 * Adiciona um material do estoque a um pedido específico.
 */
export const addMaterialToPedido = async ({ pedidoId, produtoId, quantidade }) => {
    try {
        const { data } = await apiClient.post(`/orcamentos/${pedidoId}/materiais`, { produtoId, quantidade });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao adicionar material.');
    }
};

/**
 * Remove um material de um pedido específico.
 */
export const removeMaterialFromPedido = async ({ pedidoId, materialUsadoId }) => {
    try {
        await apiClient.delete(`/orcamentos/${pedidoId}/materiais/${materialUsadoId}`);
        return { message: 'Material removido com sucesso.' };
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao remover material.');
    }
};
