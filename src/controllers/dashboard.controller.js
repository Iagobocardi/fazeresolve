const Orcamento = require('../models/orcamento.model');
const NodeGeocoder = require('node-geocoder');

// Configuração do Geocoder
const options = {
  provider: 'google',
  apiKey: process.env.GOOGLE_MAPS_API_KEY, // Use variável de ambiente
  formatter: null
};
const geocoder = NodeGeocoder(options);

// Scopes all queries to the user's contaId
const getBaseQuery = (req) => ({ contaId: req.user.contaId });

exports.getDashboardData = async (req, res) => {
    try {
        const baseQuery = getBaseQuery(req);
        const umMesAtras = new Date();
        umMesAtras.setMonth(umMesAtras.getMonth() - 1);

        const novasSolicitacoes = await Orcamento.countDocuments({ ...baseQuery, data: { $gte: umMesAtras } });

        const faturamentoResult = await Orcamento.aggregate([
            { $match: { ...baseQuery, status: 'Finalizado', dataFinalizacao: { $gte: umMesAtras } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const faturamento = faturamentoResult[0]?.total || 0;

        const receitasFuturasResult = await Orcamento.aggregate([
            { $match: { ...baseQuery, status: { $in: ['Aceito', 'Agendado'] } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const receitasFuturas = receitasFuturasResult[0]?.total || 0;

        const satisfacaoResult = await Orcamento.aggregate([
            { $match: { ...baseQuery, status: 'Finalizado', notaSatisfacao: { $exists: true, $ne: null } } },
            { $group: { _id: null, media: { $avg: '$notaSatisfacao' } } }
        ]);
        const satisfacaoMedia = satisfacaoResult[0]?.media || 0;

        const orcamentosRecentes = await Orcamento.find({ ...baseQuery, cliente: { $exists: true } })
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
    const baseQuery = getBaseQuery(req);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const agendamentosPotenciais = await Orcamento.find({
      ...baseQuery,
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
    const baseQuery = getBaseQuery(req);
    const pedidosPendentes = await Orcamento.find({
      ...baseQuery,
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
    const baseQuery = getBaseQuery(req);
    const pagamentosAtrasados = await Orcamento.find({
      ...baseQuery,
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
    const baseQuery = getBaseQuery(req);
    const topRegioes = await Orcamento.aggregate([
      { $match: { ...baseQuery, address: { $exists: true, $ne: "" } } },
      { $group: { _id: '$address', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, regiao: '$_id', pedidos: '$count' } }
    ]);
    res.json(topRegioes);
  } catch (error) {
    console.error('Erro ao buscar top regiões:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

exports.getPedidosCoordenadas = async (req, res) => {
  try {
    const baseQuery = getBaseQuery(req);
    const pedidosComEndereco = await Orcamento.find({
      ...baseQuery,
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
