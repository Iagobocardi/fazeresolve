// Arquivo: src/models/movimentoEstoque.model.js

const mongoose = require('mongoose');

const movimentoEstoqueSchema = new mongoose.Schema({
    produto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Produto', // Faz referência ao nosso modelo de Produto
        required: true
    },
    tipo: {
        type: String,
        enum: ['Entrada', 'Saída', 'Ajuste'], // Entrada (compra), Saída (uso), Ajuste (correção de contagem)
        required: true
    },
    quantidade: {
        type: Number,
        required: true
    },
    motivo: {
        type: String,
        trim: true
    },
    // Para saídas, podemos associar a um pedido específico
    orcamentoAssociado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Orcamento'
    },
    data: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const MovimentoEstoque = mongoose.model('MovimentoEstoque', movimentoEstoqueSchema);

module.exports = MovimentoEstoque;