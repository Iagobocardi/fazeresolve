// Arquivo: src/models/agendamento.model.js
const mongoose = require('mongoose');

const agendamentoSchema = new mongoose.Schema({
    contaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conta',
        required: true,
        index: true
    },
    dataHoraInicio: { type: Date, required: true },
    dataHoraFim: { type: Date, required: true },
    servico: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico', required: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true }, // Referencia ao cliente
    observacoes: { type: String, trim: true },
});

// Validação customizada para garantir que dataHoraFim seja posterior a dataHoraInicio
agendamentoSchema.path('dataHoraFim').validate(function(value) {
    return this.dataHoraInicio < value;
}, 'Data de fim deve ser posterior à data de início');

module.exports = mongoose.model('Agendamento', agendamentoSchema);
