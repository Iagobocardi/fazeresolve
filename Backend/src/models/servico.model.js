// Arquivo: src/models/servico.model.js
const mongoose = require('mongoose');

const servicoSchema = new mongoose.Schema({
    contaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conta',
        required: true,
        index: true
    },
    tipoServico: { type: String, required: true, trim: true },
    categoria: {
        type: String,
        trim: true,
        default: 'Geral'
    },
    status: {
        type: String,
        enum: ['Aberto', 'Em Progresso', 'Concluído'],
        default: 'Aberto',
        trim: true
    },
    valorServico: { type: Number, required: true, min: 0 }, // Valor deve ser positivo
    dataSolicitacao: { type: Date, default: Date.now },
    dataConclusao: Date,
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
});

module.exports = mongoose.model('Servico', servicoSchema);
