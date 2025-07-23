const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const crypto = require('crypto');
const whatsappService = require('../services/whatsapp.service');
const mongoose = require('mongoose');

// Função para listar todos os clientes e contar os seus pedidos
const getAllClientes = async (req, res) => {
    try {
        const clientesComDados = await Cliente.aggregate([
            {
                // 1. Juntar os clientes com os seus respetivos pedidos (orçamentos)
                $lookup: {
                    from: Orcamento.collection.name,
                    localField: '_id',
                    foreignField: 'cliente',
                    as: 'pedidos'
                }
            },
            {
                // 2. Adicionar novos campos para calcular os totais
                $addFields: {
                    // Conta o número total de pedidos
                    totalPedidos: { $size: '$pedidos' },
                    // Calcula o valor total gasto apenas em pedidos 'Finalizado'
                    valorTotalGasto: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$pedidos',
                                        as: 'pedido',
                                        cond: { $eq: ['$$pedido.status', 'Finalizado'] }
                                    }
                                },
                                as: 'pedidoFinalizado',
                                in: '$$pedidoFinalizado.valorProposto'
                            }
                        }
                    }
                }
            },
            {
                // 3. Definir quais campos queremos na resposta final
                $project: {
                    nome: 1,
                    telefone: 1,
                    totalPedidos: 1,
                    valorTotalGasto: 1,
                    // pode adicionar outros campos do cliente aqui se necessário
                }
            },
            {
                // 4. Ordenar por quem gastou mais
                $sort: {
                    valorTotalGasto: -1
                }
            }
        ]);

        res.status(200).json(clientesComDados);
    } catch (error) {
        console.error("Erro ao buscar clientes com dados agregados:", error);
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
const enviarConvitePortal = async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }

        // 1. Gera um token seguro e aleatório
        const token = crypto.randomBytes(32).toString('hex');

        // 2. Define o token e a data de expiração (ex: 1 hora a partir de agora)
        cliente.activationToken = token;
        cliente.activationTokenExpires = Date.now() + 3600000; // 1 hora em milissegundos

        await cliente.save();

        // 3. Monta a URL de ativação (aponte para o seu frontend)
        // ATENÇÃO: Altere 'http://localhost:3001' para o endereço real do seu frontend no futuro
        const activationUrl = `http://localhost:3001/ativar-conta/${token}`;

        // 4. Envia a mensagem via WhatsApp
        const mensagem = `Olá, ${cliente.nome}! Para aceder ao nosso portal de cliente e acompanhar os seus serviços, por favor, ative a sua conta no seguinte link: ${activationUrl}`;
        await whatsappService.sendWhatsAppMessage(cliente.telefone, mensagem);

        res.status(200).json({ message: 'Convite enviado com sucesso!' });

    } catch (error) {
        console.error("ERRO em enviarConvitePortal:", error);
        res.status(500).json({ message: 'Erro ao enviar o convite.' });
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
    enviarConvitePortal
};