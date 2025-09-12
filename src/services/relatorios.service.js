// src/services/relatorios.service.js
const mongoose = require('mongoose');
const Servico = require('../models/servico.model');
// const Transacao = require('../models/transacao.model'); // SUBSTITUÍDO - Removido pois parece obsoleto e pode causar erro.
const Orcamento = require('../models/orcamento.model');
const Agendamento = require('../models/agendamento.model');
const Despesa = require('../models/despesa.model');

/**
 * Busca e formata os dados para o relatório de serviços.
 */
exports.getServicosReportData = async () => {
    const servicos = await Servico.find().populate('cliente');
    
    const bodyData = servicos.map(servico => [
        servico.tipoServico || 'Não informado',
        servico.status || 'N/A',
        servico.valorServico ? servico.valorServico.toFixed(2) : '0.00',
        servico.dataSolicitacao ? new Date(servico.dataSolicitacao).toLocaleDateString('pt-BR') : 'N/A',
        servico.cliente ? servico.cliente.nome : 'Cliente não associado'
    ]);

    return bodyData;
};

/**
 * Calcula as métricas de visibilidade de mercado para o dashboard.
 * @param {string} contaId - O ID da conta do usuário.
 * @param {string} periodo - O período para o filtro ('7dias', '30dias', 'mes_atual').
 * @returns {Promise<object>} Um objeto com todas as métricas calculadas.
 */
exports.getVisibilidadeMetrics = async (contaId, periodo) => {
    // 1. Definir a data de início com base no período
    const dataInicio = new Date();
    if (periodo === '7dias') {
        dataInicio.setDate(dataInicio.getDate() - 7);
    } else if (periodo === '30dias') {
        dataInicio.setDate(dataInicio.getDate() - 30);
    } else if (periodo === 'mes_atual') {
        dataInicio.setDate(1);
        dataInicio.setHours(0, 0, 0, 0);
    }

    // Pipeline de agregação principal
    const results = await Orcamento.aggregate([
        // Estágio 1: Filtrar documentos relevantes
        {
            $match: {
                contaId: new mongoose.Types.ObjectId(contaId),
                status: 'Finalizado',
                updatedAt: { $gte: dataInicio }
            }
        },
        // Estágio 2: Juntar com a coleção de clientes
        {
            $lookup: {
                from: 'clientes',
                localField: 'cliente',
                foreignField: '_id',
                as: 'clienteInfo'
            }
        },
        // Estágio 3: Desconstruir o array para ter um documento por cliente
        { $unwind: '$clienteInfo' },

        // Estágio 3.5: Filtrar clientes sem cidade definida para evitar `null` nos resultados
        { $match: { 'clienteInfo.endereco.cidade': { $ne: null, $ne: "" } } },

        // Estágio 4: Usar $facet para processamento paralelo
        {
            $facet: {
                // Ramo 1: Calcular KPIs gerais
                "kpis": [
                    {
                        $group: {
                            _id: null,
                            totalFaturamento: { $sum: '$valorProposto' },
                            totalPedidos: { $sum: 1 },
                            clientesUnicos: { $addToSet: '$cliente' },
                            cidadesUnicas: { $addToSet: '$clienteInfo.endereco.cidade' }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            totalClientes: { $size: '$clientesUnicos' },
                            cidadesAtendidas: { $size: '$cidadesUnicas' },
                            ticketMedio: { $cond: [{ $eq: ['$totalPedidos', 0] }, 0, { $divide: ['$totalFaturamento', '$totalPedidos'] }] },
                        }
                    }
                ],
                // Ramo 2: Calcular o serviço principal por faturamento
                "principalServico": [
                    { $match: { descricao: { $ne: null, $ne: "" } } },
                    { $group: { _id: '$descricao', faturamento: { $sum: '$valorProposto' } } },
                    { $sort: { faturamento: -1 } },
                    { $limit: 1 },
                    { $project: { _id: 0, nome: '$_id' } }
                ],
                // Ramo 3: Calcular as top 5 cidades por faturamento
                "topCidades": [
                    { $match: { 'clienteInfo.endereco.cidade': { $ne: null, $ne: "" } } },
                    { $group: { _id: '$clienteInfo.endereco.cidade', faturamento: { $sum: '$valorProposto' } } },
                    { $sort: { faturamento: -1 } },
                    { $limit: 5 },
                    { $project: { _id: 0, nome: '$_id', valor: '$faturamento' } }
                ],
                // Ramo 4: Calcular os serviços mais solicitados (por contagem)
                "topServicos": [
                    { $match: { descricao: { $ne: null, $ne: "" } } },
                    { $group: { _id: '$descricao', quantidade: { $sum: 1 } } },
                    { $sort: { quantidade: -1 } },
                    { $limit: 5 }
                ]
            }
        },
        // Estágio 5: Formatar a saída final
        {
            $project: {
                kpis: {
                    $let: {
                        vars: {
                            kpi_data: { $arrayElemAt: ['$kpis', 0] }
                        },
                        in: {
                            totalClientes: { $ifNull: ['$$kpi_data.totalClientes', 0] },
                            cidadesAtendidas: { $ifNull: ['$$kpi_data.cidadesAtendidas', 0] },
                            ticketMedio: { $ifNull: ['$$kpi_data.ticketMedio', 0] },
                            principalServico: { $ifNull: [{ $arrayElemAt: ['$principalServico.nome', 0] }, 'N/A'] }
                        }
                    }
                },
                topCidades: '$topCidades',
                topServicos: {
                    $let: {
                        vars: {
                            total: { $sum: '$topServicos.quantidade' }
                        },
                        in: {
                            $map: {
                                input: '$topServicos',
                                as: 'servico',
                                in: {
                                    nome: '$$servico._id',
                                    percentual: {
                                        $cond: [{ $eq: ['$$total', 0] }, 0, { $multiply: [{ $divide: ['$$servico.quantidade', '$$total'] }, 100] }]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    ]);

    // A agregação retorna um array, mesmo que com um único resultado.
    // Se não houver dados, retorna um objeto com valores padrão.
    if (results.length === 0) {
        return {
            kpis: { totalClientes: 0, cidadesAtendidas: 0, ticketMedio: 0, principalServico: 'N/A' },
            topCidades: [],
            topServicos: []
        };
    }

    return results[0];
};

/**
 * Busca e formata os dados para o relatório de satisfação do cliente.
 */
exports.getCustomerSatisfactionReportData = async () => {
    const ratedQuotes = await Orcamento.find({ 
        notaSatisfacao: { $exists: true, $ne: null } 
    }).populate('cliente', 'nome');

    if (ratedQuotes.length === 0) {
        return {
            averageRating: 0,
            totalRatings: 0,
            bodyData: [] // Garantir que bodyData seja sempre um array
        };
    }

    const totalRatings = ratedQuotes.length;
    const sumOfRatings = ratedQuotes.reduce((acc, quote) => acc + quote.notaSatisfacao, 0);
    const averageRating = sumOfRatings / totalRatings;

    const bodyData = ratedQuotes.map(quote => [
        quote.shortId || 'N/A',
        quote.cliente ? quote.cliente.nome : 'N/A',
        quote.notaSatisfacao,
        quote.feedback || 'Nenhum feedback escrito.'
    ]);

    return {
        averageRating: averageRating.toFixed(2),
        totalRatings,
        bodyData
    };
};

/**
 * Busca e calcula os dados para o relatório de receitas vs. despesas.
 */
exports.getRevenueVsExpensesData = async (contaId) => {
    // Busca todas as transações da conta
    const transacoes = await Transacao.find({ contaId });

    let totalRevenue = 0;
    let totalExpenses = 0;
    const revenueRecords = [];
    const expenseRecords = [];

    // Separa as transações em receitas e despesas
    for (const transacao of transacoes) {
        if (transacao.tipo === 'Receita') {
            totalRevenue += transacao.valor;
            revenueRecords.push(transacao);
        } else if (transacao.tipo === 'Despesa') {
            totalExpenses += transacao.valor;
            expenseRecords.push(transacao);
        }
    }

    const netResult = totalRevenue - totalExpenses;

    return {
        totalRevenue,
        totalExpenses,
        netResult,
        revenueRecords,
        expenseRecords,
    };
};

/**
 * Busca e formata os dados para o relatório financeiro.
 */
exports.getFinanceiroReportData = async (contaId) => {
    const registros = await Transacao.find({ contaId: contaId, tipo: 'Receita' })
        .populate({
            path: 'orcamentoAssociado',
            populate: { path: 'cliente', select: 'nome' } // Popula o cliente dentro do orçamento
        });

    const bodyData = registros.map(registro => {
        const clienteNome = registro.orcamentoAssociado && registro.orcamentoAssociado.cliente 
            ? registro.orcamentoAssociado.cliente.nome 
            : 'Receita Manual';

        return [
            registro.data ? new Date(registro.data).toLocaleDateString('pt-BR') : 'N/A',
            clienteNome,
            registro.metodoPagamento || 'Não informado',
            registro.valor ? registro.valor.toFixed(2) : '0.00'
        ];
    });

    return bodyData;
};

/**
 * Busca e formata os dados para o relatório de orçamentos.
 */
exports.getOrcamentosReportData = async () => {
    const orcamentos = await Orcamento.find().populate('servico').populate('cliente');
    
    const bodyData = orcamentos.map(orcamento => [
        orcamento.cliente ? orcamento.cliente.nome : 'N/A',
        orcamento.servico ? orcamento.servico.tipoServico : 'N/A',
        orcamento.valorProposto ? orcamento.valorProposto.toFixed(2) : '0.00',
        orcamento.status || 'N/A',
        orcamento.validade ? new Date(orcamento.validade).toLocaleDateString('pt-BR') : 'N/A'
    ]);

    return bodyData;
};

/**
 * Busca e formata os dados para o relatório de agendamentos.
 */
exports.getAgendamentosReportData = async () => {
    const agendamentos = await Agendamento.find().populate('servico').populate('cliente');

    const bodyData = agendamentos.map(agendamento => [
        agendamento.dataHoraInicio ? new Date(agendamento.dataHoraInicio).toLocaleString('pt-BR') : 'N/A',
        agendamento.servico ? agendamento.servico.tipoServico : 'N/A',
        agendamento.cliente ? agendamento.cliente.nome : 'N/A',
        agendamento.status || 'N/A'
    ]);

    return bodyData;
};
