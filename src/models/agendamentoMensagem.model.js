const mongoose = require('mongoose');
const { Schema } = mongoose;

const agendamentoMensagemSchema = new Schema({
    contaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conta',
        required: true,
        index: true
    },
    clienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: true
    },
    mensagem: {
        type: String,
        required: true,
        trim: true
    },
    dataEnvio: {
        type: Date,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pendente', 'enviado', 'falhou'],
        default: 'pendente',
        index: true
    },
    erro: {
        type: String // Para armazenar a mensagem de erro em caso de falha
    }
}, {
    timestamps: true
});

const AgendamentoMensagem = mongoose.model('AgendamentoMensagem', agendamentoMensagemSchema);

module.exports = AgendamentoMensagem;
