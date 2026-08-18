const mongoose = require('mongoose');

const transacaoSchema = new mongoose.Schema({
    contaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conta',
        required: true,
        index: true
    },
    tipo: {
        type: String,
        enum: ['Receita', 'Despesa'],
        required: true,
        index: true
    },
    descricao: {
        type: String,
        required: true,
        trim: true
    },
    valor: {
        type: Number,
        required: true
    },
    categoria: {
        type: String,
        trim: true,
        default: 'Outros'
    },
    data: {
        type: Date,
        default: Date.now,
        index: true
    },
    orcamentoAssociado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Orcamento'
    },
    fornecedorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Fornecedor',
        index: true
    },
    metodoPagamento: {
        type: String,
        trim: true
    },
    comprovanteUrl: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Para garantir que o valor seja sempre positivo, embora o tipo ('Receita'/'Despesa') o diferencie.
transacaoSchema.pre('save', function(next) {
    if (this.valor < 0) {
        this.valor = this.valor * -1;
    }
    next();
});

const Transacao = mongoose.model('Transacao', transacaoSchema);

module.exports = Transacao;
