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

// Obtém todos os serviços
const getAllServicos = async (req, res) => {
    try {
        const servicos = await Servico.find().populate('cliente');
        res.status(200).json(servicos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar serviços.' });
    }
};

// Obtém um serviço por ID
const getServicoById = async (req, res) => {
    try {
        const servico = await Servico.findById(req.params.id).populate('cliente');
        if (!servico) {
            return res.status(404).json({ error: 'Serviço não encontrado.' });
        }
        res.status(200).json(servico);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar serviço.' });
    }
};

// Cria um novo serviço
const createServico = async (req, res) => {
    // A validação agora será aplicada pela rota antes de chamar este controller
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const cliente = await Cliente.findById(req.body.cliente);
        if (!cliente) {
            return res.status(400).json({ error: 'Cliente não encontrado.' });
        }

        const novoServico = new Servico(req.body);
        const servicoSalvo = await novoServico.save();
        
        // Atualiza o histórico de serviços do cliente
        cliente.historicoServicos.push(servicoSalvo._id);
        await cliente.save();

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
        const servicoAtualizado = await Servico.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('cliente');

        if (!servicoAtualizado) {
            return res.status(404).json({ error: 'Serviço não encontrado.' });
        }
        res.status(200).json(servicoAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar serviço.' });
    }
};

// Deleta um serviço por ID
const deleteServico = async (req, res) => {
    try {
        const servicoDeletado = await Servico.findByIdAndDelete(req.params.id);
        if (!servicoDeletado) {
            return res.status(404).json({ error: 'Serviço não encontrado.' });
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