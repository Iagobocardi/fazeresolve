// Arquivo: src/models/cliente.model.js
const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
    nome: { type: String, required: true, trim: true }, // Adicionado trim para remover espaços extras
    telefone: { type: String, required: true, unique: true, trim: true }, // Adicionado unique e trim
    historicoServicos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Servico' }],
    localizacao: {
        latitude: Number,
        longitude: Number,
    },
    dataCadastro: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Cliente', clienteSchema);