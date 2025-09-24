const mongoose = require('mongoose');
const { Schema } = mongoose;

const catalogoMercadoSchema = new Schema({
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
  precoMedioMin: {
    type: Number,
    required: true
  },
  precoMedioMax: {
    type: Number,
    required: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  areasDeAtuacao: [{
    type: String,
    ref: 'AreaDeAtuacao'
  }]
}, {
  timestamps: true,
  collection: 'catalogoMercado'
});

catalogoMercadoSchema.index({ nome: 1, categoria: 1 });
catalogoMercadoSchema.index({ areasDeAtuacao: 1 });

const CatalogoMercado = mongoose.model('CatalogoMercado', catalogoMercadoSchema);

module.exports = CatalogoMercado;
