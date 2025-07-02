// Arquivo: src/models/cliente.model.js
// Adicionado o campo 'pendingOrderIds' para corrigir o bug de seleção.

const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
    nome: { type: String, required: true, trim: true },
    telefone: { type: String, required: true, unique: true, trim: true },
    role: { type: String, required: true, enum: ['CLIENTE_FINAL', 'PRESTADOR'] },
    conversationState: {
        type: String,
        enum: ['NONE', 'AWAITING_REQUEST_TYPE', 'AWAITING_SERVICE_TYPE', 'AWAITING_ADDRESS', 'AWAITING_AVAILABILITY', 'COMPLETED', 'AWAITING_ORDER_SELECTION', 'AWAITING_SATISFACTION_RATING'],
        default: 'NONE'
    },
    currentDemand: {
        requestType: String,
        description: String,
        address: String,
        availability: String,
        media: [{ url: String, sid: String }],
        // --- NOVO CAMPO ADICIONADO ---
        // Guarda a lista de IDs dos pedidos que o cliente está a escolher.
        pendingOrderIds: [mongoose.Schema.Types.ObjectId]
    },
    activeContext: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Orcamento',
        default: null
    }
}, {
    timestamps: true
}); 

module.exports = mongoose.model('Cliente', clienteSchema);
