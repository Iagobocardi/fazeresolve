const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificacaoSchema = new Schema({
    contaId: {
        type: Schema.Types.ObjectId,
        ref: 'Conta',
        required: true,
        index: true
    },
    mensagem: {
        type: String,
        required: true
    },
    lida: {
        type: Boolean,
        default: false,
        index: true
    },
    // Adicionando um campo de tipo para futuras expansões (ex: 'PAGAMENTO', 'NOVO_RECURSO', etc.)
    tipo: {
        type: String,
        enum: ['PAGAMENTO', 'SISTEMA', 'GERAL'],
        default: 'GERAL'
    }
}, {
    timestamps: true
});

const Notificacao = mongoose.model('Notificacao', notificacaoSchema);

module.exports = Notificacao;
