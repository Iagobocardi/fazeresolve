// Arquivo: src/controllers/whatsapp.controller.js
const whatsappService = require('../services/whatsapp.service');

// --- Controller do Webhook (Existente) ---
const handleWhatsAppWebhook = async (req, res) => {
    if (!req.body || !req.body.From) {
        return res.status(200).send('Request ignored: Missing "From" field.');
    }
    try {
        await whatsappService.handleIncomingMessage(req);
        res.status(200).send();
    } catch (error) {
        console.error('[CONTROLLER] ERRO CRÍTICO no Webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};

// --- Controllers do CRUD de Templates ---

const getAllTemplates = async (req, res) => {
    try {
        const { contaId } = req.user; // Extrai contaId do usuário autenticado
        const templates = await whatsappService.findAllTemplates(contaId);
        res.status(200).json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar templates.', error: error.message });
    }
};

const createTemplate = async (req, res) => {
    try {
        const { contaId } = req.user; // Extrai contaId
        const novoTemplate = await whatsappService.createTemplate(req.body, contaId);
        res.status(201).json(novoTemplate);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar template.', error: error.message });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { contaId } = req.user; // Extrai contaId
        const templateAtualizado = await whatsappService.updateTemplate(id, req.body, contaId);
        if (!templateAtualizado) {
            return res.status(404).json({ message: 'Template não encontrado ou não pertence à sua conta.' });
        }
        res.status(200).json(templateAtualizado);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar template.', error: error.message });
    }
};

const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { contaId } = req.user; // Extrai contaId
        const templateDeletado = await whatsappService.deleteTemplate(id, contaId);
        if (!templateDeletado) {
            return res.status(404).json({ message: 'Template não encontrado ou não pertence à sua conta.' });
        }
        res.status(200).json({ message: 'Template deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar template.', error: error.message });
    }
};

// --- Controller de Renderização ---

const renderTemplate = async (req, res) => {
    try {
        const { templateId, orcamentoId } = req.params;
        const resultado = await whatsappService.renderTemplateMessage(templateId, orcamentoId);
        res.status(200).json(resultado);
    } catch (error) {
        // O serviço pode lançar erros específicos que podemos usar
        if (error.name === 'NotFoundError') {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Erro ao renderizar o template.', error: error.message });
    }
};


const getAvailableVariables = (req, res) => {
    const variables = [
        { key: '{{cliente.nome}}', description: 'Nome do cliente' },
        { key: '{{orcamento.shortId}}', description: 'ID curto do pedido' },
        { key: '{{orcamento.descricao}}', description: 'Descrição do serviço' },
        { key: '{{orcamento.valorProposto}}', description: 'Valor total do orçamento' },
        { key: '{{orcamento.valorPendente}}', description: 'Valor pendente de pagamento' },
        { key: '{{orcamento.dataAgendamento}}', description: 'Data do agendamento' },
        { key: '{{desconto}}', description: 'Percentagem de desconto aplicada' },
        { key: '{{valorComDesconto}}', description: 'Valor final com desconto' },
        { key: '{{linkPagamento}}', description: 'Link de pagamento (gerado na hora)' },
    ];
    res.status(200).json(variables);
};

module.exports = {
    handleWhatsAppWebhook,
    getAvailableVariables,
    getAllTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    renderTemplate
};
