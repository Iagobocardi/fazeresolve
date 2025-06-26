// Arquivo: src/models/orcamento.model.js (VERSÃO CORRIGIDA)
const mongoose = require('mongoose');

const orcamentoSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['Aceito', 'Pendente', 'Rejeitado'],
        default: 'Pendente',
        trim: true
    },
    data: { type: Date, default: Date.now },
    // Tornamos estes campos opcionais na criação
    valorProposto: { type: Number, min: 0, default: 0 },
    servico: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico' }, // não é mais 'required'
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    validade: { type: Date }, // não é mais 'required'
    
    // Adicione um campo para a descrição que vem do WhatsApp
    descricao: { type: String }
});

module.exports = mongoose.model('Orcamento', orcamentoSchema);