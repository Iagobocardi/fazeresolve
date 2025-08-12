// src/controllers/public.controller.js

const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');

const { validationResult } = require('express-validator');

const registerProvider = async (req, res) => {
    // Lida com os erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { nome, email, telefone, password, plano } = req.body;

        // Checa se o utilizador já existe
        const existingUser = await Cliente.findOne({ $or: [{ email: email }, { telefone: telefone }] });
        if (existingUser) {
            return res.status(409).json({ message: 'Um utilizador com este email ou telefone já existe.' });
        }

        // Cria o novo prestador
        const novoPrestador = new Cliente({
            nome,
            email,
            telefone,
            password, // O pre-save hook no modelo irá encriptar
            plano,
            role: 'PRESTADOR' // Define a função como PRESTADOR
        });

        await novoPrestador.save();

        // Remove a senha do objeto antes de o enviar de volta
        const prestadorParaRetornar = novoPrestador.toObject();
        delete prestadorParaRetornar.password;

        res.status(201).json({ message: 'Prestador registado com sucesso!', usuario: prestadorParaRetornar });

    } catch (error) {
        console.error("Erro ao registrar novo prestador:", error);
        res.status(500).json({ message: 'Ocorreu um erro interno ao tentar registar o prestador.' });
    }
};

const getPedidoByPublicId = async (req, res) => {
    try {
        const pedido = await Orcamento.findOne({ publicId: req.params.publicId }).populate('cliente', 'nome');
        if (!pedido) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        res.status(200).json(pedido);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar o pedido.' });
    }
};

const aprovarOrcamentoPublico = async (req, res) => {
    try {
        const orcamento = await Orcamento.findOne({ publicId: req.params.publicId });
        if (!orcamento || orcamento.status !== 'Pendente') {
            return res.status(400).json({ message: 'Este orçamento não pode ser aprovado.' });
        }

        orcamento.status = 'Aceito';
        orcamento.historico.push({ evento: 'Orçamento aprovado pelo cliente via link público.' });
        await orcamento.save();
        res.status(200).json({ message: 'Orçamento aprovado com sucesso!', orcamento });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao aprovar o orçamento.' });
    }
};

const rejeitarOrcamentoPublico = async (req, res) => {
    try {
        const orcamento = await Orcamento.findOne({ publicId: req.params.publicId });
        if (!orcamento || orcamento.status !== 'Pendente') {
            return res.status(400).json({ message: 'Este orçamento não pode ser rejeitado.' });
        }

        orcamento.status = 'Rejeitado';
        orcamento.historico.push({ evento: 'Orçamento rejeitado pelo cliente via link público.' });
        await orcamento.save();
        res.status(200).json({ message: 'Orçamento rejeitado com sucesso.', orcamento });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao rejeitar o orçamento.' });
    }
};

const sugerirAgendamentoPublico = async (req, res) => {
    try {
        const { dataSugerida } = req.body;
        const orcamento = await Orcamento.findOne({ publicId: req.params.publicId });
        
        if (!orcamento || !['Aceito', 'Agendado'].includes(orcamento.status)) {
            return res.status(400).json({ message: 'Não é possível sugerir um agendamento para este pedido agora.' });
        }

        orcamento.sugestaoAgendamentoCliente = dataSugerida;
        const isReagendamento = orcamento.status === 'Agendado';
        orcamento.historico.push({
            evento: isReagendamento
                ? `Cliente solicitou reagendamento via link público para: ${dataSugerida}`
                : `Cliente sugeriu agendamento via link público para: ${dataSugerida}`
        });
        await orcamento.save();
        res.status(200).json({ message: 'Sugestão de agendamento enviada com sucesso.', orcamento });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao enviar sugestão de agendamento.' });
    }
};

// --- CORREÇÃO APLICADA AQUI ---
// O module.exports agora exporta apenas as funções que existem neste ficheiro.
module.exports = {
    getPedidoByPublicId,
    aprovarOrcamentoPublico,
    rejeitarOrcamentoPublico,
    sugerirAgendamentoPublico,
    registerProvider,
};
