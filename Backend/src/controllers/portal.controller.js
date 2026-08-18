const Orcamento = require('../models/orcamento.model.js');

// Função para transformar o 'Orcamento' no formato do 'Pedido'
const transformToPedido = (orcamento) => {
    // Implementação da transformação aqui
    return {
        id: orcamento.shortId,
        status: orcamento.status,
        cliente: {
            nome: orcamento.cliente.nome
        },
        prestador: {
            nome: "Nome do Prestador", // Substituir por dados reais
            logo_url: "https://i.imgur.com/YXPtR81.png"
        },
        servico: {
            titulo: orcamento.descricao || "Serviço",
            descricao_curta: "Descrição curta do serviço"
        },
        visita: {
            data_sugerida: orcamento.sugestaoAgendamentoCliente,
            data_confirmada: orcamento.dataAgendamento
        },
        orcamento: {
            total: orcamento.valorProposto,
            sinal_percent: orcamento.sinalPercent,
            sinal_valor: (orcamento.valorProposto * orcamento.sinalPercent) / 100,
            itens: orcamento.itens,
            data_aprovacao: orcamento.dataAprovacao
        },
        pagamento: {
            prestador_tem_mercadopago: orcamento.pagamento.prestadorTemMercadoPago,
            chave_pix: orcamento.pagamento.chavePix,
            status_sinal: orcamento.pagamento.statusSinal
        },
        historico: orcamento.historico.map(h => ({
            timestamp: h.data,
            mensagem: h.evento,
            tipo: 'success' // Simplificado por enquanto
        }))
    };
};

const getPedidoByToken = async (req, res) => {
    try {
        const orcamento = await Orcamento.findOne({ publicId: req.params.token }).populate('cliente');
        if (!orcamento) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        res.json(transformToPedido(orcamento));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar o pedido.' });
    }
};

const sugerirVisita = async (req, res) => {
    try {
        const { data_sugerida } = req.body;
        const orcamento = await Orcamento.findOne({ publicId: req.params.token });

        if (!orcamento) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        orcamento.sugestaoAgendamentoCliente = data_sugerida;
        orcamento.status = 'VISITA_SUGERIDA';
        orcamento.historico.push({ evento: `Cliente sugeriu visita para: ${data_sugerida}` });

        await orcamento.save();
        await orcamento.populate('cliente');

        res.json(transformToPedido(orcamento));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao sugerir visita.' });
    }
};

const aprovarOrcamento = async (req, res) => {
    try {
        const orcamento = await Orcamento.findOne({ publicId: req.params.token });

        if (!orcamento) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        orcamento.status = 'ORCAMENTO_APROVADO';
        orcamento.dataAprovacao = new Date();
        orcamento.historico.push({ evento: 'Orçamento aprovado pelo cliente.' });

        await orcamento.save();
        await orcamento.populate('cliente');

        res.json(transformToPedido(orcamento));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao aprovar o orçamento.' });
    }
};

const recusarOrcamento = async (req, res) => {
    try {
        const orcamento = await Orcamento.findOne({ publicId: req.params.token });

        if (!orcamento) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        orcamento.status = 'RECUSADO';
        orcamento.historico.push({ evento: 'Orçamento recusado pelo cliente.' });

        await orcamento.save();
        await orcamento.populate('cliente');

        res.json(transformToPedido(orcamento));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao recusar o orçamento.' });
    }
};

const informarPagamento = async (req, res) => {
    try {
        const orcamento = await Orcamento.findOne({ publicId: req.params.token });

        if (!orcamento) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        orcamento.status = 'SINAL_EM_ANALISE';
        orcamento.pagamento.statusSinal = 'EM_ANALISE';
        orcamento.historico.push({ evento: 'Cliente informou o pagamento do sinal.' });

        await orcamento.save();
        await orcamento.populate('cliente');

        res.json(transformToPedido(orcamento));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao informar o pagamento.' });
    }
};

module.exports = {
    getPedidoByToken,
    sugerirVisita,
    aprovarOrcamento,
    recusarOrcamento,
    informarPagamento
};
