const mongoose = require('mongoose');
const { Schema } = mongoose;

const areaDeAtuacaoSchema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nome: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'areasDeAtuacao'
});

const AreaDeAtuacao = mongoose.model('AreaDeAtuacao', areaDeAtuacaoSchema);

module.exports = AreaDeAtuacao;
