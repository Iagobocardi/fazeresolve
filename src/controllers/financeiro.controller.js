const mongoose = require('mongoose');
const Orcamento = require('../models/orcamento.model');
const Despesa = require('../models/despesa.model');
const Cliente = require('../models/cliente.model');

// Função para buscar a visão geral financeira
exports.getFinancialOverview = async (req, res) => {
    try {
        const { contaId } = req.user;
        const contaObjId = new mongoose.Types.ObjectId(contaId);
        const { period = '30d' } = req.query;

        // Define o período de data para as consultas
        let startDate = new Date();
        if (period === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else { // Padrão é 30d
            startDate.setDate(startDate.getDate() - 30);
        }

        // 1. KPIs
        const receitasPromise = Orcamento.aggregate([
            { $match: { contaId: contaObjId, 'pagamentos.data': { $gte: startDate } } },
            { $unwind: '$pagamentos' },
            { $match: { 'pagamentos.data': { $gte: startDate } } },
            { $group: { _id: null, total: { $sum: '$pagamentos.valor' } } }
        ]);

        const despesasPromise = Despesa.aggregate([
            { $match: { contaId: contaObjId, data: { $gte: startDate } } },
            { $group: { _id: null, total: { $sum: '$valor' } } }
        ]);

        // 2. Histórico de Transações Agrupado
        const transacoesPromise = Orcamento.aggregate([
            { $match: { contaId: contaObjId, data: { $gte: startDate } } },
            { $lookup: { from: 'despesas', localField: '_id', foreignField: 'orcamentoId', as: 'despesasVinculadas' } },
            { $lookup: { from: 'clientes', localField: 'cliente', foreignField: '_id', as: 'clienteInfo' } },
            {
                $addFields: {
                    totalReceitas: { $sum: '$pagamentos.valor' },
                    totalDespesas: { $sum: '$despesasVinculadas.valor' },
                    clienteNome: { $arrayElemAt: ['$clienteInfo.nome', 0] }
                }
            },
            {
                $addFields: {
                    lucro: { $subtract: ['$totalReceitas', '$totalDespesas'] }
                }
            },
            { $match: { $or: [ { totalReceitas: { $gt: 0 } }, { totalDespesas: { $gt: 0 } } ] } },
            { $sort: { data: -1 } },
            {
                $project: {
                    _id: 1, shortId: 1, descricao: 1, data: 1, clienteNome: 1,
                    totalReceitas: 1, totalDespesas: 1, lucro: 1,
                    receitas: '$pagamentos', despesas: '$despesasVinculadas'
                }
            }
        ]);

        // 3. Contas a Pagar
        const contasAPagarPromise = Despesa.find({
            contaId: contaObjId,
            pago: false,
            dataVencimento: { $exists: true, $ne: null }
        }).sort({ dataVencimento: 1 });

        // 4. Recebimentos Pendentes
        const recebimentosPendentesPromise = Orcamento.find({
            contaId: contaObjId,
            statusPagamento: 'Pendente'
        }).populate('cliente', 'nome').sort({ dataVencimento: 1 });


        const [receitasResult, despesasResult, transacoesAgrupadas, contasAPagar, recebimentosPendentes] = await Promise.all([
            receitasPromise,
            despesasPromise,
            transacoesPromise,
            contasAPagarPromise,
            recebimentosPendentesPromise
        ]);

        const faturamentoBruto = receitasResult[0]?.total || 0;
        const totalDespesas = despesasResult[0]?.total || 0;
        const lucroLiquido = faturamentoBruto - totalDespesas;
        const margemDeLucro = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;
        
        const kpis = {
            faturamentoBruto,
            totalDespesas,
            lucroLiquido,
            margemDeLucro,
        };
        
        res.status(200).json({
            kpis,
            transacoesAgrupadas,
            contasAPagar,
            recebimentosPendentes
        });

    } catch (error) {
        console.error("Erro ao buscar visão geral financeira:", error);
        res.status(500).json({ message: "Erro ao buscar dados financeiros." });
    }
};
