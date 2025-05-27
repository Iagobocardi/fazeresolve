const Cliente = require('../models/cliente.model');
const Servico = require('../models/servico.model');
const { validationResult, body } = require('express-validator');

// Função para validar os dados do cliente
const clienteValidationRules = [
    body('nome').notEmpty().withMessage('Nome é obrigatório').trim(),
    body('telefone').notEmpty().withMessage('Telefone é obrigatório').isMobilePhone('pt-BR').withMessage('Telefone inválido').trim(),
    body('localizacao.latitude').optional().isNumeric().withMessage('Latitude deve ser numérica'),
    body('localizacao.longitude').optional().isNumeric().withMessage('Longitude deve ser numérica'),
];

// Obtém todos os clientes
const getAllClientes = async (req, res) => {
    try {
        const clientes = await Cliente.find().populate('historicoServicos');
        res.status(200).json(clientes);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar clientes.' });
    }
};

// Obtém um cliente por ID
const getClienteById = async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id).populate('historicoServicos');
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json(cliente);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cliente.' });
    }
};

// Cria um novo cliente
const createCliente = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const novoCliente = new Cliente(req.body);
        const clienteSalvo = await novoCliente.save();
        res.status(201).json(clienteSalvo);
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ error: 'Telefone já cadastrado.' });
        } else {
            res.status(500).json({ error: 'Erro ao criar cliente.' });
        }
    }
};

// Atualiza um cliente por ID
const updateCliente = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const clienteAtualizado = await Cliente.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!clienteAtualizado) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json(clienteAtualizado);
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ error: 'Telefone já cadastrado.' });
        } else {
            res.status(500).json({ error: 'Erro ao atualizar cliente.' });
        }
    }
};

// Deleta um cliente por ID
const deleteCliente = async (req, res) => {
    try {
        const clienteDeletado = await Cliente.findByIdAndDelete(req.params.id);
        if (!clienteDeletado) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json({ message: 'Cliente deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar cliente.' });
    }
};

// Obtém o histórico de serviços de um cliente
const getClienteHistoricoServicos = async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id).populate('historicoServicos');
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json(cliente.historicoServicos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar histórico de serviços do cliente.' });
    }
};

module.exports = {
    clienteValidationRules,
    getAllClientes,
    getClienteById,
    createCliente,
    updateCliente,
    deleteCliente,
    getClienteHistoricoServicos,
};