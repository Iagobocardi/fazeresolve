// Arquivo: src/models/cliente.model.js - VERSÃO ATUALIZADA

const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
    // O nome agora não é mais obrigatório na criação
nome: { type: String, trim: true },
    telefone: { type: String, required: true, unique: true, trim: true },
    historicoServicos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Servico' }],
    localizacao: {
        latitude: Number,
        longitude: Number,
        // É uma boa prática guardar também o endereço por extenso que o cliente forneceu
        enderecoCompleto: { type: String, trim: true } 
    },
    dataCadastro: { type: Date, default: Date.now },

    // --- CAMPOS ADICIONADOS PARA O BOT CONVERSACIONAL ---

    /**
     * Campo para controlar em qual estágio da conversa o cliente está.
     * É a "memória" do nosso bot.
     */
    conversationState: {
      type: String,
      // 'enum' garante que o campo só pode ter um desses valores
      enum: ['NONE', 'AWAITING_SERVICE_TYPE', 'AWAITING_ADDRESS', 'AWAITING_AVAILABILITY', 'COMPLETED'],
      default: 'NONE' // O valor padrão quando um cliente é criado
    },

    /**
     * Objeto para armazenar temporariamente os dados que o bot está coletando
     * na conversa atual.
     */
    currentDemand: {
        description: String,
        address: String,
        availability: String
    }
});

module.exports = mongoose.model('Cliente', clienteSchema);