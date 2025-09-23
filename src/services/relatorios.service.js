// src/services/relatorios.service.js
const mongoose = require('mongoose');
const NodeGeocoder = require('node-geocoder');
const Servico = require('../models/servico.model');
const Transacao = require('../models/transacao.model');
const Orcamento = require('../models/orcamento.model');
const Agendamento = require('../models/agendamento.model');
const Despesa = require('../models/despesa.model');

// Configuração do Geocoder
const options = {
  provider: 'google',
  apiKey: process.env.GOOGLE_MAPS_API_KEY, // Use variável de ambiente
  formatter: null
};
const geocoder = NodeGeocoder(options);

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
 * Busca e calcula os dados para o gráfico de desempenho financeiro mensal.
 */
exports.getMonthlyFinancialPerformance = async (contaId) => {
    const dozeMesesAtras = new Date();
    dozeMesesAtras.setMonth(dozeMesesAtras.getMonth() - 12);

    const resultados = await Transacao.aggregate([
        {
            $match: {
                contaId: new mongoose.Types.ObjectId(contaId),
                data: { $gte: dozeMesesAtras }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$data" },
                    month: { $month: "$data" }
                },
                receita: {
                    $sum: {
                        $cond: [{ $eq: ["$tipo", "Receita"] }, "$valor", 0]
                    }
                },
                despesa: {
                    $sum: {
                        $cond: [{ $eq: ["$tipo", "Despesa"] }, "$valor", 0]
                    }
                }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        {
            $project: {
                _id: 0,
                mes: {
                    $concat: [
                        { $toString: "$_id.year" },
                        "-",
                        { $toString: { $cond: { if: { $lt: ["$_id.month", 10] }, then: { $concat: ["0", { $toString: "$_id.month" }] }, else: { $toString: "$_id.month" } } } }
                    ]
                },
                receita: "$receita",
                despesa: "$despesa"
            }
        }
    ]);

    return resultados;
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

    // 2. Buscar orçamentos finalizados com CEP válido
    const orcamentos = await Orcamento.aggregate([
        {
            $match: {
                contaId: new mongoose.Types.ObjectId(contaId),
                status: 'Finalizado',
                updatedAt: { $gte: dataInicio }
            }
        },
        {
            $lookup: {
                from: 'clientes',
                localField: 'cliente',
                foreignField: '_id',
                as: 'clienteInfo'
            }
        },
        { $unwind: '$clienteInfo' },
        { $match: { 'clienteInfo.endereco.cep': { $ne: null, $ne: "" } } },
        {
            $project: {
                cliente: '$clienteInfo._id',
                valorProposto: 1,
                descricao: { $ifNull: ['$descricao', 'N/A'] },
                cep: '$clienteInfo.endereco.cep'
            }
        }
    ]);

    if (orcamentos.length === 0) {
        return {
            kpis: { totalClientes: 0, cidadesAtendidas: 0, ticketMedio: 0, principalServico: 'N/A' },
            topCidades: [],
            topServicos: []
        };
    }

    // 3. Mapear CEPs para cidades
    const cepsUnicos = [...new Set(orcamentos.map(o => o.cep))];
    let cepParaCidade = {};

    try {
        const geocodedData = await geocoder.batchGeocode(cepsUnicos);
        geocodedData.forEach((result, index) => {
            if (result.value && result.value.length > 0) {
                const cep = cepsUnicos[index];
                // A geocodificação pode retornar 'city' ou 'administrativeLevels'
                const cidade = result.value[0].city || result.value[0].administrativeLevels?.level2long;
                if (cidade) {
                    cepParaCidade[cep] = cidade;
                }
            }
        });
    } catch (error) {
        console.error("Erro no batch geocode:", error);
        // Continua a execução mesmo se o geocode falhar, mas os dados de cidade estarão ausentes.
    }

    // 4. Enriquecer os orçamentos com o nome da cidade
    const orcamentosComCidade = orcamentos.map(o => ({
        ...o,
        cidade: cepParaCidade[o.cep] || null // Adiciona a cidade ao objeto
    })).filter(o => o.cidade); // Filtra para garantir que só temos orçamentos com cidade encontrada

    if (orcamentosComCidade.length === 0) {
        return {
            kpis: { totalClientes: 0, cidadesAtendidas: 0, ticketMedio: 0, principalServico: 'N/A' },
            topCidades: [],
            topServicos: []
        };
    }

    // 5. Calcular as estatísticas em JavaScript
    const totalFaturamento = orcamentosComCidade.reduce((sum, o) => sum + o.valorProposto, 0);
    const totalPedidos = orcamentosComCidade.length;
    
    const clientesUnicos = new Set(orcamentosComCidade.map(o => o.cliente.toString()));
    const cidadesUnicas = new Set(orcamentosComCidade.map(o => o.cidade));

    // Nota: Usamos 'descricao' para calcular os principais serviços, pois o campo 'categoria'
    // frequentemente não é preenchido, o que levaria a estatísticas incorretas.
    const servicosPorFaturamento = orcamentosComCidade.reduce((acc, o) => {
        if (o.descricao !== 'N/A') {
            acc[o.descricao] = (acc[o.descricao] || 0) + o.valorProposto;
        }
        return acc;
    }, {});

    const principalServico = Object.entries(servicosPorFaturamento).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    const kpis = {
        totalClientes: clientesUnicos.size,
        cidadesAtendidas: cidadesUnicas.size,
        ticketMedio: totalPedidos > 0 ? totalFaturamento / totalPedidos : 0,
        principalServico: principalServico
    };

    const cidadesPorFaturamento = orcamentosComCidade.reduce((acc, o) => {
        acc[o.cidade] = (acc[o.cidade] || 0) + o.valorProposto;
        return acc;
    }, {});

    const topCidades = Object.entries(cidadesPorFaturamento)
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

    const servicosPorContagem = orcamentosComCidade.reduce((acc, o) => {
        if (o.descricao !== 'N/A') {
            acc[o.descricao] = (acc[o.descricao] || 0) + 1;
        }
        return acc;
    }, {});
    
    const totalServicosContados = Object.values(servicosPorContagem).reduce((sum, count) => sum + count, 0);

    const topServicos = Object.entries(servicosPorContagem)
        .map(([nome, quantidade]) => ({
            nome,
            percentual: totalServicosContados > 0 ? (quantidade / totalServicosContados) * 100 : 0
        }))
        .sort((a, b) => b.percentual - a.percentual)
        .slice(0, 5);

    return { kpis, topCidades, topServicos };
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
