import apiClient from './apiClient';

// Convida um novo membro para a equipe
export const inviteMember = async (memberData) => {
    // memberData: { nome, email, password }
    const { data } = await apiClient.post('/membros', memberData);
    return data;
};

// Remove um membro da equipe
export const removeMember = async (memberId) => {
    const { data } = await apiClient.delete(`/membros/${memberId}`);
    return data;
};
