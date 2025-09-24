const ModeloDeServico = require('../models/modeloDeServico.model');

/**
 * Avalia se uma condição é atendida com base nos parâmetros fornecidos.
 * @param {object} condicao - A condição da regra.
 * @param {object} parametrosRecebidos - Os parâmetros fornecidos pelo usuário.
 * @returns {boolean} - Verdadeiro se a condição for atendida.
 */
const avaliarCondicao = (condicao, parametrosRecebidos) => {
  const valorRecebido = parametrosRecebidos[condicao.parametroId];
  if (valorRecebido === undefined) {
    return false;
  }

  switch (condicao.operador) {
    case 'igual':
      return valorRecebido === condicao.valor;
    case 'maior_que':
      return Number(valorRecebido) > Number(condicao.valor);
    case 'menor_que':
      return Number(valorRecebido) < Number(condicao.valor);
    // Adicionar mais operadores conforme necessário (ex: 'diferente', 'contem', etc.)
    default:
      return false;
  }
};

/**
 * Aplica uma ação a um valor base.
 * @param {number} valorBase - O valor inicial.
 * @param {object} acao - A ação a ser aplicada.
 * @returns {number} - O novo valor após a ação.
 */
const aplicarAcao = (valorBase, acao) => {
  switch (acao.tipo) {
    case 'adicionar':
      return valorBase + acao.valor;
    case 'definir':
      return acao.valor;
    case 'multiplicar':
        return valorBase * acao.valor;
    default:
      return valorBase;
  }
};

/**
 * Calcula o custo de um serviço com base em um modelo e parâmetros.
 * @param {string} modeloId - O ID do modelo de serviço.
 * @param {string} userId - O ID do usuário para garantir a propriedade.
 * @param {object} parametrosRecebidos - Objeto com os valores dos parâmetros. Ex: { "param_tamanho": "4 Lugares" }
 * @returns {object} - O resultado do cálculo.
 */
exports.calcularPrecoPorModelo = async (modeloId, userId, parametrosRecebidos) => {
  const modelo = await ModeloDeServico.findOne({ _id: modeloId, userId: userId });

  if (!modelo) {
    throw new Error('Modelo de serviço não encontrado ou não pertence ao usuário.');
  }

  const resultado = {
    maoDeObra: {
      horas: modelo.regrasCusto.maoDeObra.horasBase
    },
    materiais: []
  };

  // 1. Calcular Mão de Obra
  let horasCalculadas = modelo.regrasCusto.maoDeObra.horasBase;
  for (const regra of modelo.regrasCusto.maoDeObra.regras) {
    if (avaliarCondicao(regra.condicao, parametrosRecebidos)) {
      horasCalculadas = aplicarAcao(horasCalculadas, regra.acao);
    }
  }
  resultado.maoDeObra.horas = horasCalculadas;

  // 2. Calcular Materiais
  for (const material of modelo.regrasCusto.materiais) {
    let quantidadeCalculada = material.quantidadeBase;
    for (const regra of material.regras) {
      if (avaliarCondicao(regra.condicao, parametrosRecebidos)) {
        quantidadeCalculada = aplicarAcao(quantidadeCalculada, regra.acao);
      }
    }
    resultado.materiais.push({
      id: material.id,
      nomeRequisito: material.nomeRequisito,
      unidadeMedida: material.unidadeMedida,
      quantidade: quantidadeCalculada
    });
  }

  return resultado;
};
