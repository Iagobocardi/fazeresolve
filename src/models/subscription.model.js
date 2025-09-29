// Em: src/models/assinatura.model.js (renomeado de subscription.model.js no contexto da aplicação)
const mongoose = require('mongoose');
const { Schema } = mongoose;

const assinaturaSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    unique: true
  },
  planoId: {
    type: String,
    required: true,
  },
  gateway: {
    type: String,
    default: 'mercadopago'
  },
  gatewaySubscriptionId: {
    type: String,
    unique: true,
    sparse: true // Permite valores nulos, mas garante que os não-nulos sejam únicos.
  },
  gatewayCustomerId: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['pendente_confirmacao', 'ativa', 'pagamento_pendente', 'pausada', 'cancelada'],
    required: true
  },
  dataInicio: {
    type: Date,
    default: Date.now
  },
  dataProximaCobranca: {
    type: Date
  },
  carenciaExpiraEm: {
    type: Date
  }
}, { timestamps: true });

// O mongoose por padrão pluraliza o nome do modelo para criar a coleção.
// 'Assinatura' -> 'assinaturas'
const Assinatura = mongoose.model('Assinatura', assinaturaSchema);

module.exports = Assinatura;