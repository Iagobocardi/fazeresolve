import apiClient from './apiClient';

// Busca as configurações de pagamento do prestador
export const getPaymentSettings = async () => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.get('/provider/payment-settings', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return data;
};

// Atualiza as configurações de pagamento do prestador
export const updatePaymentSettings = async (settings) => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.put('/provider/payment-settings', settings, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return data;
};

// Inicia o fluxo de conexão com o Mercado Pago
export const connectMercadoPago = async (accountId) => {
    const { data } = await apiClient.post('/provider/connect-mercadopago', { accountId });
    return data;
};

// Busca os dados da empresa para NF-e
export const getCompanyInfo = async () => {
    const { data } = await apiClient.get('/provider/company-info');
    return data;
};

// Atualiza os dados da empresa para NF-e
export const updateCompanyInfo = async (companyData) => {
    const { data } = await apiClient.put('/provider/company-info', companyData);
    return data;
};

// Busca os detalhes da conta do prestador
export const getAccountDetails = async () => {
    const { data } = await apiClient.get('/provider/account-details');
    return data;
};

// Cancela a assinatura do prestador
export const cancelSubscription = async () => {
    const { data } = await apiClient.post('/subscriptions/cancel');
    return data;
};
