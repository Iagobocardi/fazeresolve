// src/models/produtoFornecedor.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const produtoFornecedorSchema = new Schema({
    nome: {
        type: String,
        required: [true, 'O nome do produto é obrigatório.'],
        trim: true
    },
    descricao: {
        type: String,
        trim: true
    },
    preco: {
        type: Number,
        required: [true, 'O preço é obrigatório.']
    },
    unidade: {
        type: String,
        default: 'un'
    },
    fornecedor: {
        type: Schema.Types.ObjectId,
        ref: 'Fornecedor', // <-- Isto cria a ligação com o modelo de Fornecedor
        required: true
    },
    imagemUrl: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

const ProdutoFornecedor = mongoose.model('ProdutoFornecedor', produtoFornecedorSchema);

module.exports = ProdutoFornecedor;