import apiClient from './apiClient';

// Busca os templates de mensagem do WhatsApp
export const getWhatsappTemplates = async () => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.get('/whatsapp/templates', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return data;
};

// Renders a message preview
export const renderPreview = async (previewData) => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.post('/whatsapp/templates/render/preview', previewData, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return data;
};

// Sends a WhatsApp message
export const sendMessage = async (messageData) => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.post('/whatsapp/send-message', messageData, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return data;
};

// Fetches the available template variables
export const getTemplateVariables = async () => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.get('/whatsapp/templates/variables', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return data;
};

// Saves a new WhatsApp template
export const saveTemplate = async (templateData) => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.post('/whatsapp/templates', templateData, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return data;
};

// Agenda o envio de uma mensagem de WhatsApp
export const scheduleMessage = async ({ clienteId, mensagem, dataEnvio }) => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.post('/whatsapp/schedule-message', 
        { clienteId, mensagem, dataEnvio },
        {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );
    return data;
};

// Renderiza um template específico com os dados de um orçamento
export const renderWhatsappTemplate = async (templateId, orcamentoId) => {
    const token = localStorage.getItem('authToken');
    const { data } = await apiClient.get(`/whatsapp/templates/render/${templateId}/${orcamentoId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return data;
};
