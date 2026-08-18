const mongoose = require('mongoose');
const { Schema } = mongoose;

const itemSchema = new Schema({
    descricao: { type: String, required: true },
    quantidade: { type: Number, required: true },
    valorUnitario: { type: Number, required: true }
}, { _id: false });

const clienteNotaSchema = new Schema({
    nome: { type: String, required: true },
    documento: { type: String }, // CPF ou CNPJ
    email: { type: String },
    endereco: {
        logradouro: String,
        numero: String,
        bairro: String,
        cidade: String,
        estado: String,
        cep: String,
    }
}, { _id: false });

const notaFiscalSchema = new Schema({
    contaId: {
        type: Schema.Types.ObjectId,
        ref: 'Conta',
        required: true,
        index: true
    },
    prestador: { // Mantido como referência ao usuário que emitiu
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    cliente: { type: clienteNotaSchema, required: true },
    numero: { type: Number, required: true },
    serie: { type: Number, required: true },
    status: {
        type: String,
        enum: ['rascunho', 'processando_emissao', 'autorizada', 'erro_emissao', 'cancelada'],
        default: 'rascunho',
        required: true
    },
    items: [itemSchema],
    valorTotal: { type: Number, required: true, min: 0 },

    // Campos específicos para NFS-e (Serviço)
    servico: {
        aliquota: Number,
        discriminacao: String,
        iss_retido: Boolean,
        item_lista_servico: String,
        codigo_tributario_municipio: String,
    },

    // Campos para armazenar a resposta da API de NFe
    focusNFeId: { type: String }, // ID da nota na Focus NFe
    focusNFeResponse: { type: Object },
    pdfUrl: { type: String, trim: true },
    xmlUrl: { type: String, trim: true },

    // Se a nota foi gerada a partir de um orçamento
    orcamentoOrigem: {
        type: Schema.Types.ObjectId,
        ref: 'Orcamento'
    }
}, {
    timestamps: true
});

// Index para otimizar buscas por prestador e status
notaFiscalSchema.index({ prestador: 1, status: 1 });

const NotaFiscal = mongoose.model('NotaFiscal', notaFiscalSchema);

module.exports = NotaFiscal;
