// 1. Importar os modelos Mongoose necessários
const Produto = require('../models/produto.model');
const MovimentoEstoque = require('../models/movimentoEstoque.model');

/**
 * Adiciona uma lista de itens ao estoque a partir de uma leitura de nota fiscal.
 * Se o produto já existe, incrementa a quantidade. Se não, cria um novo produto.
 * Para cada alteração, regista um movimento de estoque.
 */
const addItemsInBatch = async (req, res) => {
  // Extrai a lista de itens do corpo da requisição.
  const { items } = req.body;

  // Validação básica para garantir que recebemos os itens.
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Nenhum item fornecido para adicionar ao estoque.' });
  }

  try {
    const results = [];
    // Itera sobre cada item recebido do frontend.
    for (const item of items) {
      const { produto: nomeProduto, quantidade } = item;

      // Garante que temos os dados necessários para cada item.
      if (!nomeProduto || quantidade == null || quantidade <= 0) {
        results.push({ produto: nomeProduto || 'Desconhecido', status: 'falhou', motivo: 'Dados incompletos ou quantidade inválida.' });
        continue; // Pula para o próximo item
      }

      // 4. Procura por um produto existente no banco de dados com o mesmo nome (case-insensitive).
      let existingProduct = await Produto.findOne({ nome: new RegExp(`^${nomeProduto}$`, 'i') });

      if (existingProduct) {
        // 5. Se o produto existe, atualiza a sua quantidade.
        existingProduct.quantidadeEmEstoque += quantidade;
        await existingProduct.save();
        
        // Regista o movimento de entrada
        const movimento = new MovimentoEstoque({
          produto: existingProduct._id,
          tipo: 'Entrada',
          quantidade: quantidade,
          motivo: 'Entrada via Nota Fiscal (IA)'
        });
        await movimento.save();
        
        results.push({ produto: existingProduct.nome, status: 'atualizado', novaQuantidade: existingProduct.quantidadeEmEstoque });
      } else {
        // 6. Se o produto não existe, cria um novo.
        const novoProduto = new Produto({
          nome: nomeProduto,
          quantidadeEmEstoque: quantidade,
          // Pode definir outros valores padrão se desejar
          // descricao: 'Produto cadastrado via IA',
          // custoUnitario: 0, 
        });
        await novoProduto.save();

        // Regista o movimento de estoque inicial para o novo produto
        const movimento = new MovimentoEstoque({
          produto: novoProduto._id,
          tipo: 'Entrada',
          quantidade: quantidade,
          motivo: 'Estoque inicial via Nota Fiscal (IA)'
        });
        await movimento.save();

        results.push({ produto: novoProduto.nome, status: 'criado', quantidade: novoProduto.quantidadeEmEstoque });
      }
    }

    // 7. Responde com sucesso e um resumo das operações.
    res.status(201).json({ message: 'Operação de estoque concluída com sucesso.', results });

  } catch (error) {
    console.error('Erro ao adicionar itens ao estoque:', error);
    // Verifica se é um erro de validação do Mongoose
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Erro de validação.', error: error.message });
    }
    res.status(500).json({ message: 'Ocorreu um erro no servidor ao processar o estoque.' });
  }
};

module.exports = {
  addItemsInBatch,
};
