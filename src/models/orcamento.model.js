// Arquivo: src/models/orcamento.model.js
// Adicionados campos para suportar a pesquisa de satisfação.
const mongoose = require('mongoose');

const orcamentoSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['Aceito', 'Pendente', 'Rejeitado', 'Agendado', 'Finalizado'],
        default: 'Pendente',
        trim: true
    },
    data: { type: Date, default: Date.now },
    valorProposto: { type: Number, min: 0, default: 0 },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    descricao: { type: String },
    media: [{ url: String, sid: String }],
    tipo: {
        type: String,
        enum: ['ORCAMENTO', 'RETIRADA', 'ENTREGA', 'ACOMPANHAMENTO', 'OUTRO'],
        default: 'ORCAMENTO'
    },
    shortId: { type: String, unique: true },
    dataAgendamento: { type: String },
    address: { type: String },

    // --- NOVOS CAMPOS ADICIONADOS ---
    dataFinalizacao: {
        type: Date // Guarda quando o serviço foi finalizado.
    },
    pesquisaEnviada: {
        type: Boolean, // Marca se a pesquisa já foi enviada para este pedido.
        default: false
    },
    notaSatisfacao: {
        type: Number, // Guarda a nota de 1 a 5 dada pelo cliente.
        min: 1,
        max: 5
    }
});

orcamentoSchema.pre('save', function(next) {
    if (this.isNew && !this.shortId) {
        this.shortId = this._id.toString().slice(-6);
    }
    next();
});

module.exports = mongoose.model('Orcamento', orcamentoSchema);
