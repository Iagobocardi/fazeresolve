const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const crypto = require('crypto');
const whatsappService = require('../services/whatsapp.service');
const mongoose = require('mongoose');

// Função para listar todos os clientes de uma conta de prestador
const getAllClientes = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA

        const clientesDoPrestador = await Orcamento.aggregate([
            // 1. Encontrar todos os orçamentos que pertencem à conta do prestador logado
            { $match: { contaId: new mongoose.Types.ObjectId(contaId) } }, // MUDANÇA
            // 2. Agrupar por cliente
            { $group: { _id: '$cliente' } },
            // 3. Juntar com a coleção de clientes para obter detalhes
            {
                $lookup: {
                    from: 'clientes',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'clienteInfo'
                }
            },
            { $unwind: '$clienteInfo' },
            // 4. Juntar com orçamentos para calcular totais
            {
                $lookup: {
                    from: 'orcamentos',
                    let: { clienteId: '$clienteInfo._id' },
                    pipeline: [
                        // MUDANÇA: Garante que estamos contando apenas orçamentos da mesma conta
                        { $match: {
                            $expr: { $eq: ['$$clienteId', '$cliente'] },
                            contaId: new mongoose.Types.ObjectId(contaId)
                        }}
                    ],
                    as: 'pedidos'
                }
            },
            // 5. Calcular totais
            {
                $addFields: {
                    totalPedidos: { $size: '$pedidos' },
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
            // 6. Formatar saída
            {
                $project: {
                    _id: '$clienteInfo._id',
                    nome: '$clienteInfo.nome',
                    telefone: '$clienteInfo.telefone',
                    email: '$clienteInfo.email',
                    endereco: '$clienteInfo.endereco',
                    totalPedidos: 1,
                    valorTotalGasto: 1
                }
            },
            { $sort: { valorTotalGasto: -1 } }
        ]);

        res.status(200).json(clientesDoPrestador);
    } catch (error) {
        console.error("Erro ao buscar clientes do prestador:", error);
        res.status(500).json({ message: "Erro ao buscar dados dos clientes." });
    }
};

// Função para buscar um cliente por ID
const buscarClientePorId = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const cliente = await Cliente.findOne({ _id: req.params.id, contaId }); // MUDANÇA
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(cliente);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cliente.' });
    }
};

// Função para criar um novo cliente
const criarCliente = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const dadosCliente = {
            ...req.body,
            contaId: contaId // MUDANÇA
        };
        const novoCliente = new Cliente(dadosCliente);
        const clienteSalvo = await novoCliente.save();
        res.status(201).json(clienteSalvo);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar cliente.', error: error.message });
    }
};

// Função para atualizar um cliente
const atualizarCliente = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const clienteAtualizado = await Cliente.findOneAndUpdate({ _id: req.params.id, contaId }, req.body, { new: true }); // MUDANÇA
        if (!clienteAtualizado) {
            return res.status(404).json({ error: 'Cliente não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(clienteAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
};

// Função para deletar um cliente
const deletarCliente = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const clienteDeletado = await Cliente.findOneAndDelete({ _id: req.params.id, contaId }); // MUDANÇA
        if (!clienteDeletado) {
            return res.status(404).json({ error: 'Cliente não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json({ message: 'Cliente deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar cliente.' });
    }
};

const getClienteComPedidos = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const cliente = await Cliente.findOne({ _id: req.params.id, contaId }); // MUDANÇA
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado ou não pertence a esta conta.' });
        }

        const pedidos = await Orcamento.find({ cliente: cliente._id, contaId }) // MUDANÇA
            .select('shortId descricao status valorProposto tipo data')
            .sort({ data: -1 });
            
        res.status(200).json({ cliente, pedidos });
    } catch (error) {
        console.error("ERRO em getClienteComPedidos:", error);
        res.status(500).json({ error: 'Erro ao buscar detalhes do cliente.' });
    }
};

const enviarConvitePortal = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const cliente = await Cliente.findOne({ _id: req.params.id, contaId }); // MUDANÇA
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente não encontrado ou não pertence a esta conta.' });
        }

        // Esta lógica de convite precisa ser repensada no novo modelo de autenticação.
        // O cliente final agora deve ser um 'Usuario'. Esta função fica temporariamente desabilitada.
        return res.status(501).json({ message: 'Funcionalidade de convite em refatoração para o novo modelo de autenticação.' });

    } catch (error) {
        console.error("ERRO em enviarConvitePortal:", error);
        res.status(500).json({ message: 'Erro ao enviar o convite.' });
    }
};

module.exports = {
    getAllClientes,
    buscarClientePorId,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    getClienteComPedidos,
    enviarConvitePortal
};