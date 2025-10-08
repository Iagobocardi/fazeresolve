const Notificacao = require('../models/notificacao.model.js');
const mongoose = require('mongoose');

/**
 * Busca todas as notificações NÃO LIDAS para a conta do usuário logado.
 */
exports.getNotificacoes = async (req, res) => {
    try {
        const { contaId } = req.user;

        const notificacoes = await Notificacao.find({
            contaId: contaId,
            lida: false
        }).sort({ createdAt: -1 }); // Ordena para mostrar as mais recentes primeiro

        res.status(200).json(notificacoes);

    } catch (error) {
        console.error("Erro ao buscar notificações:", error);
        res.status(500).json({ message: "Ocorreu um erro ao buscar as notificações." });
    }
};

/**
 * Marca uma notificação específica como lida.
 */
exports.marcarComoLida = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID da notificação inválido." });
        }

        const notificacao = await Notificacao.findOneAndUpdate(
            { _id: id, contaId: contaId }, // Garante que o usuário só possa marcar suas próprias notificações
            { lida: true },
            { new: true }
        );

        if (!notificacao) {
            return res.status(404).json({ message: "Notificação não encontrada ou já foi marcada como lida." });
        }

        res.status(200).json({ message: "Notificação marcada como lida.", notificacao });

    } catch (error) {
        console.error("Erro ao marcar notificação como lida:", error);
        res.status(500).json({ message: "Ocorreu um erro ao atualizar a notificação." });
    }
};
