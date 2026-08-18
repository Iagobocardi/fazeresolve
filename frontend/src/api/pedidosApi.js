// src/api/pedidosApi.js
import apiClient from './apiClient'; // Importa o apiClient

export const getOrcamentos = async (status = null) => {
    const token = localStorage.getItem('authToken');
    const params = status ? { status } : {};
    const { data } = await apiClient.get('/orcamentos', {
        headers: { 'Authorization': `Bearer ${token}` },
        params,
    });
    return data;
};

export const getOrcamento = async (id) => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.get(`/orcamentos/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    return data;
};

// Função para apagar um pedido (já existente)
export const deletePedido = async (pedidoId) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.delete(`/orcamentos/${pedidoId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return data;
    } catch (error) {
        // Lança um erro mais descritivo para ser capturado pelo useMutation
        throw new Error(error.response?.data?.message || 'Falha ao excluir o pedido.');
    }
};

// --- FUNÇÕES REATORADAS ---

// Função para atualizar o status de um pedido
export const updatePedidoStatus = async ({ pedidoId, newStatus }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.patch(`/orcamentos/${pedidoId}/status`, { status: newStatus }, { headers: { 'Authorization': `Bearer ${token}` } });
        return data;
    } catch (error) {
        // Lança um erro mais descritivo
        throw new Error(error.response?.data?.message || 'Falha ao atualizar o status do pedido.');
    }
};

// Função para agendar um pedido
export const agendarPedido = async ({ pedidoId, dataAgendamento, periodo }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.patch(`/orcamentos/${pedidoId}/schedule`, { dataAgendamento, periodo }, { headers: { 'Authorization': `Bearer ${token}` } });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao agendar o pedido.');
    }
};

// Função para submeter/atualizar um orçamento
export const submitOrcamento = async ({ pedidoId, valorProposto }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.patch(`/orcamentos/${pedidoId}/submit`, { valorProposto }, { headers: { 'Authorization': `Bearer ${token}` } });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao enviar o orçamento.');
    }
};

// Função para marcar um pedido como pago
export const marcarComoPago = async (pedidoId) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.post(`/orcamentos/${pedidoId}/marcar-pago`, {}, { headers: { 'Authorization': `Bearer ${token}` } });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Não foi possível marcar o pedido como pago.');
    }
};

// Função para adicionar um pagamento a um pedido
export const addPagamento = async ({ pedidoId, paymentData }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.post(`/orcamentos/${pedidoId}/pagamentos`, paymentData, { headers: { 'Authorization': `Bearer ${token}` } });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Não foi possível adicionar o pagamento.');
    }
};

// Pode adicionar aqui outras funções de API (schedule, addMaterial, etc.) no futuro

export const uploadFilePedido = async ({ pedidoId, formData }) => {
    try {
        // O interceptor do apiClient já adiciona o token de autorização.
        // Definir Content-Type como undefined remove o padrão 'application/json' do apiClient
        // e permite que o navegador defina o 'multipart/form-data' com o boundary correto.
        const { data } = await apiClient.post(`/orcamentos/${pedidoId}/upload-foto`, formData, {
            headers: {
                'Content-Type': undefined,
            },
        });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao enviar o ficheiro.');
    }
};

export const deleteFotoPedido = async ({ pedidoId, fotoId }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.delete(`/orcamentos/${pedidoId}/fotos/${fotoId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao excluir a foto.');
    }
};

export const deleteFotoPedidoCliente = async ({ pedidoId, fotoId }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.delete(`/portal-cliente/pedidos/${pedidoId}/fotos/${fotoId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao excluir a foto.');
    }
};

export const uploadFotoPedidoCliente = async ({ pedidoId, formData }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.post(`/portal-cliente/pedidos/${pedidoId}/upload-foto`, formData, {
            headers: { 
                'Authorization': `Bearer ${token}`
            },
        });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao enviar a foto.');
    }
};

export const uploadDocumentoPedido = async ({ pedidoId, formData }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.post(`/orcamentos/${pedidoId}/upload-documento`, formData, {
            headers: { 
                'Authorization': `Bearer ${token}`
            },
        });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao enviar o documento.');
    }
};

export const createDraftOrcamento = async (clienteData) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.post('/orcamentos', { clienteData }, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao criar o rascunho do pedido.');
    }
};

export const updateOrcamento = async ({ orcamentoId, orcamentoData }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.put(`/orcamentos/${orcamentoId}`, orcamentoData, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao atualizar o pedido.');
    }
};

export const addMaterialToOrcamento = async ({ orcamentoId, materialData }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.post(`/orcamentos/${orcamentoId}/materiais`, materialData, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao adicionar material ao pedido.');
    }
};

export const deleteMaterialFromOrcamento = async ({ orcamentoId, materialId }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.delete(`/orcamentos/${orcamentoId}/materiais/${materialId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao remover material do pedido.');
    }
};

export const updateMaterialInOrcamento = async ({ orcamentoId, materialId, materialData }) => {
    const token = localStorage.getItem('authToken');
    try {
        const { data } = await apiClient.patch(`/orcamentos/${orcamentoId}/materiais/${materialId}`, materialData, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao atualizar o material do pedido.');
    }
};

export const getPortalLink = async (orcamentoId) => {
    const token = localStorage.getItem('token_fazeresolve');
    try {
        const { data } = await apiClient.get(`/orcamentos/${orcamentoId}/portal-link`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Falha ao gerar o link do portal.');
    }
};
