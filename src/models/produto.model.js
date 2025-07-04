// Arquivo: src/models/produto.model.js

const mongoose = require('mongoose');

const produtoSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: [true, 'O nome do produto é obrigatório.'],
        trim: true,
        unique: true // Garante que não haverá dois produtos com o mesmo nome
    },
    descricao: {
        type: String,
        trim: true
    },
    unidade: {
        type: String,
        enum: ['Unidade', 'Metro', 'Litro', 'Kg', 'Caixa'],
        required: true,
        default: 'Unidade'
    },
    quantidadeEmEstoque: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    custoUnitario: {
        type: Number,
        default: 0,
        min: 0
    },
    fornecedor: {
        type: String,
        trim: true
    }
}, {
    timestamps: true 
});

const Produto = mongoose.model('Produto', produtoSchema);

module.exports = Produto;