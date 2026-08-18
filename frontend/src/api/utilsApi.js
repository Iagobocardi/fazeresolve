import apiClient from './apiClient';

/**
 * Fetches address information from a given CEP (postal code).
 * @param {string} cep The CEP to look up.
 * @returns {Promise<object>} A promise that resolves to the address data.
 * @throws {Error} Throws an error if the CEP is invalid or not found.
 */
export const fetchAddressByCep = async (cep) => {
    // The backend handles CEP cleaning, but we can do a basic check here.
    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) {
        throw new Error('CEP inválido. O CEP deve conter 8 dígitos.');
    }

    try {
        const { data } = await apiClient.get(`/utils/cep/${cleanedCep}`);
        return data;
    } catch (error) {
        if (error.response) {
            // Re-throw with the error message from the API
            throw new Error(error.response.data.message || 'Erro ao buscar CEP.');
        }
        // For network errors or other issues
        throw new Error('Falha na comunicação com o servidor de CEP.');
    }
};

/**
 * Fetches a market price estimation for a given material description.
 * @param {string} descricao The description of the item to estimate.
 * @returns {Promise<object>} A promise that resolves to the estimation data.
 * @throws {Error} Throws an error if the estimation fails.
 */
export const estimarCusto = async (descricao) => {
    if (!descricao || descricao.trim() === '') {
        throw new Error('A descrição não pode estar vazia.');
    }

    try {
        const { data } = await apiClient.post('/utils/estimar-custo', { descricao });
        return data;
    } catch (error) {
        if (error.response) {
            throw new Error(error.response.data.message || 'Nenhum preço encontrado para este item.');
        }
        throw new Error('Falha na comunicação com o serviço de estimativa.');
    }
};

export const calcularPreco = async (calculationData) => {
    try {
        const { data } = await apiClient.post('/utils/calcular-preco', calculationData);
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao calcular o preço.');
    }
};

/**
 * Calcula os custos de um orçamento com base em um modelo de serviço.
 * @param {Object} calculoData - Os dados para o cálculo, incluindo modeloId e parâmetros.
 * @returns {Promise<Object>} A promise que resolve para os dados calculados.
 */
export const calcularPorModelo = async (calculoData) => {
    try {
        const { data } = await apiClient.post('/orcamentos/calcular-por-modelo', calculoData);
        return data.data; // A resposta da API está aninhada em um campo "data"
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao calcular usando o modelo.');
    }
};
