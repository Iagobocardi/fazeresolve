// Substitua o conteúdo do seu 'stats.controller.js' por este:
const Orcamento = require('../models/orcamento.model');

const getDashboardStats = async (req, res) => {
    try {
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        // 1. Novas solicitações (como antes)
        const novasSolicitacoes = await Orcamento.countDocuments({ data: { $gte: trintaDiasAtras } });

        // 2. Faturamento (como antes)
        const faturamentoResult = await Orcamento.aggregate([
            { $match: { status: 'Finalizado', dataFinalizacao: { $gte: trintaDiasAtras } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const faturamento = faturamentoResult.length > 0 ? faturamentoResult[0].total : 0;

        // 3. Satisfação média (como antes)
        const satisfacaoResult = await Orcamento.aggregate([
            { $match: { notaSatisfacao: { $exists: true, $ne: null } } },
            { $group: { _id: null, media: { $avg: '$notaSatisfacao' } } }
        ]);
        const satisfacaoMedia = satisfacaoResult.length > 0 ? satisfacaoResult[0].media : 0;

        // 4. NOVA MÉTRICA: Receitas Futuras
        const receitasFuturasResult = await Orcamento.aggregate([
            { $match: { status: { $in: ['Aceito', 'Agendado'] } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const receitasFuturas = receitasFuturasResult.length > 0 ? receitasFuturasResult[0].total : 0;

        res.status(200).json({
            novasSolicitacoes,
            faturamento,
            satisfacaoMedia,
            receitasFuturas // Adiciona a nova métrica à resposta
        });

    } catch (error) {
        console.error("ERRO em getDashboardStats:", error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas do dashboard.' });
    }
};

module.exports = {
    getDashboardStats
};