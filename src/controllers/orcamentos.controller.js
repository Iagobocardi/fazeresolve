// Arquivo: src/controllers/orcamentos.controller.js

const Orcamento = require('../models/orcamento.model');
const { validationResult, body } = require('express-validator');
const { sendWhatsAppMessage } = require('../services/whatsapp.service');

// Regras de validação (podem ser expandidas)
const orcamentoValidationRules = () => {
    return [
        body('status').optional().isIn(['Pendente', 'Aceito', 'Rejeitado', 'Agendado', 'Finalizado']).withMessage('Status inválido').trim(),
        // Adicione outras regras de validação conforme necessário
    ];
};

// Obtém todos os orçamentos
const getAllOrcamentos = async (req, res) => {
    try {
        // CORREÇÃO APLICADA AQUI
        const orcamentos = await Orcamento.find()
            .populate('cliente', 'nome telefone') // Agora busca o nome E o telefone
            .sort({ data: -1 });
        res.status(200).json(orcamentos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar orçamentos.' });
    }
};

// Obtém um orçamento por ID
const getOrcamentoById = async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id).populate('cliente', 'nome');
        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }
        res.status(200).json(orcamento);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar orçamento.' });
    }
};

// Cria um novo orçamento
const createOrcamento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const novoOrcamento = new Orcamento(req.body);
        const orcamentoSalvo = await novoOrcamento.save();
        res.status(201).json(orcamentoSalvo);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar orçamento.' });
    }
};

// Atualiza um orçamento por ID
const updateOrcamento = async (req, res) => {
    try {
        const orcamentoAtualizado = await Orcamento.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!orcamentoAtualizado) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }
        res.status(200).json(orcamentoAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar orçamento.' });
    }
};

// Deleta um orçamento por ID
const deleteOrcamento = async (req, res) => {
    try {
        const orcamentoDeletado = await Orcamento.findByIdAndDelete(req.params.id);
        if (!orcamentoDeletado) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }
        res.status(200).json({ message: 'Orçamento deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar orçamento.' });
    }
};

// Função para buscar os últimos pedidos para o dashboard
const getRecentOrcamentos = async (req, res) => {
    try {
        // CORREÇÃO APLICADA AQUI
        const orcamentos = await Orcamento.find()
            .populate('cliente', 'nome telefone') // Agora busca o nome E o telefone
            .sort({ data: -1 })
            .limit(10);
        res.status(200).json(orcamentos);
    } catch (error) {
        console.error("ERRO DETALHADO em getRecentOrcamentos:", error);
        res.status(500).json({ message: 'Erro interno ao buscar orçamentos recentes', error: error.message });
    }
};

// Função para atualizar apenas o status de um orçamento
// Encontre a sua função 'updateOrcamentoStatus' e substitua-a por esta versão:
const updateOrcamentoStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatus = ['Pendente', 'Aceito', 'Agendado', 'Finalizado', 'Rejeitado'];
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({ error: 'Status inválido fornecido.' });
        }
        const updateData = { status };
        if (status === 'Finalizado') {
            updateData.dataFinalizacao = new Date();
        }
        const orcamento = await Orcamento.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }
        res.status(200).json(orcamento);
    } catch (error) {
        console.error("ERRO em updateOrcamentoStatus:", error);
        res.status(500).json({ error: 'Erro ao atualizar status do orçamento.' });
    }
};
// Adicione esta nova função ao seu ficheiro:
const submitOrcamento = async (req, res) => {
    try {
        const { valorProposto } = req.body;
        if (!valorProposto || isNaN(valorProposto) || valorProposto <= 0) {
            return res.status(400).json({ error: 'Valor do orçamento é obrigatório e deve ser um número positivo.' });
        }

        const orcamento = await Orcamento.findById(req.params.id).populate('cliente');
        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }

        orcamento.status = 'Aceito';
        // ===============================================================
        // CORREÇÃO APLICADA AQUI
        // Garantimos que o valor é salvo como um número na base de dados.
        // ===============================================================
        orcamento.valorProposto = parseFloat(valorProposto);
        await orcamento.save();

        // Envia a notificação para o cliente
        const notificationMessage = `Boas notícias, ${orcamento.cliente.nome}! O seu orçamento para o pedido #${orcamento.shortId} está pronto.\n\n*Valor:* R$ ${orcamento.valorProposto.toFixed(2)}\n\nPara aprovar, entre em contato connosco.`;
        await sendWhatsAppMessage(orcamento.cliente.telefone, notificationMessage);

        res.status(200).json(orcamento);
    } catch (error) {
        console.error("ERRO em submitOrcamento:", error);
        res.status(500).json({ error: 'Erro ao submeter o orçamento.' });
    }
};
const scheduleOrcamento = async (req, res) => {
    try {
        const { dataAgendamento } = req.body;
        if (!dataAgendamento) {
            return res.status(400).json({ error: 'A data de agendamento é obrigatória.' });
        }

        const orcamento = await Orcamento.findByIdAndUpdate(
            req.params.id,
            { status: 'Agendado', dataAgendamento: dataAgendamento },
            { new: true }
        ).populate('cliente');

        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }

        // Notifica o cliente
        const notificationMessage = `🗓️ Agendamento Atualizado! O seu serviço para "${orcamento.descricao.slice(0, 20)}..." foi agendado para *${dataAgendamento}*.`;
        // Assumindo que você exportou a função de envio do whatsapp.service
        // const { sendWhatsAppMessage } = require('../services/whatsapp.service');
        // await sendWhatsAppMessage(orcamento.cliente.telefone, notificationMessage);

        res.status(200).json(orcamento);
    } catch (error) {
        console.error("ERRO em scheduleOrcamento:", error);
        res.status(500).json({ error: 'Erro ao agendar o serviço.' });
    }
};

// Exporta TODAS as funções que as rotas utilizam.
module.exports = {
    orcamentoValidationRules,
    getAllOrcamentos,
    getOrcamentoById,
    createOrcamento,
    updateOrcamento,
    deleteOrcamento,
    getRecentOrcamentos,
    updateOrcamentoStatus,  
    submitOrcamento,
    scheduleOrcamento
};