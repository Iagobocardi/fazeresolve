// Arquivo: src/controllers/public.controller.js

const Orcamento = require('../models/orcamento.model');

const getPedidoByPublicId = async (req, res) => {
    try {
        const { publicId } = req.params;
        
        // Busca o orçamento usando o ID público que é seguro para compartilhar
        const orcamento = await Orcamento.findOne({ publicId: publicId });

        if (!orcamento) {
            // Se não encontrar, retorna um erro 404
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        // IMPORTANTE: Selecionamos APENAS os dados que são seguros para mostrar ao cliente.
        // NUNCA retornamos dados sensíveis como notas internas ou informações de outros clientes.
        const dadosPublicos = {
            shortId: orcamento.shortId,
            status: orcamento.status,
            statusPagamento: orcamento.statusPagamento,
            descricao: orcamento.descricao,
            data: orcamento.data,
            dataAgendamento: orcamento.dataAgendamento,
            valorProposto: orcamento.valorProposto,
            historico: orcamento.historico // Opcional, mas é legal para o cliente ver o progresso.
        };

        res.status(200).json(dadosPublicos);

    } catch (error) {
        console.error("ERRO em getPedidoByPublicId:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
    getPedidoByPublicId
};