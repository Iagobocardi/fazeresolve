// Arquivo: src/models/orcamento.model.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
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

    // --- Campos de Satisfação ---
    dataFinalizacao: {
        type: Date
    },
    pesquisaEnviada: {
        type: Boolean,
        default: false
    },
    notaSatisfacao: {
        type: Number,
        min: 1,
        max: 5
    },

    // --- Campos de Notas e Histórico ---
    notasInternas: {
        type: String,
        trim: true,
        default: ''
    },
    historico: [{
        evento: { type: String, required: true },
        data: { type: Date, default: Date.now }
    }],
    
    // =======================================================
    // 👉 O CAMPO DE PAGAMENTO FOI MOVIDO PARA AQUI DENTRO
    // =======================================================
    statusPagamento: {
        type: String,
        enum: ['Pendente', 'Pago Parcial', 'Pago'],
        default: 'Pendente'
    },
    publicId: {
        type: String,
        unique: true,
    }
}); // <--- FIM DO OBJETO DO SCHEMA

orcamentoSchema.pre('save', function(next) {
    // 'this' refere-se ao documento que está a ser salvo
    if (this.isNew) { // Só executa se for um documento novo
        if (!this.shortId) {
            this.shortId = this._id.toString().slice(-6);
        }
        if (!this.publicId) {
            // Gera um ID único e seguro como: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
            this.publicId = uuidv4(); 
        }
    }
    next();
});

// O CÓDIGO INCORRETO QUE ESTAVA FLUTUANDO AQUI FOI REMOVIDO.

module.exports = mongoose.model('Orcamento', orcamentoSchema);