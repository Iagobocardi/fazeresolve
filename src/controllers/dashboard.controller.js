const Orcamento = require('../models/orcamento.model');
const NodeGeocoder = require('node-geocoder');
const Cliente = require('../models/cliente.model');

// Helper function to get admin filter
const getAdminFilter = async () => {
    const adminUsers = await Cliente.find({ role: 'ADMIN' }).select('_id');
    const adminIds = adminUsers.map(user => user._id);
    return { cliente: { $nin: adminIds } };
};

// Configuração do Geocoder
const options = {
  provider: 'google',
  apiKey: process.env.GOOGLE_MAPS_API_KEY, // Use environment variable
  formatter: null
};
const geocoder = NodeGeocoder(options);

exports.getDashboardData = async (req, res) => {
    try {
        const umMesAtras = new Date();
        umMesAtras.setMonth(umMesAtras.getMonth() - 1);
        const baseFilter = await getAdminFilter();

        const novasSolicitacoes = await Orcamento.countDocuments({ ...baseFilter, data: { $gte: umMesAtras } });

        const faturamentoResult = await Orcamento.aggregate([
            { $match: { ...baseFilter, status: 'Finalizado', dataFinalizacao: { $gte: umMesAtras } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const faturamento = faturamentoResult[0]?.total || 0;

        const receitasFuturasResult = await Orcamento.aggregate([
            { $match: { ...baseFilter, status: { $in: ['Aceito', 'Agendado'] } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const receitasFuturas = receitasFuturasResult[0]?.total || 0;

        const satisfacaoResult = await Orcamento.aggregate([
            { $match: { ...baseFilter, status: 'Finalizado', notaSatisfacao: { $exists: true, $ne: null } } },
            { $group: { _id: null, media: { $avg: '$notaSatisfacao' } } }
        ]);
        const satisfacaoMedia = satisfacaoResult[0]?.media || 0;

        const orcamentosRecentes = await Orcamento.find({ ...baseFilter, cliente: { $exists: true } })
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

        res.status(200).json({
            stats: { novasSolicitacoes, faturamento, receitasFuturas, satisfacaoMedia },
            recentesClientes
        });

    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ error: 'Erro ao buscar dados do dashboard.' });
    }
};

exports.getProximosAgendamentos = async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const baseFilter = await getAdminFilter();

    const agendamentosPotenciais = await Orcamento.find({
      ...baseFilter,
      status: 'Agendado',
      dataAgendamento: { $exists: true, $ne: null }
    })
    .sort({ dataAgendamento: 1 })
    .populate('cliente', 'nome');

    const proximosAgendamentosValidos = agendamentosPotenciais.filter(orcamento => {
      const data = orcamento.dataAgendamento;
      return data instanceof Date && !isNaN(data) && data >= hoje;
    });

    const limitedResults = proximosAgendamentosValidos.slice(0, 5);
    res.json(limitedResults);

  } catch (error) {
    console.error('Erro ao buscar próximos agendamentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

exports.getPedidosPendentes = async (req, res) => {
  try {
    const baseFilter = await getAdminFilter();
    const pedidosPendentes = await Orcamento.find({
      ...baseFilter,
      status: 'Pendente',
    })
    .sort({ data: 1 })
    .limit(5)
    .populate('cliente', 'nome');

    res.json(pedidosPendentes);
  } catch (error) {
    console.error('Erro ao buscar pedidos pendentes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

exports.getPagamentosAtrasados = async (req, res) => {
  try {
    const baseFilter = await getAdminFilter();
    const pagamentosAtrasados = await Orcamento.find({
      ...baseFilter,
      status: 'Finalizado',
      statusPagamento: { $ne: 'Pago' }
    })
    .sort({ dataFinalizacao: 1 })
    .limit(5)
    .populate('cliente', 'nome');

    res.json(pagamentosAtrasados);
  } catch (error) {
    console.error('Erro ao buscar pagamentos em atraso:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

exports.getTopRegioes = async (req, res) => {
  try {
    const baseFilter = await getAdminFilter();
    const topRegioes = await Orcamento.aggregate([
      { $match: { ...baseFilter, address: { $exists: true, $ne: "" } } },
      { $group: {
          _id: '$address',
          count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: {
          _id: 0,
          regiao: '$_id',
          pedidos: '$count'
      }}
    ]);

    res.json(topRegioes);
  } catch (error) {
    console.error('Erro ao buscar top regiões:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

exports.getPedidosCoordenadas = async (req, res) => {
  try {
    const baseFilter = await getAdminFilter();
    const pedidosComEndereco = await Orcamento.find({
      ...baseFilter,
      address: { $exists: true, $ne: null, $ne: "" }
    }).select('address shortId');

    const enderecos = pedidosComEndereco.map(p => p.address);
    if (enderecos.length === 0) {
      return res.json([]);
    }

    const geocodedData = await geocoder.batchGeocode(enderecos);

    const resultados = pedidosComEndereco.map((pedido, index) => {
      const geo = geocodedData[index];
      if (geo.value && geo.value.length > 0) {
        return {
          _id: pedido._id,
          shortId: pedido.shortId,
          lat: geo.value[0].latitude,
          lng: geo.value[0].longitude,
        };
      }
      return null;
    }).filter(Boolean);

    res.json(resultados);
  } catch (error) {
    console.error('Erro ao geocodificar endereços:', error);
    res.status(500).json({ message: 'Erro ao processar as coordenadas dos pedidos' });
  }
};
