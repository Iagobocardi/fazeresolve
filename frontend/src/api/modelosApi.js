import apiClient from './apiClient';

/**
 * Busca todos os modelos de serviço do usuário.
 * @returns {Promise<Object>} A lista de modelos de serviço.
 */
export const getModelos = () => {
  return apiClient.get('/modelos');
};

/**
 * Busca um modelo de serviço específico pelo ID.
 * @param {string} id - O ID do modelo.
 * @returns {Promise<Object>} O modelo de serviço.
 */
export const getModeloById = (id) => {
    return apiClient.get(`/modelos/${id}`);
};

/**
 * Cria um novo modelo de serviço.
 * @param {Object} modeloData - Os dados do novo modelo.
 * @returns {Promise<Object>} O modelo criado.
 */
export const createModelo = (modeloData) => {
  return apiClient.post('/modelos', modeloData);
};

/**
 * Atualiza um modelo de serviço existente.
 * @param {string} id - O ID do modelo a ser atualizado.
 * @param {Object} modeloData - Os dados para atualização.
 * @returns {Promise<Object>} O modelo atualizado.
 */
export const updateModelo = (id, modeloData) => {
  return apiClient.put(`/modelos/${id}`, modeloData);
};

/**
 * Remove um modelo de serviço.
 * @param {string} id - O ID do modelo a ser removido.
 * @returns {Promise<Object>} A resposta da API.
 */
export const deleteModelo = (id) => {
  return apiClient.delete(`/modelos/${id}`);
};
