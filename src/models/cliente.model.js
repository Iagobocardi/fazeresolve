// Arquivo: src/models/cliente.model.js (VERSÃO LIMPA E FINAL)
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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Cliente', clienteSchema);