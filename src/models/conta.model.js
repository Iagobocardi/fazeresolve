const mongoose = require('mongoose');
const { Schema } = mongoose;

const contaSchema = new Schema({
    nome: { type: String, required: true, trim: true },

    // Plano e Assinatura
    plano: {
        type: String,
        enum: ['Essencial', 'Profissional', 'Premium'], // Admin não é um plano de conta
        default: 'Essencial'
    },
    statusAssinatura: {
        type: String,
        enum: ['AGUARDANDO_PAGAMENTO', 'ATIVO', 'EM_ATRASO', 'INATIVO'],
        default: 'AGUARDANDO_PAGAMENTO'
    },
    gracePeriodExpiresAt: {
        type: Date,
        default: null,
    },
    planId: { type: String },
    mercadoPagoSubscriptionId: { type: String },

    // Informações da Empresa para Nota Fiscal
    companyInfo: {
        nomeFantasia: String,
        razaoSocial: String,
        cnpj: { type: String, unique: true, sparse: true }, // CNPJ should be unique across accounts
        inscricaoEstadual: String,
        inscricaoMunicipal: String,
        codigoMunicipio: String,
        endereco: {
            logradouro: String,
            numero: String,
            bairro: String,
            cidade: String,
            estado: String,
            cep: String,
        }
    },

    // Configurações de Pagamento do Prestador
    metodoRecebimento: {
        type: String,
        enum: ['MERCADOPAGO', 'MANUAL'],
        default: 'MANUAL'
    },
    credenciaisMercadoPago: {
        type: Object
    },
    chavePixManual: {
        type: String,
        trim: true
    },

    // Integração Focus NFe
    focusNFeId: { type: String }, // Para o ID da empresa na Focus NFe
    focusNFeApiToken: {
        type: String,
        trim: true
    },
    focusNFeConnected: {
        type: Boolean,
        default: false
    },

    // Integração Google (a ser reavaliado se deve ser por usuário)
    googleCalendarConnected: {
        type: Boolean,
        default: false
    },
    googleTokens: {
        access_token: String,
        refresh_token: String,
        scope: String,
        token_type: String,
        expiry_date: Number,
    },
    googleAccountEmail: {
        type: String,
        trim: true
    },

}, {
    timestamps: true
});

const Conta = mongoose.model('Conta', contaSchema);

module.exports = Conta;
