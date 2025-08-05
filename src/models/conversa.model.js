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
    cliente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: true,
        unique: true
    },
    mensagens: [mensagemSchema],
    lidaPeloPrestador: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Conversa = mongoose.model('Conversa', conversaSchema);

module.exports = Conversa;
