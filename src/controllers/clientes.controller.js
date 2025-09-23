const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const crypto = require('crypto');
const whatsappService = require('../services/whatsapp.service');
const mongoose = require('mongoose');

// Função para listar todos os clientes com dados agregados e KPIs
const getAllClientes = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { search } = req.query;
        const contaObjId = new mongoose.Types.ObjectId(contaId);

        let matchStage = { contaId: contaObjId };

        if (search) {
            // Função para escapar caracteres especiais para a regex
            const escapeRegex = (text) => {
                return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            };
            const escapedSearch = escapeRegex(search);
            const regex = new RegExp(escapedSearch, 'i');
            matchStage.$or = [
                { nome: regex },
                { email: regex },
                { telefone: regex }
            ];
        }

        const clientesPromise = Cliente.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'orcamentos',
                    localField: '_id',
                    foreignField: 'cliente',
                    as: 'pedidos'
                }
            },
            {
                $addFields: {
                    statusFinanceiro: {
                        $cond: {
                            if: {
                                $gt: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: '$pedidos',
                                                as: 'pedido',
                                                cond: {
                                                    $and: [
                                                        { $eq: ['$$pedido.statusPagamento', 'Pendente'] },
                                                        { $lt: ['$$pedido.dataVencimento', new Date()] }
                                                    ]
                                                }
                                            }
                                        }
                                    }, 0]
                            },
                            then: 'Inadimplente',
                            else: 'Em dia'
                        }
                    }
                }
            },
            {
                $project: {
                    pedidos: 0, // Não envia a lista inteira de pedidos para o frontend
                    'endereco.codigo_municipio': 0,
                    conversationState: 0,
                    currentDemand: 0,
                    activeContext: 0
                }
            },
            { $sort: { valorTotalGasto: -1 } }
        ]);

        const kpisPromise = Cliente.aggregate([
            { $match: { contaId: contaObjId } },
            {
                $group: {
                    _id: '$contaId',
                    clientesAtivos: { $sum: 1 },
                    somaValorTotalGasto: { $sum: '$valorTotalGasto' },
                    somaTotalPedidos: { $sum: '$totalPedidos' }
                }
            }
        ]);
        
        const saldoDevedorPromise = Orcamento.aggregate([
             { $match: { contaId: contaObjId, statusPagamento: 'Pendente', dataVencimento: { $lt: new Date() } } },
             {
                 $group: {
                     _id: null,
                     total: { $sum: '$valorProposto' }
                 }
             }
        ]);


        const [clientes, kpisResult, saldoDevedorResult] = await Promise.all([clientesPromise, kpisPromise, saldoDevedorPromise]);

        const kpisData = kpisResult[0] || {};
        const saldoDevedor = saldoDevedorResult[0]?.total || 0;

        const kpis = {
            clientesAtivos: kpisData.clientesAtivos || 0,
            saldoDevedorTotal: saldoDevedor,
            valorMedioPorPedido: (kpisData.somaTotalPedidos > 0) ? (kpisData.somaValorTotalGasto / kpisData.somaTotalPedidos) : 0
        };

        res.status(200).json({ clientes, kpis });
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
    try {
        const novoCliente = new Cliente(req.body);
        const clienteSalvo = await novoCliente.save();
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
        const clienteId = req.params.id;
        const { contaId } = req.user;

        const clientePromise = Cliente.findOne({ _id: clienteId, contaId: contaId });

        const pedidosPromise = Orcamento.find({ cliente: clienteId, contaId: contaId })
            .select('shortId descricao status statusPagamento valorProposto tipo data dataVencimento')
            .sort({ data: -1 });

        const [cliente, pedidos] = await Promise.all([clientePromise, pedidosPromise]);

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado ou não pertence a esta conta.' });
        }

        // Calcula o saldo devedor para este cliente específico
        const saldoDevedor = pedidos.reduce((acc, pedido) => {
            if (pedido.statusPagamento === 'Pendente' && pedido.dataVencimento && new Date(pedido.dataVencimento) < new Date()) {
                return acc + pedido.valorProposto;
            }
            return acc;
        }, 0);
            
        res.status(200).json({ cliente, pedidos, saldoDevedor });
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
