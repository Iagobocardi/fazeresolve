// Arquivo: src/models/agendamento.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Subdocumento para as mensagens dentro do agendamento
const mensagemSchema = new Schema({
    remetente: {
        type: String, // Ex: "Prestador" ou "Cliente"
        required: true
    },
    nomeRemetente: {
        type: String, // Ex: "Nome do Usuário Logado" ou "Nome do Cliente"
        required: true
    },
    texto: {
        type: String,
        required: true,
        trim: true
    },
    dataEnvio: {
        type: Date,
        default: Date.now
    }
}, { _id: true, timestamps: true });


const agendamentoSchema = new Schema({
    contaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conta',
        required: true,
        index: true
    },
    dataHoraInicio: { type: Date, required: true },
    dataHoraFim: { type: Date, required: true },
    servico: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico', required: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    observacoes: { type: String, trim: true },
    mensagens: [mensagemSchema] // Array de mensagens
});

// Validação customizada para garantir que dataHoraFim seja posterior a dataHoraInicio
agendamentoSchema.path('dataHoraFim').validate(function(value) {
    return this.dataHoraInicio < value;
}, 'Data de fim deve ser posterior à data de início');

module.exports = mongoose.model('Agendamento', agendamentoSchema);
