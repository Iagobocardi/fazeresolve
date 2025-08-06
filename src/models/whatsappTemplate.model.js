const mongoose = require('mongoose');
const { Schema } = mongoose;

const whatsappTemplateSchema = new Schema({
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
        enum: ['Orçamento', 'Agendamento', 'Acompanhamento', 'Outros'],
        default: 'Outros'
    }
}, { timestamps: true });

const WhatsappTemplate = mongoose.model('WhatsappTemplate', whatsappTemplateSchema);

module.exports = WhatsappTemplate;
