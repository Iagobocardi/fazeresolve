// Arquivo: src/controllers/stats.controller.js
// Versão final e completa, com todas as funções de estatísticas.

const Orcamento = require('../models/orcamento.model');
const Despesa = require('../models/despesa.model');

// Função para os cards do Dashboard principal
const getDashboardStats = async (req, res) => {
    try {
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        const novasSolicitacoes = await Orcamento.countDocuments({ data: { $gte: trintaDiasAtras } });

        const faturamentoResult = await Orcamento.aggregate([
            { $match: { status: 'Finalizado', dataFinalizacao: { $gte: trintaDiasAtras } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const faturamento = faturamentoResult.length > 0 ? faturamentoResult[0].total : 0;

        const satisfacaoResult = await Orcamento.aggregate([
            { $match: { notaSatisfacao: { $exists: true, $ne: null } } },
            { $group: { _id: null, media: { $avg: '$notaSatisfacao' } } }
        ]);
        const satisfacaoMedia = satisfacaoResult.length > 0 ? satisfacaoResult[0].media : 0;

        const receitasFuturasResult = await Orcamento.aggregate([
            { $match: { status: { $in: ['Aceito', 'Agendado'] } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const receitasFuturas = receitasFuturasResult.length > 0 ? receitasFuturasResult[0].total : 0;

        res.status(200).json({ novasSolicitacoes, faturamento, satisfacaoMedia, receitasFuturas });
    } catch (error) {
        console.error("ERRO em getDashboardStats:", error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas do dashboard.' });
    }
};

// Função para o gráfico de faturamento
const getFaturamentoMensal = async (req, res) => {
    try {
        const hoje = new Date();
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(hoje.getMonth() - 6);

        const dados = await Orcamento.aggregate([
            { $match: { status: 'Finalizado', dataFinalizacao: { $gte: seisMesesAtras } } },
            { $group: { _id: { ano: { $year: "$dataFinalizacao" }, mes: { $month: "$dataFinalizacao" } }, faturamento: { $sum: "$valorProposto" } } },
            { $sort: { "_id.ano": 1, "_id.mes": 1 } },
            { $project: { _id: 0, mes: { $concat: [{ $toString: "$_id.ano" }, "-", { $cond: [ { $lt: ["$_id.mes", 10] }, { $concat: ["0", { $toString: "$_id.mes" }] }, { $toString: "$_id.mes" } ] }] }, faturamento: 1 } }
        ]);
        res.status(200).json(dados);
    } catch (error) {
        console.error("ERRO em getFaturamentoMensal:", error);
        res.status(500).json({ message: 'Erro ao buscar dados de faturamento mensal.' });
    }
};

// Função para o resumo da página Financeiro
const getResumoFinanceiro = async (req, res) => {
    try {
        const hoje = new Date();
        const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

        const faturamentoResult = await Orcamento.aggregate([
            { $match: { statusPagamento: 'Pago', dataPagamento: { $gte: primeiroDiaDoMes, $lte: ultimoDiaDoMes } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const faturamentoPago = faturamentoResult[0]?.total || 0;

        const despesasResult = await Despesa.aggregate([
            { $match: { data: { $gte: primeiroDiaDoMes, $lte: ultimoDiaDoMes } } },
            { $group: { _id: null, total: { $sum: '$valor' } } }
        ]);
        const totalDespesas = despesasResult[0]?.total || 0;

        const lucroLiquido = faturamentoPago - totalDespesas;
        res.status(200).json({ faturamentoPago, totalDespesas, lucroLiquido });
    } catch (error) {
        console.error("ERRO em getResumoFinanceiro:", error);
        res.status(500).json({ message: 'Erro ao buscar resumo financeiro.' });
    }
};

// Exportação correta de TODAS as funções
module.exports = {
    getDashboardStats,
    getFaturamentoMensal,
    getResumoFinanceiro
};