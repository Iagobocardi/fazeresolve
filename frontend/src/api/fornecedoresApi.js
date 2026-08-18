// src/api/fornecedoresApi.js
import apiClient from './apiClient';

const getToken = () => localStorage.getItem('authToken');

// --- FORNECEDORES ---

/**
 * Busca a lista de fornecedores, com filtros opcionais.
 * @param {object} params - Parâmetros de query (search, categoria).
 * @returns {Promise<Array>} - A lista de fornecedores.
 */
export const fetchFornecedores = async (params = {}) => {
    const token = getToken();
    const { data } = await apiClient.get('/fornecedores', {
        headers: { 'Authorization': `Bearer ${token}` },
        params
    });
    return data;
};

/**
 * Cria um novo fornecedor.
 * @param {object} fornecedorData - Os dados do novo fornecedor.
 * @returns {Promise<object>} - O fornecedor criado.
 */
export const createFornecedor = async (fornecedorData) => {
    const token = getToken();
    const { data } = await apiClient.post('/fornecedores', fornecedorData, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return data;
};

/**
 * Atualiza um fornecedor existente.
 * @param {string} id - O ID do fornecedor a ser atualizado.
 * @param {object} fornecedorData - Os novos dados do fornecedor.
 * @returns {Promise<object>} - O fornecedor atualizado.
 */
export const updateFornecedor = async ({ id, ...fornecedorData }) => {
    const token = getToken();
    const { data } = await apiClient.put(`/fornecedores/${id}`, fornecedorData, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return data;
};

/**
 * Desativa um fornecedor (exclusão lógica).
 * @param {string} id - O ID do fornecedor a ser desativado.
 * @returns {Promise<object>} - A mensagem de sucesso.
 */
export const deleteFornecedor = async (id) => {
    const token = getToken();
    const { data } = await apiClient.delete(`/fornecedores/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return data;
};

// --- PRODUTOS DE FORNECEDORES ---
export const fetchProdutosPorFornecedor = async (fornecedorId) => {
    if (!fornecedorId) return [];
    const token = getToken(); // Added token for consistency
    const { data } = await apiClient.get(`/fornecedores/${fornecedorId}/produtos`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return data;
};

export const createProdutoFornecedor = async ({ fornecedorId, produtoData }) => {
    const token = getToken(); // Added token for consistency
    const { data } = await apiClient.post(`/fornecedores/${fornecedorId}/produtos`, produtoData, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return data;
};
