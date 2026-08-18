// src/controllers/checklist.controller.js
const Orcamento = require('../models/orcamento.model.js');

// Adicionar uma nova tarefa a um pedido
exports.adicionarTarefa = async (req, res) => {
    try {
        const { descricao } = req.body;
        const { pedidoId } = req.params;
        if (!descricao) return res.status(400).json({ message: "A descrição da tarefa é obrigatória." });

        const pedido = await Orcamento.findByIdAndUpdate(
            pedidoId,
            { $push: { checklist: { descricao } } },
            { new: true }
        );
        if (!pedido) return res.status(404).json({ message: "Pedido não encontrado." });
        res.status(200).json(pedido.checklist.slice(-1)[0]); // Retorna apenas a nova tarefa criada
    } catch (error) {
        res.status(500).json({ message: "Erro ao adicionar tarefa." });
    }
};

// Atualizar o estado de uma tarefa (concluída/não concluída)
exports.atualizarTarefa = async (req, res) => {
    try {
        const { pedidoId, tarefaId } = req.params;
        const { concluida } = req.body;

        const pedido = await Orcamento.findOneAndUpdate(
            { "_id": pedidoId, "checklist._id": tarefaId },
            { "$set": { "checklist.$.concluida": concluida } },
            { new: true }
        );
        if (!pedido) return res.status(404).json({ message: "Pedido ou tarefa não encontrada." });
        res.status(200).json({ message: "Tarefa atualizada com sucesso." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao atualizar tarefa." });
    }
};
exports.removerTarefa = async (req, res) => {
    try {
        const { pedidoId, tarefaId } = req.params;

        const pedido = await Orcamento.findByIdAndUpdate(
            pedidoId,
            { $pull: { checklist: { _id: tarefaId } } }, // O $pull remove um item de um array
            { new: true }
        );

        if (!pedido) return res.status(404).json({ message: "Pedido não encontrado." });
        res.status(200).json({ message: "Tarefa removida com sucesso." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao remover tarefa." });
    }
};