// Em: src/models/membroEquipe.model.js

const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');

const membroEquipeSchema = new Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    
    // Link para a conta à qual o membro pertence
    contaId: {
        type: Schema.Types.ObjectId,
        ref: 'Conta', // Refere-se ao novo modelo Conta
        required: true
    },
    
    // Permissões futuras (opcional, mas bom para planear)
    // role: { type: String, enum: ['Admin', 'Membro'], default: 'Membro' }

}, { timestamps: true });

// Hash da password antes de salvar
membroEquipeSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

const MembroEquipe = mongoose.model('MembroEquipe', membroEquipeSchema);

module.exports = MembroEquipe;
