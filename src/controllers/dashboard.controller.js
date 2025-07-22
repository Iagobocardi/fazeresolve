// DENTRO DE src/controllers/dashboard.controller.js
// SUBSTITUA A FUNÇÃO DE TESTE POR ESTA VERSÃO ORIGINAL

const Orcamento = require('../models/orcamento.model');

exports.getDashboardData = async (req, res) => {
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

        const satisfacaoResult = await Orcamento.aggregate([
            { $match: { status: 'Finalizado', notaSatisfacao: { $exists: true, $ne: null } } },
            { $group: { _id: null, media: { $avg: '$notaSatisfacao' } } }
        ]);
        const satisfacaoMedia = satisfacaoResult[0]?.media || 0;

        // --- 2. Buscar Clientes Recentes ---
        const orcamentosRecentes = await Orcamento.find({ cliente: { $exists: true } })
            .sort({ data: -1 })
            .limit(15)
            .populate('cliente', 'nome telefone');

        const clientesUnicos = new Map();
        orcamentosRecentes.forEach(orcamento => {
            if (orcamento.cliente && !clientesUnicos.has(orcamento.cliente._id.toString())) {
                clientesUnicos.set(orcamento.cliente._id.toString(), {
                    _id: orcamento.cliente._id,
                    nome: orcamento.cliente.nome,
                    telefone: orcamento.cliente.telefone,
                    ultimoPedido: orcamento.data
                });
            }
        });
        
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
// ADICIONE ESTA NOVA FUNÇÃO
exports.getProximosAgendamentos = async (req, res) => {
  try {
    const hoje = new Date();
    
    // CORREÇÃO AQUI: Usar a variável correta "Orcamento"
    const proximosAgendamentos = await Orcamento.find({
      status: 'Agendado',
      dataAgendamento: { $gte: hoje }
    })
    .sort({ dataAgendamento: 1 })
    .limit(5)
    .populate('cliente', 'nome');

    res.json(proximosAgendamentos);

  } catch (error) {
    console.error('Erro ao buscar próximos agendamentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
