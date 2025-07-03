// Arquivo: src/controllers/dashboard.controller.js

const Orcamento = require('../models/orcamento.model');

const getDashboardData = async (req, res) => {
    try {
        const umMesAtras = new Date();
        umMesAtras.setMonth(umMesAtras.getMonth() - 1);

        // --- 1. Calcular as Estatísticas ---
        const novasSolicitacoes = await Orcamento.countDocuments({ data: { $gte: umMesAtras } });

        const faturamentoResult = await Orcamento.aggregate([
            { $match: { status: 'Finalizado', dataFinalizacao: { $gte: umMesAtras } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const faturamento = faturamentoResult[0]?.total || 0;

        const receitasFuturasResult = await Orcamento.aggregate([
            { $match: { status: { $in: ['Aceito', 'Agendado'] } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const receitasFuturas = receitasFuturasResult[0]?.total || 0;

        // Nota: Assumindo que você terá um campo `notaSatisfacao` nos pedidos finalizados.
        const satisfacaoResult = await Orcamento.aggregate([
            { $match: { status: 'Finalizado', notaSatisfacao: { $exists: true, $ne: null } } },
            { $group: { _id: null, media: { $avg: '$notaSatisfacao' } } }
        ]);
        const satisfacaoMedia = satisfacaoResult[0]?.media || 0;


        // --- 2. Buscar Clientes Recentes ---
        // Buscamos os últimos pedidos para encontrar os clientes mais recentes.
        const orcamentosRecentes = await Orcamento.find({ cliente: { $exists: true } })
            .sort({ data: -1 })
            .limit(15) // Pegamos mais para garantir que teremos 5 únicos
            .populate('cliente', 'nome telefone');

        // Usamos um Map para garantir que cada cliente apareça apenas uma vez.
        const clientesUnicos = new Map();
        orcamentosRecentes.forEach(orcamento => {
            if (orcamento.cliente && !clientesUnicos.has(orcamento.cliente._id.toString())) {
                clientesUnicos.set(orcamento.cliente._id.toString(), {
                    _id: orcamento.cliente._id,
                    nome: orcamento.cliente.nome,
                    telefone: orcamento.cliente.telefone,
                    ultimoPedido: orcamento.data // Guardamos a data do último pedido
                });
            }
        });

        // Convertemos o Map para um array e pegamos os 5 primeiros.
        const recentesClientes = Array.from(clientesUnicos.values()).slice(0, 5);

        // --- 3. Enviar Resposta Completa ---
        res.status(200).json({
            stats: { novasSolicitacoes, faturamento, receitasFuturas, satisfacaoMedia },
            recentesClientes
        });

    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ error: 'Erro ao buscar dados do dashboard.' });
    }
};

module.exports = { getDashboardData };