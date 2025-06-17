// Arquivo: src/models/orcamento.model.js

const mongoose = require('mongoose');

const orcamentoSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['Aceito', 'Pendente', 'Rejeitado'],
        default: 'Pendente',
        trim: true
    },
    data: { type: Date, default: Date.now },
    valorProposto: { type: Number, required: true, min: 0 },
    servico: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico', required: true },
    
    // LINHA ADICIONADA:
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },

    validade: { type: Date, required: true }
});

module.exports = mongoose.model('Orcamento', orcamentoSchema);