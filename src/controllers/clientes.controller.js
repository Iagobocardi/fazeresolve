// Arquivo: src/controllers/clientes.controller.js

const Cliente = require('../models/cliente.model');

// --- 1. Listar todos os clientes ---
const listarClientes = async (req, res, next) => {
    try {
        const clientes = await Cliente.find();
        res.status(200).json(clientes);
    } catch (error) {
        // Passa o erro para o middleware de tratamento de erros
        next(error);
    }
};

// --- 2. Buscar um cliente por ID ---
const buscarClientePorId = async (req, res, next) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }
        res.status(200).json(cliente);
    } catch (error) {
        next(error);
    }
};

// --- 3. Criar um novo cliente ---
const criarCliente = async (req, res, next) => {
    try {
        // O corpo da requisição já foi validado pelo middleware na rota
        const novoCliente = new Cliente(req.body);
        const clienteSalvo = await novoCliente.save();
        res.status(201).json(clienteSalvo);
    } catch (error) {
        next(error);
    }
};

// --- 4. Atualizar um cliente existente ---
const atualizarCliente = async (req, res, next) => {
    try {
        const cliente = await Cliente.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true } // {new: true} retorna o documento atualizado
        );
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente não encontrado para atualização.' });
        }
        res.status(200).json(cliente);
    } catch (error) {
        next(error);
    }
};

// --- 5. Deletar um cliente ---
const deletarCliente = async (req, res, next) => {
    try {
        const cliente = await Cliente.findByIdAndDelete(req.params.id);
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente não encontrado para exclusão.' });
        }
        res.status(200).json({ message: 'Cliente deletado com sucesso.' });
    } catch (error) {
        next(error);
    }
};

// ===============================================================
// EXPORTAÇÃO CORRETA - Garante que todas as funções estão disponíveis
// ===============================================================
module.exports = {
    listarClientes,
    buscarClientePorId,
    criarCliente,
    atualizarCliente,
    deletarCliente
};
