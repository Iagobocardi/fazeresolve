const mongoose = require('mongoose');

const mensagemSchema = new mongoose.Schema({
    remetente: {
        type: String,
        required: true,
        enum: ['cliente', 'prestador']
    },
    texto: {
        type: String
    },
    mediaUrl: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const conversaSchema = new mongoose.Schema({
    contaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conta',
        required: true,
        index: true
    },
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: true,
    },
    mensagens: [mensagemSchema],
    lidaPeloPrestador: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Garante que só pode haver uma conversa por cliente POR CONTA.
conversaSchema.index({ cliente: 1, contaId: 1 }, { unique: true });

const Conversa = mongoose.model('Conversa', conversaSchema);

module.exports = Conversa;
