import apiClient from './apiClient';

// --- Funções para o Catálogo de Mercado ---

/**
 * Busca o catálogo de mercado com base na área de atuação.
 * @param {string} areaDeAtuacao - A área de atuação do usuário.
 * @returns {Promise<Object>} A lista de itens do catálogo de mercado.
 */
export const getCatalogoMercado = (areaDeAtuacao) => {
  return apiClient.get(`/catalogo/mercado`, { params: { area: areaDeAtuacao } });
};

/**
 * Busca os preços regionais para o catálogo de mercado.
 * @returns {Promise<Object>} A lista de preços regionais.
 */
export const getPrecosRegionais = () => {
    return apiClient.get('/catalogo/mercado/precos-regionais');
};


// --- Funções para o Catálogo Pessoal ---

/**
 * Busca o catálogo pessoal do usuário.
 * @returns {Promise<Object>} A lista de itens do catálogo pessoal.
 */
export const getCatalogoPessoal = () => {
  return apiClient.get('/catalogo/pessoal');
};

/**
 * Cria um novo item no catálogo pessoal.
 * @param {Object} itemData - Os dados do novo item.
 * @returns {Promise<Object>} O item criado.
 */
export const createItemPessoal = (itemData) => {
  return apiClient.post('/catalogo/pessoal', itemData);
};

/**
 * Atualiza um item existente no catálogo pessoal.
 * @param {string} id - O ID do item a ser atualizado.
 * @param {Object} itemData - Os dados para atualização.
 * @returns {Promise<Object>} O item atualizado.
 */
export const updateItemPessoal = (id, itemData) => {
  return apiClient.put(`/catalogo/pessoal/${id}`, itemData);
};

/**
 * Remove um item do catálogo pessoal.
 * @param {string} id - O ID do item a ser removido.
 * @returns {Promise<Object>} A resposta da API.
 */
export const deleteItemPessoal = (id) => {
  return apiClient.delete(`/catalogo/pessoal/${id}`);
};
