// src/models/fornecedor.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const contatoSchema = new Schema({
    nome: { type: String, trim: true },
    telefone: { type: String, trim: true },
    email: { type: String, trim: true }
}, { _id: false });

const fornecedorSchema = new Schema({
    nomeFantasia: {
        type: String,
        required: [true, 'O nome fantasia do fornecedor é obrigatório.'],
        trim: true
    },
    razaoSocial: {
        type: String,
        trim: true
    },
    cnpj: {
        type: String,
        trim: true,
        unique: true,
        sparse: true // Permite múltiplos documentos com cnpj nulo/vazio, mas garante que se houver um valor, ele seja único
    },
    categoria: {
        type: String,
        trim: true
    },
    contato: contatoSchema,
    observacoes: {
        type: String,
        trim: true
    },
    logoUrl: {
        type: String,
        trim: true
    },
    ativo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Índice para busca de texto em nomeFantasia e razaoSocial
fornecedorSchema.index({ nomeFantasia: 'text', razaoSocial: 'text', cnpj: 'text' });

const Fornecedor = mongoose.model('Fornecedor', fornecedorSchema);

module.exports = Fornecedor;