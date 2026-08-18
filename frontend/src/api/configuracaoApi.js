// src/api/configuracaoApi.js
import apiClient from './apiClient';

// Função para buscar a configuração atual
export const getConfiguracao = async () => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.get('/configuracoes', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return data;
};

// Função para atualizar a configuração
export const updateConfiguracao = async (configData) => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.put('/configuracoes', configData, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return data;
};

// Busca as configurações públicas (como links de indicação)
export const getPublicConfig = async () => {
    const { data } = await apiClient.get('/public/configuracoes');
    return data;
};

// Salva e valida o token da Focus NFe
export const saveFocusNFeToken = async (tokenData) => {
    const authToken = localStorage.getItem('authToken');
    const { data } = await apiClient.post('/focusnfe/token', tokenData, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return data;
};

// Remove o token da Focus NFe
export const deleteFocusNFeToken = async () => {
    const authToken = localStorage.getItem('authToken');
    const { data } = await apiClient.delete('/focusnfe/token', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return data;
};
