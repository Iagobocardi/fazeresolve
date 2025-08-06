// Arquivo: src/models/orcamento.model.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { Schema } = mongoose;

// Sub-schema para as tarefas do checklist
const tarefaSchema = new Schema({
    descricao: { type: String, required: true },
    concluida: { type: Boolean, default: false }
});

const orcamentoSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['Aceito', 'Pendente', 'Rejeitado', 'Agendado', 'Finalizado'],
        default: 'Pendente',
        trim: true
    },
    data: { type: Date, default: Date.now },
    valorProposto: { type: Number, min: 0, default: 0 },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    descricao: { type: String },
    media: [{ url: String, sid: String }],
    tipo: {
        type: String,
        enum: ['ORCAMENTO', 'RETIRADA', 'ENTREGA', 'ACOMPANHAMENTO', 'OUTRO'],
        default: 'ORCAMENTO'
    },
    shortId: { type: String, unique: true },
    dataAgendamento: { type: Date },
    address: { type: String },

    // --- Campos de Satisfação ---
    dataFinalizacao: {
        type: Date
    },
    pesquisaEnviada: {
        type: Boolean,
        default: false
    },
    notaSatisfacao: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: {
        type: String,
        trim: true
    },
     dataPagamento: {
        type: Date
},
    // --- Campos de Notas e Histórico ---
    notasInternas: {
        type: String,
        trim: true,
        default: ''
    },
    historico: [{
        evento: { type: String, required: true },
        data: { type: Date, default: Date.now }
    }],
    
    
    // =======================================================
    // 👉 O CAMPO DE PAGAMENTO FOI MOVIDO PARA AQUI DENTRO
    // =======================================================
    pagamentos: [{
    valor: { type: Number, required: true },
    data: { type: Date, default: Date.now },
    metodo: { 
        type: String, 
        enum: ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'], 
        default: 'Pix' 
    },
    observacao: { type: String, trim: true, maxLength: 100 }
}],
    publicId: {
        type: String,
        unique: true,
    },
     // =======================================================
    // ==> NOVOS CAMPOS ADICIONADOS AQUI <==
    // =======================================================
       materiaisUsados: [{
        produto: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Produto',
            required: true
        },
        quantidade: {
            type: Number,
            required: true,
            min: 1
        },
        // Guarda o custo do material no momento do uso, para relatórios financeiros precisos
        custoNoMomento: { 
            type: Number,
            required: true
        }
    }],

      // Campo para anotações de medidas e detalhes técnicos
    anotacoesTecnicas: {
        type: String,
        trim: true,
        default: ''
    },

    // Campo para guardar as fotos tiradas pelo prestador (ex: fotos do "antes e depois")
    fotosServico: [{
        url: String, // URL da imagem
        descricao: String, // Descrição opcional (ex: "Antes da pintura")
        dataEnvio: { type: Date, default: Date.now }
    }],

    // Campo para registrar os custos com materiais
    custosMateriais: [{
        descricao: { type: String, required: true },
        valor: { type: 'Decimal128', required: true, get: v => parseFloat(v.toString()) },
        data: { type: Date, default: Date.now }
    }],
     

    // Campo para lembretes sobre a nota fiscal
    lembreteNotaFiscal: {
        type: String,
        trim: true,
        default: ''
    },
     sugestaoAgendamentoCliente: {
        type: String
    },
     checklist: [tarefaSchema]
}, { 
    timestamps: true,
    toJSON: { getters: true }, // Garante que o 'get' do Decimal128 funcione
    toObject: { getters: true }
}); // <--- FIM DO OBJETO DO SCHEMA

orcamentoSchema.pre('save', function(next) {
    // 'this' refere-se ao documento que está a ser salvo
    if (this.isNew) { // Só executa se for um documento novo
        if (!this.shortId) {
            this.shortId = this._id.toString().slice(-6);
        }
        if (!this.publicId) {
            // Gera um ID único e seguro como: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
            this.publicId = uuidv4(); 
        }
    }
    next();
});


// O CÓDIGO INCORRETO QUE ESTAVA FLUTUANDO AQUI FOI REMOVIDO.

module.exports = mongoose.model('Orcamento', orcamentoSchema);