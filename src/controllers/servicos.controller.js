const Servico = require('../models/servico.model');
const Cliente = require('../models/cliente.model');
// IMPORTAÇÃO CORRETA do 'body' e 'validationResult' de 'express-validator'
const { body, validationResult } = require('express-validator');

// Regras de validação para o serviço
const servicoValidationRules = [
    body('tipoServico')
        .notEmpty().withMessage('Tipo de serviço é obrigatório').trim(),

    // CORREÇÃO: Usando isFloat para aceitar valores decimais (ex: 250.50)
    body('valorServico')
        .notEmpty().withMessage('Valor do serviço é obrigatório')
        .isFloat({ min: 0 }).withMessage('Valor deve ser um número maior ou igual a zero'),

    body('status')
        .optional().isIn(['Aberto', 'Em Progresso', 'Concluído']).withMessage('Status inválido').trim(),

    // CORREÇÃO: isMongoId para validar o ID do cliente
    body('cliente')
        .notEmpty().withMessage('Cliente é obrigatório')
        .isMongoId().withMessage('ID de cliente inválido'),

    body('dataConclusao')
        .optional().isISO8601().withMessage('Data de conclusão inválida'),
];

// Obtém todos os serviços de uma conta
const getAllServicos = async (req, res) => {
    try {
        const { contaId } = req.user;
        const servicos = await Servico.find({ contaId }).populate('cliente', 'nome');
        res.status(200).json(servicos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar serviços.' });
    }
};

// Obtém um serviço por ID, garantindo que pertence à conta
const getServicoById = async (req, res) => {
    try {
        const { contaId } = req.user;
        const servico = await Servico.findOne({ _id: req.params.id, contaId }).populate('cliente', 'nome');
        if (!servico) {
            return res.status(404).json({ error: 'Serviço não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(servico);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar serviço.' });
    }
};

// Cria um novo serviço
const createServico = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { contaId } = req.user;
        // Verifica se o cliente pertence à mesma conta
        const cliente = await Cliente.findOne({ _id: req.body.cliente, contaId });
        if (!cliente) {
            return res.status(400).json({ error: 'Cliente não encontrado ou não pertence a esta conta.' });
        }

        const dadosServico = {
            ...req.body,
            contaId: contaId // Garante que o serviço é associado à conta do usuário logado
        };

        const novoServico = new Servico(dadosServico);
        const servicoSalvo = await novoServico.save();
        
        res.status(201).json(servicoSalvo);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar serviço.' });
    }
};

// Atualiza um serviço por ID
const updateServico = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { contaId } = req.user;
        const servicoAtualizado = await Servico.findOneAndUpdate(
            { _id: req.params.id, contaId }, // Garante que só pode atualizar serviços da própria conta
            req.body,
            { new: true, runValidators: true }
        ).populate('cliente', 'nome');

        if (!servicoAtualizado) {
            return res.status(404).json({ error: 'Serviço não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(servicoAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar serviço.' });
    }
};

// Deleta um serviço por ID
const deleteServico = async (req, res) => {
    try {
        const { contaId } = req.user;
        const servicoDeletado = await Servico.findOneAndDelete({ _id: req.params.id, contaId });
        if (!servicoDeletado) {
            return res.status(404).json({ error: 'Serviço não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json({ message: 'Serviço deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar serviço.' });
    }
};

module.exports = {
    servicoValidationRules,
    getAllServicos,
    getServicoById,
    createServico,
    updateServico,
    deleteServico
};
