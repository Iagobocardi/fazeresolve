const Orcamento = require('../models/orcamento.model');
const NodeGeocoder = require('node-geocoder');
const Cliente = require('../models/cliente.model');

// DEBUGGING VERSION

exports.getDashboardData = async (req, res) => {
    try {
        // Temporarily return empty data to test if the controller is reachable
        res.status(200).json({
            stats: { novasSolicitacoes: 0, faturamento: 0, receitasFuturas: 0, satisfacaoMedia: 0 },
            recentesClientes: []
        });
    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ error: 'Erro ao buscar dados do dashboard.' });
    }
};

exports.getProximosAgendamentos = async (req, res) => {
  try {
    // Temporarily return empty data
    res.json([]);
  } catch (error) {
    console.error('Erro ao buscar próximos agendamentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

exports.getPedidosPendentes = async (req, res) => {
  try {
    // Temporarily return empty data
    res.json([]);
  } catch (error) {
    console.error('Erro ao buscar pedidos pendentes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

exports.getPagamentosAtrasados = async (req, res) => {
  try {
    // Temporarily return empty data
    res.json([]);
  } catch (error) {
    console.error('Erro ao buscar pagamentos em atraso:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

exports.getTopRegioes = async (req, res) => {
  try {
    // Temporarily return empty data
    res.json([]);
  } catch (error) {
    console.error('Erro ao buscar top regiões:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

exports.getPedidosCoordenadas = async (req, res) => {
  try {
    // Temporarily return empty data
    res.json([]);
  } catch (error) {
    console.error('Erro ao geocodificar endereços:', error);
    res.status(500).json({ message: 'Erro ao processar as coordenadas dos pedidos' });
  }
};
