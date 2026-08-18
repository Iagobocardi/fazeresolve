const mongoose = require('mongoose');
const { Schema } = mongoose;

const catalogoPessoalSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Assuming the user model is named 'User'
    required: true,
    index: true
  },
  nome: {
    type: String,
    required: true,
    trim: true
  },
  categoria: {
    type: String,
    required: true,
    trim: true
  },
  unidadeMedida: {
    type: String,
    required: true,
    enum: ['m', 'un', 'm³', 'kg', 'm²']
  },
  meuPrecoCusto: {
    type: Number,
    required: true
  },
  meuPrecoVenda: {
    type: Number,
    required: true
  },
  lojaCompra: {
    type: String,
    trim: true
  },
  cidadeCompra: {
    type: String,
    trim: true
  },
  estadoCompra: {
    type: String,
    trim: true
  },
  origemMercadoId: {
    type: Schema.Types.ObjectId,
    ref: 'CatalogoMercado',
    required: false
  }
}, {
  timestamps: true,
  collection: 'catalogoPessoal'
});

catalogoPessoalSchema.index({ userId: 1, nome: 1 }, { unique: true });
catalogoPessoalSchema.index({ origemMercadoId: 1 });
catalogoPessoalSchema.index({ cidadeCompra: 1 });
catalogoPessoalSchema.index({ estadoCompra: 1 });


const CatalogoPessoal = mongoose.model('CatalogoPessoal', catalogoPessoalSchema);

module.exports = CatalogoPessoal;
