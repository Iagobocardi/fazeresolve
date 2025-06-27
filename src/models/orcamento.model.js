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
    valorProposto: { type: Number, min: 0, default: 0 },
    servico: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico' },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    validade: { type: Date },
    descricao: { type: String },

    // --- CAMPO NOVO ADICIONADO ---
    // Um array para guardar os links das imagens ou vídeos enviados pelo cliente.
    mediaUrls: [String],
    // --- CAMPO NOVO ADICIONADO ---
    // Guarda a intenção inicial do cliente.
    tipo: {
        type: String,
        enum: ['ORCAMENTO', 'RETIRADA', 'ENTREGA', 'ACOMPANHAMENTO', 'OUTRO'],
        default: 'ORCAMENTO'
    }
});

module.exports = mongoose.model('Orcamento', orcamentoSchema);