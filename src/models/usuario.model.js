// Em: src/models/usuario.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const usuarioSchema = new Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false }, // select: false para não vir por padrão
    
    // Adiciona a referência à conta à qual o usuário pertence.
    contaId: {
        type: Schema.Types.ObjectId,
        ref: 'Conta',
        required: true
    },

    // Define o papel do usuário dentro da conta.
    role: {
        type: String,
        enum: ['Dono', 'Membro', 'Admin'], // O Admin é um superusuário da plataforma
        default: 'Dono'
    },

    // Lista de permissões específicas para o usuário (granular)
    permissoes: {
        type: [String],
        default: []
    }

}, { timestamps: true });

// Hash da password antes de salvar
usuarioSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;