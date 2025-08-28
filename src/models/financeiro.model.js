// Arquivo: src/models/financeiro.model.js
const mongoose = require('mongoose');

const financeiroSchema = new mongoose.Schema({
    contaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conta',
        required: true,
        index: true
    },
    valorRecebido: { type: Number, required: true, min: 0 },
    formaPagamento: { type: String, required: true, trim: true },
    taxaAplicada: { type: Number, min: 0 }, // Taxa não deve ser negativa
    servico: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico', required: true },
    dataPagamento: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Financeiro', financeiroSchema);
