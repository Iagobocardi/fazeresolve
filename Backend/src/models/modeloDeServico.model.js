const mongoose = require('mongoose');
const { Schema } = mongoose;

const parametroSchema = new Schema({
  id: { type: String, required: true },
  nome: { type: String, required: true },
  tipo: { type: String, required: true, enum: ['lista', 'numero'] },
  opcoes: [{ type: String }]
}, { _id: false });

const condicaoSchema = new Schema({
  parametroId: { type: String, required: true },
  operador: { type: String, required: true },
  valor: { type: Schema.Types.Mixed, required: true }
}, { _id: false });

const acaoSchema = new Schema({
  tipo: { type: String, required: true, enum: ['adicionar', 'definir', 'multiplicar'] },
  valor: { type: Number, required: true }
}, { _id: false });

const regraSchema = new Schema({
  condicao: { type: condicaoSchema, required: true },
  acao: { type: acaoSchema, required: true }
}, { _id: false });

const maoDeObraSchema = new Schema({
  horasBase: { type: Number, required: true, min: 0 },
  regras: [regraSchema]
}, { _id: false });

const materialSchema = new Schema({
  id: { type: String, required: true },
  nomeRequisito: { type: String, required: true },
  unidadeMedida: { type: String, required: true },
  quantidadeBase: { type: Number, required: true, min: 0 },
  regras: [regraSchema]
}, { _id: false });

const modeloDeServicoSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  nome: {
    type: String,
    required: true,
    trim: true
  },
  parametros: [parametroSchema],
  regrasCusto: {
    maoDeObra: { type: maoDeObraSchema, required: true },
    materiais: [materialSchema]
  }
}, {
  timestamps: true,
  collection: 'modelosDeServico'
});

modeloDeServicoSchema.index({ userId: 1, nome: 1 }, { unique: true });

const ModeloDeServico = mongoose.model('ModeloDeServico', modeloDeServicoSchema);

module.exports = ModeloDeServico;
