import apiClient from './apiClient';

/**
 * Faz o upgrade do plano de assinatura do usuário.
 * @param {string} newPlanName - O nome do novo plano (ex: 'Profissional', 'Premium').
 * @returns {Promise<object>} A resposta da API com os detalhes da atualização.
 */
export const upgradeSubscription = async (newPlanName) => {
  try {
    const { data } = await apiClient.post('/subscriptions/upgrade', { newPlanName });
    return data;
  } catch (error) {
    // Lança o erro para ser tratado no componente que chama a função
    throw error.response?.data || new Error('Erro desconhecido ao tentar fazer o upgrade do plano.');
  }
};
