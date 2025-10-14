const mongoose = require('mongoose');
const { Schema } = mongoose;
const { encrypt, decrypt } = require('../services/crypto.service.js');

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
    acessoValidoAte: {
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
    mercadoPagoCredentials: {
        userId: { type: String, trim: true },
        publicKey: { type: String, trim: true },
        accessToken: { type: String, trim: true, set: encrypt, get: decrypt },
        refreshToken: { type: String, trim: true, set: encrypt, get: decrypt },
        expiresAt: { type: Date },
        connectedAt: { type: Date },
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

    // Integração WhatsApp (Twilio)
    isWhatsappConnected: { type: Boolean, default: false },
    whatsappProvider: { type: String, enum: ['MANUAL_TWILIO', 'OAUTH_META'], default: 'MANUAL_TWILIO' },
    
    // Para o fluxo MANUAL_TWILIO (legado)
    twilioAccountSid: { type: String, trim: true, set: encrypt, get: decrypt },
    twilioAuthToken: { type: String, trim: true, set: encrypt, get: decrypt },
    whatsappSender: { type: String, trim: true }, // O número de WhatsApp registrado
    whatsappSenderSid: { type: String, trim: true }, // O SID do Sender (XE...)

    // Para o fluxo OAUTH_META (novo)
    whatsappAccessToken: { type: String, set: encrypt, get: decrypt },
    whatsappRefreshToken: { type: String, set: encrypt, get: decrypt },
    whatsappTokenExpiresAt: { type: Date },
    whatsappPhoneNumberId: { type: String, trim: true }, // ID do número de telefone para envio

}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

const Conta = mongoose.model('Conta', contaSchema);

module.exports = Conta;
