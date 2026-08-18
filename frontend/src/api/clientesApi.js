import apiClient from './apiClient';

export const getClientes = async (search = '') => {
  try {
    let url = '/clientes';
    if (search) {
      url += `?search=${encodeURIComponent(search)}`;
    }
    const { data } = await apiClient.get(url);
    return data;
  } catch (error) {
    throw error;
  }
};

export const createCliente = async (clienteData) => {
  try {
    const { data } = await apiClient.post('/clientes', clienteData);
    return data;
  } catch (error) {
    throw error;
  }
};

export const getHistoricoServicos = async () => {
  try {
    const { data } = await apiClient.get('/clientes/historico');
    return data;
  } catch (error) {
    throw error;
  }
};

export const fetchClienteDetails = async (id) => {
  try {
    const { data } = await apiClient.get(`/clientes/${id}`);
    return data;
  } catch (error) {
    throw error;
  }
};
