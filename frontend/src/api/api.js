import apiClient from './apiClient';

export const fetchClients = async (searchTerm) => {
    if (!searchTerm) return [];
    const { data } = await apiClient.get(`/clientes?search=${searchTerm}`);
    return data;
};

export const fetchProducts = async () => {
    const { data } = await apiClient.get('/produtos');
    return data;
};
