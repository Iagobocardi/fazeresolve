const Financeiro = require('../models/financeiro.model');
const Servico = require('../models/servico.model');
const { validationResult, body } = require('express-validator');

const financeiroValidationRules = [
    body('valorRecebido').notEmpty().isNumeric().isFloat({ min: 0 }).withMessage('Valor recebido deve ser um número maior ou igual a zero'),
    body('formaPagamento').notEmpty().isString().trim().withMessage('Forma de pagamento é obrigatória'),
    body('taxaAplicada').optional().isNumeric().isFloat({ min: 0 }).withMessage('Taxa aplicada deve ser um número maior ou igual a zero'),
    body('servico').notEmpty().isMongoId().withMessage('ID de serviço inválido'),
];

// Obtém todos os registros financeiros da conta
const getAllFinanceiro = async (req, res) => {
    try {
        const { contaId } = req.user;
        const registros = await Financeiro.find({ contaId }).populate('servico');
        res.status(200).json(registros);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar registros financeiros.' });
    }
};

// Obtém um registro financeiro por ID
const getFinanceiroById = async (req, res) => {
    try {
        const { contaId } = req.user;
        const registro = await Financeiro.findOne({ _id: req.params.id, contaId }).populate('servico');
        if (!registro) {
            return res.status(404).json({ error: 'Registro financeiro não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(registro);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar registro financeiro.' });
    }
};

// Cria um novo registro financeiro
const createFinanceiro = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { contaId } = req.user;

        // Verifica se o serviço existe E PERTENCE à conta do usuário
        const servico = await Servico.findOne({ _id: req.body.servico, contaId });
        if (!servico) {
            return res.status(400).json({ error: 'Serviço não encontrado nesta conta.' });
        }

        const dadosFinanceiro = {
            ...req.body,
            contaId: contaId
        };

        const novoFinanceiro = new Financeiro(dadosFinanceiro);
        const registroSalvo = await novoFinanceiro.save();
        res.status(201).json(registroSalvo);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar registro financeiro.' });
    }
};

// Atualiza um registro financeiro por ID
const updateFinanceiro = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { contaId } = req.user;
        const registroAtualizado = await Financeiro.findOneAndUpdate(
            { _id: req.params.id, contaId },
            req.body,
            { new: true, runValidators: true }
        ).populate('servico');

        if (!registroAtualizado) {
            return res.status(404).json({ error: 'Registro financeiro não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(registroAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar registro financeiro.' });
    }
};

// Deleta um registro financeiro por ID
const deleteFinanceiro = async (req, res) => {
    try {
        const { contaId } = req.user;
        const registroDeletado = await Financeiro.findOneAndDelete({ _id: req.params.id, contaId });
        if (!registroDeletado) {
            return res.status(404).json({ error: 'Registro financeiro não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json({ message: 'Registro financeiro deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar registro financeiro.' });
    }
};

module.exports = {
    financeiroValidationRules,
    getAllFinanceiro,
    getFinanceiroById,
    createFinanceiro,
    updateFinanceiro,
    deleteFinanceiro
};
