// src/models/fornecedor.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const fornecedorSchema = new Schema({
    nome: {
        type: String,
        required: [true, 'O nome do fornecedor é obrigatório.'],
        trim: true,
        unique: true
    },
    especialidade: {
        type: String,
        required: [true, 'A especialidade é obrigatória.'],
        trim: true
    },
    contato: { // Telefone ou Email
        type: String,
        required: true,
        trim: true
    },
    endereco: {
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

const Fornecedor = mongoose.model('Fornecedor', fornecedorSchema);

module.exports = Fornecedor;