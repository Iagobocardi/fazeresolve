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
// Adicione esta nova função ao seu controller de estatísticas

const getFaturamentoMensal = async (req, res) => {
    try {
        // 1. Define o período que queremos analisar (últimos 6 meses)
        const hoje = new Date();
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(hoje.getMonth() - 6);

        // 2. Usamos uma agregação do MongoDB para processar os dados
        const dados = await Orcamento.aggregate([
            // Estágio A: Filtra apenas os pedidos finalizados nos últimos 6 meses
            {
                $match: {
                    status: 'Finalizado',
                    dataFinalizacao: { $gte: seisMesesAtras }
                }
            },
            // Estágio B: Agrupa os pedidos por ano e mês, e soma os seus valores
            {
                $group: {
                    _id: {
                        ano: { $year: "$dataFinalizacao" },
                        mes: { $month: "$dataFinalizacao" }
                    },
                    faturamento: { $sum: "$valorProposto" }
                }
            },
            // Estágio C: Ordena os resultados por data para o gráfico ficar correto
            {
                $sort: {
                    "_id.ano": 1,
                    "_id.mes": 1
                }
            },
            // Estágio D: Formata a saída para ser fácil de usar no frontend
            {
                $project: {
                    _id: 0,
                    // Cria uma string no formato "AAAA-MM"
                    mes: {
                        $concat: [
                            { $toString: "$_id.ano" }, "-",
                            // Adiciona um zero à esquerda para meses de 1 a 9 (ex: 01, 02)
                            { $cond: [ 
                                { $lt: ["$_id.mes", 10] }, 
                                { $concat: ["0", { $toString: "$_id.mes" }] }, 
                                { $toString: "$_id.mes" } 
                            ] }
                        ]
                    },
                    faturamento: 1 // Mantém o campo de faturamento
                }
            }
        ]);
        
        res.status(200).json(dados);

    } catch (error) {
        console.error("ERRO em getFaturamentoMensal:", error);
        res.status(500).json({ message: 'Erro ao buscar dados de faturamento mensal.' });
    }
};
module.exports = {
    getDashboardStats,
     getFaturamentoMensal
};