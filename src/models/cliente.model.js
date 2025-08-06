// Arquivo: src/models/cliente.model.js
// Adicionado o campo 'pendingOrderIds' para corrigir o bug de seleção.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const clienteSchema = new mongoose.Schema({
    nome: { type: String, required: true, trim: true },
    telefone: { type: String, required: true, unique: true, trim: true },
      email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        sparse: true 
    },
       // Depois (Correto)
password: {
    type: String,
    // required: false, // O campo agora é opcional
    minlength: 6,
    select: false
},

    role: { type: String, required: true, enum: ['CLIENTE_FINAL', 'PRESTADOR'], default: 'CLIENTE_FINAL' },
     // --- ADICIONE ESTE CAMPO AQUI ---
    plano: {
        type: String,
        enum: ['Essencial', 'Profissional', 'Premium'],
        default: 'Essencial' // Todo novo utilizador começa como Essencial
    },
    // -----------------------------------
    conversationState: {
        type: String,
        enum: ['NONE', 'AWAITING_REQUEST_TYPE', 'AWAITING_SERVICE_TYPE', 'AWAITING_ADDRESS', 'AWAITING_AVAILABILITY', 'COMPLETED', 'AWAITING_ORDER_SELECTION', 'AWAITING_RATING'],
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
    },
     activationToken: {
        type: String
    },
    activationTokenExpires: {
        type: Date
    }
}, {
    timestamps: true
}); 

clienteSchema.pre('save', async function(next) {
    // Só executa esta função se a senha foi modificada (ou é nova)
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Gera o "hash" da senha com um custo de 10 (padrão de segurança)
        const hash = await bcrypt.hash(this.password, 10);
        this.password = hash;
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Cliente', clienteSchema);
