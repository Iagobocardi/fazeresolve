const Orcamento = require('../models/orcamento.model');
const NodeGeocoder = require('node-geocoder');

// Configuração do Geocoder (use a sua chave de API do Google Maps)
const options = {
  provider: 'google',
  apiKey: 'AIzaSyDoErNIO8j-qr34f64QBP6CaOYI5G1Kgkg', // Substitua pela sua chave
  formatter: null
};
const geocoder = NodeGeocoder(options);
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
    hoje.setHours(0, 0, 0, 0); // Define para o início do dia para uma comparação justa

    // 1. Busca um conjunto mais amplo de agendamentos potenciais
    const agendamentosPotenciais = await Orcamento.find({
      status: 'Agendado',
      dataAgendamento: { $exists: true, $ne: null }
    })
    .sort({ dataAgendamento: 1 })
    .populate('cliente', 'nome');

    // 2. Filtra e valida os resultados no código para garantir a integridade
    const proximosAgendamentosValidos = agendamentosPotenciais.filter(orcamento => {
      const data = orcamento.dataAgendamento;
      // Garante que o campo é um objeto Date válido e que não está no passado
      return data instanceof Date && !isNaN(data) && data >= hoje;
    });

    // 3. Limita o número de resultados após a filtragem
    const limitedResults = proximosAgendamentosValidos.slice(0, 5);

    res.json(limitedResults);

  } catch (error) {
    console.error('Erro ao buscar próximos agendamentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
exports.getPedidosPendentes = async (req, res) => {
  try {
    const pedidosPendentes = await Orcamento.find({
      status: 'Pendente',
    })
    .sort({ data: 1 }) // Ordena pelos mais antigos primeiro
    .limit(5)
    .populate('cliente', 'nome'); // Inclui o nome do cliente

    res.json(pedidosPendentes);
  } catch (error) {
    console.error('Erro ao buscar pedidos pendentes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
exports.getPagamentosAtrasados = async (req, res) => {
  try {
    const pagamentosAtrasados = await Orcamento.find({
      status: 'Finalizado',
      statusPagamento: { $ne: 'Pago' } // Onde o status de pagamento NÃO SEJA 'Pago'
    })
    .sort({ dataFinalizacao: 1 }) // Ordena pelos finalizados mais antigos primeiro
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
    const topRegioes = await Orcamento.aggregate([
      // 1. Considerar apenas pedidos que tenham um endereço
      { $match: { address: { $exists: true, $ne: "" } } },
      
      // 2. Agrupar por endereço e contar as ocorrências
      { $group: {
          _id: '$address', // Agrupa pelo campo do endereço
          count: { $sum: 1 }
      }},
      
      // 3. Ordenar pelos mais populares
      { $sort: { count: -1 } },
      
      // 4. Limitar ao Top 5
      { $limit: 5 },

      // 5. Renomear os campos para um formato mais amigável
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
    // 1. Buscar todos os pedidos que têm um endereço
    const pedidosComEndereco = await Orcamento.find({
      address: { $exists: true, $ne: null, $ne: "" }
    }).select('address shortId'); 

    // 2. Extrair apenas os endereços para um array
    const enderecos = pedidosComEndereco.map(p => p.address);

    if (enderecos.length === 0) {
      return res.json([]);
    }

   
    const geocodedData = await geocoder.batchGeocode(enderecos);

    const resultados = pedidosComEndereco.map((pedido, index) => {
      const geo = geocodedData[index];
      if (geo.value && geo.value.length > 0) {
        return {
          // 👇 ALTERAÇÃO: Incluir os IDs na resposta 👇
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
