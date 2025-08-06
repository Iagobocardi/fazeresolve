// src/models/configuracao.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const configuracaoSchema = new Schema({
    // No futuro, isto pode ser associado a um utilizador específico
    // user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Dados da Empresa
    nomeEmpresa: { type: String, trim: true },
    documento: { type: String, trim: true }, // NIF, CNPJ, etc.
    telefoneEmpresa: { type: String, trim: true },
    emailEmpresa: { type: String, trim: true },
    website: { type: String, trim: true },
    logoUrl: { type: String, trim: true },

    // Endereço
    endereco: { type: String, trim: true },
    cidade: { type: String, trim: true },
    estado: { type: String, trim: true },
    cep: { type: String, trim: true },
     // --- NOVOS CAMPOS PARA INTEGRAÇÕES ---
    googleCalendarConnected: {
        type: Boolean,
        default: false
    },
    googleCalendarEmail: {
        type: String,
        default: ''
    },
    googleTokens: {
        access_token: String,
        refresh_token: String,
        scope: String,
        token_type: String,
        expiry_date: Number
    },
    // ------------------------------------

    // Mensagens Personalizadas
    mensagemBoasVindas: {
        type: String,
        default: 'Olá, {cliente}! Bem-vindo(a) ao {empresa}. Como podemos ajudar hoje?'
    },
      // whatsapp
    whatsappMode: {
        type: String,
        enum: ['assistido', 'completo'], // Apenas estes dois valores são permitidos
        default: 'assistido' // Define 'assistido' como o padrão para novos utilizadores
    },
    // Configurações de Alertas
    diasParaAlertaPendente: {
        type: Number,
        default: 3,
        min: 1
    }
}, {
    timestamps: true
});

// Criamos um método estático para obter a configuração (ou criar uma, se não existir)
// Isto garante que temos sempre um único documento de configuração para trabalhar
configuracaoSchema.statics.obterConfiguracao = async function() {
    let config = await this.findOne();
    if (!config) {
        config = await this.create({});
    }
    return config;
};

const Configuracao = mongoose.model('Configuracao', configuracaoSchema);

module.exports = Configuracao;  