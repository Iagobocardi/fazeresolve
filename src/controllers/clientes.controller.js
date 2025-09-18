const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const crypto = require('crypto');
const whatsappService = require('../services/whatsapp.service');
const mongoose = require('mongoose');

// Função para listar todos os clientes de um prestador específico (REATORADA PARA PERFORMANCE)
const getAllClientes = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { search } = req.query;

        let query = { contaId: contaId };

        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { nome: regex },
                { email: regex },
                { telefone: regex }
            ];
        }
        
        // Busca os clientes diretamente e ordena pelos que gastaram mais.
        const clientes = await Cliente.find(query).sort({ valorTotalGasto: -1 });

        res.status(200).json(clientes);
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        res.status(500).json({ message: "Erro ao buscar dados dos clientes." });
    }
};

// Função para buscar um cliente por ID
const buscarClientePorId = async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json(cliente);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cliente.' });
    }
};

// Função para criar um novo cliente (será usada pelo painel no futuro)
const criarCliente = async (req, res) => {
    // NOSSOS DETECTIVES:
    console.log('--- CONTROLLER: A função criarCliente foi chamada. ---');
    console.log('--- DADOS RECEBIDOS DO POSTMAN (req.body): ---');
    console.log(req.body);
    console.log(`--- SENHA RECEBIDA DIRETAMENTE: ${req.body.password} ---`);

    try {
        const novoCliente = new Cliente(req.body);

        console.log('--- OBJETO CLIENTE PREPARADO (ANTES DE .save()) ---');
        console.log('A senha neste objeto é:', novoCliente.password);

        const clienteSalvo = await novoCliente.save();

        console.log('--- CLIENTE SALVO NO BANCO DE DADOS (DEPOIS DE .save()) ---');
        console.log(clienteSalvo);

        res.status(201).json(clienteSalvo);

    } catch (error) {
        console.error('ERRO DETALHADO AO CRIAR CLIENTE:', error);
        res.status(500).json({
            mensagem: 'Ocorreu um erro interno no servidor.',
            erro_detalhado: error,
            stack_trace: error.stack
        });
    }
};

// Função para atualizar um cliente
const atualizarCliente = async (req, res) => {
    try {
        const clienteAtualizado = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!clienteAtualizado) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json(clienteAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
};

// Função para deletar um cliente
const deletarCliente = async (req, res) => {
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
const getClienteComPedidos = async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        // CORREÇÃO: A busca agora seleciona mais campos para o histórico.
        const pedidos = await Orcamento.find({ cliente: cliente._id })
            .select('shortId descricao status valorProposto tipo data') // Seleciona os campos específicos
            .sort({ data: -1 });
            
        res.status(200).json({ cliente, pedidos });
    } catch (error) {
        console.error("ERRO em getClienteComPedidos:", error);
        res.status(500).json({ error: 'Erro ao buscar detalhes do cliente.' });
    }
};
const gerarConvitePortal = async (req, res) => {
    try {
        const { id: clienteId } = req.params;
        const { contaId } = req.user;

        const cliente = await Cliente.findOne({ _id: clienteId, contaId: contaId });
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente não encontrado ou não pertence à sua conta.' });
        }

        // 1. Gera um token seguro e aleatório
        const token = crypto.randomBytes(32).toString('hex');

        // 2. Define o token e a data de expiração (ex: 24 horas a partir de agora)
        cliente.activationToken = token;
        cliente.activationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

        await cliente.save();

        // 3. Monta a URL de ativação (aponte para o seu frontend)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const activationUrl = `${frontendUrl}/portal/login-token/${token}`;

        // 4. Retorna o link para o frontend
        res.status(200).json({
            message: 'Link de convite gerado com sucesso!',
            activationUrl
        });

    } catch (error) {
        console.error("ERRO em gerarConvitePortal:", error);
        res.status(500).json({ message: 'Erro ao gerar o link de convite.' });
    }
};



// CORREÇÃO: Exporta TODAS as funções que as rotas precisam.
module.exports = {
    getAllClientes,
    buscarClientePorId,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    getClienteComPedidos,
    gerarConvitePortal
};
