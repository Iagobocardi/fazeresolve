const mongoose = require('mongoose');
const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const Agendamento = require('../models/agendamento.model');
const crypto = require('crypto');
const whatsappService = require('../services/whatsapp.service');

// Função para listar todos os clientes com dados agregados e KPIs
const getAllClientes = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { search } = req.query;
        const contaObjId = contaId._id;

        let pipeline = [
            { $match: { contaId: contaObjId } },
            { $lookup: { from: 'orcamentos', localField: '_id', foreignField: 'cliente', as: 'pedidos' } },
            { $lookup: { from: 'agendamentos', localField: '_id', foreignField: 'cliente', as: 'agendamentos' } },
            {
                $addFields: {
                    valorTotalGasto: {
                        $reduce: {
                            input: '$pedidos',
                            initialValue: 0,
                            in: {
                                $add: [
                                    '$$value',
                                    { $cond: { if: { $isNumber: '$$this.valorProposto' }, then: '$$this.valorProposto', else: 0 } }
                                ]
                            }
                        }
                    },
                    totalPedidos: { $size: '$pedidos' },
                    ultimoServico: { $max: '$pedidos.data' },
                    proximoAgendamentoObj: {
                        $first: {
                            $filter: {
                                input: '$agendamentos',
                                as: 'ag',
                                cond: {
                                    $and: [
                                        { $isDate: '$$ag.dataHoraInicio' },
                                        { $gte: ['$$ag.dataHoraInicio', new Date()] }
                                    ]
                                }
                            }
                        }
                    },
                    faturasAtrasadas: {
                        $filter: {
                            input: '$pedidos',
                            as: 'p',
                            cond: {
                                $and: [
                                    { $eq: ['$$p.statusPagamento', 'Pendente'] },
                                    { $isDate: '$$p.dataVencimento' },
                                    { $lt: ['$$p.dataVencimento', new Date()] }
                                ]
                            }
                        }
                    },
                    faturaAberta: { $first: { $filter: { input: '$pedidos', as: 'p', cond: { $eq: ['$$p.statusPagamento', 'Pendente'] } } } }
                }
            },
            {
                $addFields: {
                    faturaAtrasada: { $first: '$faturasAtrasadas' },
                    statusFinanceiro: {
                        $switch: {
                            branches: [
                                { case: { $gt: [{ $size: '$faturasAtrasadas' }, 0] }, then: 'INADIMPLENTE' },
                                { case: { $ne: ['$faturaAberta', null] }, then: 'AG_PGTO' }
                            ],
                            default: 'EM_DIA'
                        }
                    },
                    clientTag: {
                        $cond: {
                            if: { $eq: ['$totalPedidos', 0] },
                            then: 'Novo Cliente',
                            else: 'Cliente Recorrente'
                        }
                    },
                    proximoAgendamento: { $ifNull: [ '$proximoAgendamentoObj.dataHoraInicio', null ] },
                    proximoAgendamentoDesc: { $ifNull: [ '$proximoAgendamentoObj.observacoes', 'N/A' ] },
                    faturaAtrasadaValor: { $ifNull: [ '$faturaAtrasada.valorProposto', null ] },
                    faturaAtrasadaId: { $ifNull: [ '$faturaAtrasada.shortId', null ] },
                    faturaAbertaValor: { $ifNull: [ '$faturaAberta.valorProposto', null ] },
                    faturaAbertaId: { $ifNull: [ '$faturaAberta.shortId', null ] },
                }
            }
        ];
        
        if (search) {
            const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { nome: searchRegex }, { email: searchRegex }, { telefone: searchRegex },
                        { 'endereco.cidade': searchRegex }, { 'pedidos.descricao': searchRegex }
                    ]
                }
            });
        }

        pipeline.push(
            {
                $project: {
                    nome: 1, email: 1, telefone: 1, 'endereco.cidade': 1, 'endereco.estado': 1, 
                    statusFinanceiro: 1, clientTag: 1, ultimoServico: 1, proximoAgendamento: 1, 
                    proximoAgendamentoDesc: 1, valorTotalGasto: 1, faturaAtrasadaValor: 1, 
                    faturaAtrasadaId: 1, faturaAbertaValor: 1, faturaAbertaId: 1,
                }
            },
            { $sort: { valorTotalGasto: -1 } }
        );

        const clientesPromise = Cliente.aggregate(pipeline);

        // KPIs
        const now = new Date();
        const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextSevenDays = new Date(new Date().setDate(now.getDate() + 7));

        const clientesAtivosPromise = Cliente.countDocuments({ contaId: contaObjId });
        const novosClientesPromise = Cliente.countDocuments({ contaId: contaObjId, createdAt: { $gte: startOfMonth } });
        
        const faturasAtrasadasKpiPromise = Orcamento.aggregate([
             { $match: { contaId: contaObjId, statusPagamento: 'Pendente', dataVencimento: { $lt: now } } },
             { $addFields: { valorPropostoNumeric: { $cond: { if: { $isNumber: '$valorProposto' }, then: '$valorProposto', else: 0 } } } },
             { $group: { _id: null, total: { $sum: '$valorPropostoNumeric' }, count: { $sum: 1 } } }
        ]);
        
        const valorMedioPromise = Orcamento.aggregate([
            { $match: { contaId: contaObjId, statusPagamento: { $in: ['Pago', 'Pago Parcial'] }, data: { $gte: thirtyDaysAgo } } },
            { $addFields: { valorPropostoNumeric: { $cond: { if: { $isNumber: '$valorProposto' }, then: '$valorProposto', else: 0 } } } },
            { $group: { _id: null, media: { $avg: '$valorPropostoNumeric' } } }
        ]);
        
        const proximoAgendamentosPromise = Agendamento.countDocuments({
            contaId: contaObjId,
            dataHoraInicio: { $gte: now, $lte: nextSevenDays }
        });

        const [clientes, clientesAtivos, novosClientes, faturasAtrasadasKpi, valorMedioResult, proximoAgendamentos] = await Promise.all([
            clientesPromise,
            clientesAtivosPromise,
            novosClientesPromise,
            faturasAtrasadasKpiPromise,
            valorMedioPromise,
            proximoAgendamentosPromise
        ]);

        const kpis = {
            clientesAtivos,
            novosClientesEsteMes: novosClientes,
            saldoDevedorTotal: faturasAtrasadasKpi[0]?.total || 0,
            faturasAtrasadasCount: faturasAtrasadasKpi[0]?.count || 0,
            valorMedioPorServico: valorMedioResult[0]?.media || 0,
            proximosAgendamentos
        };

        res.status(200).json({ clientes, kpis });
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        res.status(500).json({ message: "Erro ao buscar dados dos clientes." });
    }
};

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

module.exports = {
    getAllClientes,
    buscarClientePorId,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    getClienteComPedidos,
    gerarConvitePortal
};
