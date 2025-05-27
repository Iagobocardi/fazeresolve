const Orcamento = require('../models/orcamento.model');
const Servico = require('../models/servico.model');
const { validationResult, body } = require('express-validator');

const orcamentoValidationRules = [
    body('status').optional().isIn(['Aceito', 'Pendente', 'Rejeitado']).withMessage('Status inválido').trim(),
    body('valorProposto').notEmpty().isNumeric().isFloat({ min: 0 }).withMessage('Valor proposto deve ser um número maior ou igual a zero'),
    body('servico').notEmpty().isMongoId().withMessage('ID de serviço inválido'),
     body('validade').notEmpty().isISO8601().isAfter().withMessage('Data de validade deve ser uma data futura'),
];

// Obtém todos os orçamentos
const getAllOrcamentos = async (req, res) => {
    try {
        const orcamentos = await Orcamento.find().populate('servico');
        res.status(200).json(orcamentos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar orçamentos.' });
    }
};

// Obtém um orçamento por ID
const getOrcamentoById = async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id).populate('servico');
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
        // Verifica se o serviço existe
        const servico = await Servico.findById(req.body.servico);
        if (!servico) {
            return res.status(400).json({ error: 'Serviço não encontrado.' });
        }

        const novoOrcamento = new Orcamento(req.body);
        const orcamentoSalvo = await novoOrcamento.save();
        res.status(201).json(orcamentoSalvo);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar orçamento.' });
    }
};

// Atualiza um orçamento por ID
const updateOrcamento = async (req, res) => {
     const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const orcamentoAtualizado = await Orcamento.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('servico');
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

module.exports = {
    orcamentoValidationRules,
    getAllOrcamentos,
    getOrcamentoById,
    createOrcamento,
    updateOrcamento,
    deleteOrcamento
};