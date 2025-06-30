// Arquivo: src/models/orcamento.model.js
// Adicionado o campo shortId para uma busca mais fácil e corrigida.
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
    mediaUrls: [String],
    tipo: {
        type: String,
        enum: ['ORCAMENTO', 'RETIRADA', 'ENTREGA', 'ACOMPANHAMENTO', 'OUTRO'],
        default: 'ORCAMENTO'
    },
    // --- NOVO CAMPO ADICIONADO ---
    // Um ID curto e único para facilitar a busca por comandos.
    shortId: {
        type: String,
        unique: true
    }
});

// Hook do Mongoose: Antes de salvar um novo documento...
orcamentoSchema.pre('save', function(next) {
    // Se o documento é novo e ainda não tem um shortId...
    if (this.isNew && !this.shortId) {
        // Gera um shortId a partir dos últimos 6 caracteres do _id completo.
        this.shortId = this._id.toString().slice(-6);
    }
    next(); // Continua com a operação de salvar.
});

module.exports = mongoose.model('Orcamento', orcamentoSchema);
