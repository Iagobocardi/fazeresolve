import apiClient from './apiClient';

export const getInvoices = async () => {
    const { data } = await apiClient.get('/invoices');
    return data;
};

export const getInvoice = async (id) => {
    const { data } = await apiClient.get(`/invoices/${id}`);
    return data;
};

export const createInvoice = async (invoiceData) => {
    const { data } = await apiClient.post('/invoices', invoiceData);
    return data;
};

export const updateInvoice = async (id, invoiceData) => {
    const { data } = await apiClient.put(`/invoices/${id}`, invoiceData);
    return data;
};

export const emitInvoice = async (id) => {
    const { data } = await apiClient.post(`/invoices/${id}/emitir`);
    return data;
};
