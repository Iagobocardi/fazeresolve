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
    valorProposto: { type: Number, required: true, min: 0 }, // Valor deve ser positivo
    servico: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico', required: true },
    validade: { type: Date, required: true } // Adicionada validade do orçamento
});

module.exports = mongoose.model('Orcamento', orcamentoSchema);