// Arquivo: src/models/cliente.model.js
// Refatorado para representar apenas o cliente final de um prestador de serviço.

const mongoose = require('mongoose');
const { Schema } = mongoose;

const clienteSchema = new Schema({
    // Adiciona a referência à conta do prestador à qual este cliente pertence.
    contaId: {
        type: Schema.Types.ObjectId,
        ref: 'Conta',
        required: true,
        index: true // Adiciona um índice para otimizar as buscas por conta.
    },

    nome: { type: String, required: true, trim: true },
    telefone: { type: String, required: true, trim: true },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        sparse: true 
    },

    // Endereço do cliente final
    endereco: {
        logradouro: String,
        numero: String,
        bairro: String,
        cidade: String,
        estado: String,
        cep: String,
        codigo_municipio: String,
    },

    // Mantém o estado da conversa para interações via WhatsApp/chatbot
    conversationState: {
        type: String,
        enum: ['NONE', 'AWAITING_REQUEST_TYPE', 'AWAITING_SERVICE_TYPE', 'AWAITING_ADDRESS', 'AWAITING_AVAILABILITY', 'COMPLETED', 'AWAITING_ORDER_SELECTION', 'AWAITING_RATING'],
        default: 'NONE'
    },

    // Mantém a demanda atual para o fluxo do chatbot
    currentDemand: {
        requestType: String,
        description: String,
        address: String,
        availability: String,
        media: [{ url: String, sid: String }],
        pendingOrderIds: [mongoose.Schema.Types.ObjectId]
    },

    // Mantém o contexto ativo para saber a qual orçamento uma mensagem se refere
    activeContext: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Orcamento',
        default: null
    },

    // Campos denormalizados para performance na listagem
    totalPedidos: {
        type: Number,
        default: 0
    },
    valorTotalGasto: {
        type: Number,
        default: 0
    },

}, {
    timestamps: true
}); 

// Garante que a combinação de telefone e contaId seja única.
// Um mesmo número de telefone pode ser cliente de múltiplos prestadores.
clienteSchema.index({ telefone: 1, contaId: 1 }, { unique: true });

// O hook de 'pre-save' para hashear a senha foi removido, pois a autenticação
// será gerenciada pelo modelo 'Usuario'.

module.exports = mongoose.model('Cliente', clienteSchema);
