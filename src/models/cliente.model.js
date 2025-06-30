// Arquivo: src/models/cliente.model.js
// Adicionado o campo activeContext para guardar o pedido em foco pelo prestador.

const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
        trim: true
    },
    telefone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        enum: ['CLIENTE_FINAL', 'PRESTADOR']
    },
    conversationState: {
        type: String,
        enum: ['NONE', 'AWAITING_REQUEST_TYPE', 'AWAITING_SERVICE_TYPE', 'AWAITING_ADDRESS', 'AWAITING_AVAILABILITY', 'COMPLETED'],
        default: 'NONE'
    },
    currentDemand: {
        requestType: String,
        description: String,
        address: String,
        availability: String,
        mediaUrls: [String]
    },
    // --- NOVO CAMPO ADICIONADO ---
    // Guarda o ID do orçamento que o prestador está a visualizar,
    // criando um "contexto" para os comandos seguintes.
    activeContext: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Orcamento',
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Cliente', clienteSchema);
