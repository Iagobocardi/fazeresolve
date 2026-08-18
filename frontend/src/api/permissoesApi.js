import apiClient from './apiClient';

export const getAvailablePermissions = async () => {
    const authToken = localStorage.getItem('authToken');
    const { data } = await apiClient.get('/permissoes/disponiveis', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return data;
};

export const updateMemberPermissions = async ({ memberId, permissoes }) => {
    const authToken = localStorage.getItem('authToken');
    const body = { permissoes };

    const { data } = await apiClient.put(`/permissoes/membros/${memberId}/permissions`, body, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });

    return data;
};
