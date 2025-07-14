// Arquivo: src/controllers/stats.controller.js
// Versão final e completa, com todas as funções de estatísticas.

const Orcamento = require('../models/orcamento.model');
const Despesa = require('../models/despesa.model');

// Função para os cards do Dashboard principal (NÃO FOI ALTERADA)
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

// Função para o gráfico de faturamento (NÃO FOI ALTERADA)
const getFaturamentoMensal = async (req, res) => {
    try {
        const hoje = new Date();
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(hoje.getMonth() - 6);

        const dados = await Orcamento.aggregate([
            { $match: { status: 'Finalizado', dataFinalizacao: { $gte: seisMesesAtras } } },
            { $group: { _id: { ano: { $year: "$dataFinalizacao" }, mes: { $month: "$dataFinalizacao" } }, faturamento: { $sum: "$valorProposto" } } },
            { $sort: { "_id.ano": 1, "_id.mes": 1 } },
            { $project: { _id: 0, mes: { $concat: [{ $toString: "$_id.ano" }, "-", { $cond: [{ $lt: ["$_id.mes", 10] }, { $concat: ["0", { $toString: "$_id.mes" }] }, { $toString: "$_id.mes" }] }] }, faturamento: 1 } }
        ]);
        res.status(200).json(dados);
    } catch (error) {
        console.error("ERRO em getFaturamentoMensal:", error);
        res.status(500).json({ message: 'Erro ao buscar dados de faturamento mensal.' });
    }
};

// =====================================================================
// ==> ESTA É A ÚNICA FUNÇÃO QUE FOI ATUALIZADA COM A LÓGICA CORRETA <==
// =====================================================================
const getResumoFinanceiro = async (req, res) => {
    try {
        const hoje = new Date();
        const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

        // 1. Calcular Faturamento Pago no Mês
        const faturamentoResult = await Orcamento.aggregate([
            {
                $match: {
                    status: 'Finalizado',
                    statusPagamento: 'Pago',
                    dataFinalizacao: { $gte: inicioDoMes, $lte: fimDoMes }
                }
            },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const faturamentoPago = faturamentoResult[0]?.total || 0;

        // 2. Calcular Total de Despesas no Mês
        const despesasResult = await Despesa.aggregate([
            { $match: { data: { $gte: inicioDoMes, $lte: fimDoMes } } },
            { $group: { _id: null, total: { $sum: '$valor' } } }
        ]);
        const totalDespesas = despesasResult[0]?.total || 0;
        
        // 3. Calcular Lucro Líquido
        const lucroLiquido = parseFloat(faturamentoPago.toString()) - parseFloat(totalDespesas.toString());
        
        // 4. Enviar os dados corretos e unificados
        res.status(200).json({
            faturamentoPago,
            totalDespesas,
            lucroLiquido
        });

    } catch (error) {
        console.error("ERRO em getResumoFinanceiro:", error);
        res.status(500).json({ message: 'Erro ao calcular resumo financeiro.' });
    }
};


// Exportação correta de TODAS as funções
module.exports = {
    getDashboardStats,
    getFaturamentoMensal,
    getResumoFinanceiro 
};