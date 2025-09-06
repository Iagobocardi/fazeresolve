// src/services/relatorios.service.js

const Servico = require('../models/servico.model');
const Transacao = require('../models/transacao.model'); // SUBSTITUÍDO
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
