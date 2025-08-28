const Agendamento = require('../models/agendamento.model');
const Servico = require('../models/servico.model');
const Cliente = require('../models/cliente.model');
const { validationResult, body } = require('express-validator');

const agendamentoValidationRules = [
    body('dataHoraInicio').notEmpty().isISO8601().withMessage('Data e hora de início inválidas'),
    body('dataHoraFim').notEmpty().isISO8601().withMessage('Data e hora de fim inválidas'),
    body('servico').notEmpty().isMongoId().withMessage('ID de serviço inválido'),
    body('cliente').notEmpty().isMongoId().withMessage('ID de cliente inválido'),
    body('observacoes').optional().isString().trim(),
    body().custom((value, { req }) => {
        if (req.body.dataHoraInicio && req.body.dataHoraFim && new Date(req.body.dataHoraFim) <= new Date(req.body.dataHoraInicio)) {
            throw new Error('Data de fim deve ser posterior à data de início');
        }
        return true;
    }),
];

// Obtém todos os agendamentos da conta
const getAllAgendamentos = async (req, res) => {
    try {
        const { contaId } = req.user;
        const agendamentos = await Agendamento.find({ contaId }).populate('servico').populate('cliente');
        res.status(200).json(agendamentos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
    }
};

// Obtém um agendamento por ID
const getAgendamentoById = async (req, res) => {
    try {
        const { contaId } = req.user;
        const agendamento = await Agendamento.findOne({ _id: req.params.id, contaId }).populate('servico').populate('cliente');
        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(agendamento);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar agendamento.' });
    }
};

// Cria um novo agendamento
const createAgendamento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { contaId } = req.user;

        // Verifica se o serviço e o cliente existem E PERTENCEM à conta do usuário
        const servico = await Servico.findOne({ _id: req.body.servico, contaId });
        const cliente = await Cliente.findOne({ _id: req.body.cliente, contaId });

        if (!servico || !cliente) {
            return res.status(400).json({ error: 'Serviço ou cliente não encontrado nesta conta.' });
        }

        const dadosAgendamento = {
            ...req.body,
            contaId: contaId
        };

        const novoAgendamento = new Agendamento(dadosAgendamento);
        const agendamentoSalvo = await novoAgendamento.save();
        res.status(201).json(agendamentoSalvo);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar agendamento.', details: error.message });
    }
};

// Atualiza um agendamento por ID
const updateAgendamento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { contaId } = req.user;
        const agendamentoAtualizado = await Agendamento.findOneAndUpdate(
            { _id: req.params.id, contaId },
            req.body,
            { new: true, runValidators: true }
        ).populate('servico').populate('cliente');

        if (!agendamentoAtualizado) {
            return res.status(404).json({ error: 'Agendamento não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(agendamentoAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar agendamento.' });
    }
};

// Deleta um agendamento por ID
const deleteAgendamento = async (req, res) => {
    try {
        const { contaId } = req.user;
        const agendamentoDeletado = await Agendamento.findOneAndDelete({ _id: req.params.id, contaId });
        if (!agendamentoDeletado) {
            return res.status(404).json({ error: 'Agendamento não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json({ message: 'Agendamento deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar agendamento.' });
    }
};

module.exports = {
    agendamentoValidationRules,
    getAllAgendamentos,
    getAgendamentoById,
    createAgendamento,
    updateAgendamento,
    deleteAgendamento
};