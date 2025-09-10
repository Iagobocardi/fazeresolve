// Arquivo: src/controllers/whatsapp.controller.js
const whatsappService = require('../services/whatsapp.service');
const { google } = require('googleapis'); // Usado para a estrutura do cliente OAuth2
const Conta = require('../models/conta.model.js');
const { encrypt } = require('../services/crypto.service.js'); // Assumindo que o crypto service não precisa de 'decrypt' aqui
const AgendamentoMensagem = require('../models/agendamentoMensagem.model.js');

// --- Novas Funções para o Fluxo OAuth ---

// O cliente OAuth2 para a API do WhatsApp/Meta.
const whatsappOauthClient = new google.auth.OAuth2(
    process.env.WHATSAPP_CLIENT_ID,
    process.env.WHATSAPP_CLIENT_SECRET,
    `${process.env.API_URL}/api/whatsapp/callback`
);

// 1. Inicia o fluxo de conexão
const connectWhatsapp = (req, res) => {
    if (!req.user || !req.user.contaId) {
        return res.status(400).send('Erro: Utilizador não associado a uma conta.');
    }
    const scopes = ['whatsapp_business_management', 'whatsapp_business_messaging'];
    const state = JSON.stringify({ contaId: req.user.contaId });
    const url = whatsappOauthClient.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: state
    });
    res.redirect(url);
};

// 2. Lida com o callback do provedor OAuth
const handleWhatsappCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code) {
            return res.redirect(`${process.env.FRONTEND_URL}/configuracoes?whatsapp_auth=error_no_code`);
        }

        const { tokens } = await whatsappOauthClient.getToken(code);
        
        const { contaId } = JSON.parse(state);
        if (!contaId) {
            return res.redirect(`${process.env.FRONTEND_URL}/configuracoes?whatsapp_auth=error_no_state`);
        }

        await Conta.findByIdAndUpdate(contaId, {
            isWhatsappConnected: true,
            whatsappProvider: 'OAUTH_META',
            whatsappAccessToken: tokens.access_token,
            whatsappRefreshToken: tokens.refresh_token,
            whatsappTokenExpiresAt: new Date(Date.now() + (tokens.expiry_date * 1000)),
        });
        
        res.redirect(`${process.env.FRONTEND_URL}/configuracoes?whatsapp_auth=success`);

    } catch (error) {
        console.error('ERRO CRÍTICO no callback do WhatsApp OAuth:', error);
        res.redirect(`${process.env.FRONTEND_URL}/configuracoes?whatsapp_auth=error_critical`);
    }
};


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

const renderPreview = async (req, res) => {
    try {
        const { mensagem, orcamentoId } = req.body;
        const { contaId } = req.user;

        if (!mensagem || !orcamentoId) {
            return res.status(400).json({ message: 'Os campos "mensagem" e "orcamentoId" são obrigatórios.' });
        }

        const mensagemRenderizada = await whatsappService.renderPreview(mensagem, orcamentoId, contaId);
        res.status(200).json({ preview: mensagemRenderizada });

    } catch (error) {
        if (error.name === 'NotFoundError') {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Erro ao renderizar o preview.', error: error.message });
    }
};

// --- Nova Função para Agendamento ---
const scheduleMessage = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { clienteId, mensagem, dataEnvio } = req.body;

        if (!clienteId || !mensagem || !dataEnvio) {
            return res.status(400).json({ message: 'clienteId, mensagem e dataEnvio são obrigatórios.' });
        }

        const agendamento = await AgendamentoMensagem.create({
            contaId,
            clienteId,
            mensagem,
            dataEnvio
        });

        res.status(201).json({ message: 'Mensagem agendada com sucesso!', agendamento });
    } catch (error) {
        console.error('Erro ao agendar mensagem:', error);
        res.status(500).json({ message: 'Erro interno ao agendar mensagem.' });
    }
};


module.exports = {
    handleWhatsAppWebhook,
    getAvailableVariables,
    getAllTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    renderTemplate,
    renderPreview,
    connectWhatsapp,
    handleWhatsappCallback,
    scheduleMessage
};
