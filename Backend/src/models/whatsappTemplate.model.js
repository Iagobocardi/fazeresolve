const mongoose = require('mongoose');
const { Schema } = mongoose;

const whatsappTemplateSchema = new Schema({
    contaId: {
        type: Schema.Types.ObjectId,
        ref: 'Conta',
        required: true,
        index: true
    },
    titulo: {
        type: String,
        required: [true, 'O título do template é obrigatório.'],
        trim: true
    },
    mensagem: {
        type: String,
        required: [true, 'A mensagem do template é obrigatória.'],
    },
    categoria: {
        type: String,
        required: [true, 'A categoria do template é obrigatória.'],
        enum: ['Orçamento', 'Agendamento', 'LEMBRETE', 'Acompanhamento', 'Outros', 'AVALIACAO'],
        default: 'Outros'
    }
}, { timestamps: true });

const WhatsappTemplate = mongoose.model('WhatsappTemplate', whatsappTemplateSchema);

module.exports = WhatsappTemplate;
