// Arquivo: src/controllers/whatsapp.controller.js
const whatsappService = require('../services/whatsapp.service');
const axios = require('axios'); // Usaremos Axios para chamadas diretas à API da Meta
const Conta = require('../models/conta.model.js');
const AgendamentoMensagem = require('../models/agendamentoMensagem.model.js');

// --- Funções para o Fluxo OAuth da Meta ---

// 1. Inicia o fluxo de conexão com a Meta
const connectMeta = (req, res) => {
    if (!req.user || !req.user.contaId) {
        return res.status(400).send('Erro: Usuário não associado a uma conta.');
    }

    const state = req.user.contaId; // O state é o nosso ID de conta interno
    const scope = 'whatsapp_business_management,whatsapp_business_messaging';
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.META_REDIRECT_URI}&state=${state}&scope=${scope}&response_type=code`;

    res.redirect(authUrl);
};

// 2. Lida com o callback da Meta
const handleMetaCallback = async (req, res) => {
    const { code, state } = req.query;
    const contaId = state;

    if (!code || !contaId) {
        return res.redirect(`${process.env.FRONTEND_URL}/integrations?whatsapp_auth=error_missing_params`);
    }

    try {
        // Passo 1: Trocar o código por um token de acesso de curta duração
        const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
            params: {
                client_id: process.env.META_APP_ID,
                redirect_uri: process.env.META_REDIRECT_URI,
                client_secret: process.env.META_APP_SECRET,
                code: code
            }
        });

        const shortLivedToken = tokenResponse.data.access_token;
        if (!shortLivedToken) {
            throw new Error('Não foi possível obter o token de acesso de curta duração.');
        }

        // Passo 2: Trocar o token de curta duração por um de longa duração
        const longLivedTokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: process.env.META_APP_ID,
                client_secret: process.env.META_APP_SECRET,
                fb_exchange_token: shortLivedToken
            }
        });

        const longLivedToken = longLivedTokenResponse.data.access_token;
        const expiresIn = longLivedTokenResponse.data.expires_in; // em segundos

        if (!longLivedToken) {
            throw new Error('Não foi possível obter o token de acesso de longa duração.');
        }

        // Passo 3: Usar o token para obter o ID da Conta do WhatsApp Business (WABA) e o ID do número de telefone
        const meResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
            params: {
                fields: 'id,name',
                access_token: longLivedToken
            }
        });

        // A partir do "me", buscamos as contas de negócio associadas
        const accountsResponse = await axios.get(`https://graph.facebook.com/v18.0/${meResponse.data.id}/accounts`, {
            params: {
                access_token: longLivedToken
            }
        });
        
        if (!accountsResponse.data || !accountsResponse.data.data || accountsResponse.data.data.length === 0) {
            throw new Error('Nenhuma página/conta encontrada para este usuário.');
        }

        // Precisamos encontrar a WABA. A forma mais direta pode variar, mas uma abordagem comum
        // é pegar a primeira página e procurar a WABA associada.
        // NOTA: Uma implementação mais robusta permitiria ao usuário escolher qual página/número usar.
        const pageId = accountsResponse.data.data[0].id;
        const pageToken = accountsResponse.data.data[0].access_token; // O token da página pode ser necessário para algumas chamadas

        const wabaInfoResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
            params: {
                fields: 'whatsapp_business_account',
                access_token: pageToken || longLivedToken
            }
        });
        
        const wabaId = wabaInfoResponse.data.whatsapp_business_account.id;
        if (!wabaId) {
            throw new Error('Não foi possível encontrar uma Conta do WhatsApp Business associada a esta página.');
        }

        // Passo 4: Obter os números de telefone associados a essa WABA
        const phoneNumbersResponse = await axios.get(`https://graph.facebook.com/v18.0/${wabaId}/phone_numbers`, {
            params: {
                access_token: longLivedToken
            }
        });

        if (!phoneNumbersResponse.data || !phoneNumbersResponse.data.data || phoneNumbersResponse.data.data.length === 0) {
            throw new Error('Nenhum número de telefone encontrado para esta conta do WhatsApp.');
        }

        // Usaremos o primeiro número de telefone encontrado.
        const phoneNumberId = phoneNumbersResponse.data.data[0].id;
        const senderNumber = phoneNumbersResponse.data.data[0].display_phone_number;

        // Passo 5: Salvar todas as informações na conta do usuário
        await Conta.findByIdAndUpdate(contaId, {
            isWhatsappConnected: true,
            whatsappProvider: 'OAUTH_META',
            whatsappAccessToken: longLivedToken,
            whatsappTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
            whatsappPhoneNumberId: phoneNumberId, // O ID do número para enviar mensagens
            whatsappSender: senderNumber, // O número de telefone visível (ex: +1 555-0100)
        });

        res.redirect(`${process.env.FRONTEND_URL}/integrations?whatsapp_auth=success`);

    } catch (error) {
        console.error('ERRO CRÍTICO no callback do WhatsApp/Meta OAuth:', error.response ? error.response.data : error.message);
        res.redirect(`${process.env.FRONTEND_URL}/integrations?whatsapp_auth=error_critical`);
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
        // Variáveis primárias do novo design
        { key: '{cliente.nome}', description: 'Nome do Cliente', group: 'Cliente' },
        { key: '{orcamento.descricao}', description: 'Descrição do Serviço', group: 'Orçamento' },
        { key: '{orcamento.valorProposto}', description: 'Valor do Orçamento', group: 'Orçamento' },
        { key: '{orcamento.dataValidade}', description: 'Validade da Proposta', group: 'Orçamento' },
        { key: '{agendamento.dataHora}', description: 'Data e Hora Agendada', group: 'Agendamento' },
        { key: '{linkPagamento}', description: 'Link de Pagamento', group: 'Pagamento' },
        
        // Variáveis secundárias/legadas
        { key: '{orcamento.shortId}', description: 'ID Curto do Pedido', group: 'Orçamento' },
        { key: '{orcamento.valorPendente}', description: 'Valor Pendente', group: 'Pagamento' },
        { key: '{cliente.telefone}', description: 'Telefone do Cliente', group: 'Cliente' },
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
    connectMeta,
    handleMetaCallback,
    scheduleMessage
};
