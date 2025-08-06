// Em: src/models/usuario.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const usuarioSchema = new Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false }, // select: false para não vir por padrão
    
    // --- O CAMPO MAIS IMPORTANTE ---
    plano: {
        type: String,
        enum: ['Essencial', 'Profissional', 'Premium', 'Admin'],
        default: 'Essencial'
    },
    
    // Futuramente, para integração com pagamentos
    // stripeCustomerId: String,
    // statusAssinatura: { type: String, default: 'ativo' }

}, { timestamps: true });

// Hash da password antes de salvar
usuarioSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;