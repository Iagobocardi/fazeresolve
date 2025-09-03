// src/models/produto.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const produtoSchema = new Schema({
    nome: {
        type: String,
        required: [true, 'O nome do produto é obrigatório.'],
        trim: true,
        unique: true
    },
    descricao: { type: String, trim: true },
    unidade: { type: String, default: 'Unidade' },
    quantidadeEmEstoque: { type: Number, default: 0, min: 0 },
    custoUnitario: { type: Number, default: 0 },
    fornecedor: { type: String, trim: true },
      imagemUrl: { 
        type: String, 
        trim: true 
    },

    // 👇 NOVOS CAMPOS INTELIGENTES 👇
    estoqueMinimo: {
        type: Number,
        default: 5, // Valor padrão para "estoque baixo"
        min: 0
    },
    alertaEstoqueBaixo: {
        type: Boolean,
        default: false
    },
    categoria: {
        type: String,
        trim: true,
        default: 'Geral'
    }
}, {
    timestamps: true
});

const Produto = mongoose.model('Produto', produtoSchema);

module.exports = Produto;
