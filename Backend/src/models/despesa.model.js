// Arquivo: src/models/despesa.model.js

const mongoose = require('mongoose');

const despesaSchema = new mongoose.Schema({
    descricao: {
        type: String,
        required: [true, 'A descrição da despesa é obrigatória.'],
        trim: true
    },
    valor: {
        type: Number,
        required: [true, 'O valor da despesa é obrigatório.'],
        min: [0.01, 'O valor da despesa deve ser positivo.']
    },
    categoria: {
        type: String,
        // Lista de categorias pré-definidas para facilitar a organização
        enum: ['Material', 'Custo Fixo', 'Imposto', 'Marketing', 'Outro'],
        default: 'Outro'
    },
    data: {
        type: Date,
        default: Date.now // A data padrão será o momento do registo
    },
     orcamentoAssociado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Orcamento', // Referencia o modelo de Orçamento
        default: null
    }
}, {
    timestamps: true, // Adiciona os campos createdAt e updatedAt automaticamente
     toJSON: { getters: true },
    toObject: { getters: true }
});


const Despesa = mongoose.model('Despesa', despesaSchema);

module.exports = Despesa;