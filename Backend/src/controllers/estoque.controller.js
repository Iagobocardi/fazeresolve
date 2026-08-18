const Produto = require('../models/produto.model');
const MovimentoEstoque = require('../models/movimentoEstoque.model');

const addItemsInBatch = async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Nenhum item fornecido para adicionar ao estoque.' });
  }

  try {
    const results = [];
    for (const item of items) {
      // Agora também recebemos a 'unidade' e 'imagemUrl'
      const { produto: nomeProduto, quantidade, imagemUrl, unidade } = item;

      if (!nomeProduto || quantidade == null || quantidade <= 0) {
        results.push({ produto: nomeProduto || 'Desconhecido', status: 'falhou', motivo: 'Dados incompletos ou quantidade inválida.' });
        continue;
      }

      let existingProduct = await Produto.findOne({ nome: new RegExp(`^${nomeProduto}$`, 'i') });

      if (existingProduct) {
        existingProduct.quantidadeEmEstoque += quantidade;
        // Atualiza a imagem e a unidade se forem fornecidas
        if (imagemUrl) { existingProduct.imagemUrl = imagemUrl; }
        if (unidade) { existingProduct.unidade = unidade; }
        await existingProduct.save();
        
        const movimento = new MovimentoEstoque({ produto: existingProduct._id, tipo: 'Entrada', quantidade: quantidade, motivo: 'Entrada via Nota Fiscal (IA)' });
        await movimento.save();
        
        results.push({ produto: existingProduct.nome, status: 'atualizado', novaQuantidade: existingProduct.quantidadeEmEstoque });
      } else {
        // Inclui 'unidade' e 'imagemUrl' ao criar o novo produto
        const novoProduto = new Produto({
          nome: nomeProduto,
          quantidadeEmEstoque: quantidade,
          unidade: unidade || 'Unidade', // Guarda a unidade selecionada ou um padrão
          imagemUrl: imagemUrl || '' 
        });
        await novoProduto.save();

        const movimento = new MovimentoEstoque({ produto: novoProduto._id, tipo: 'Entrada', quantidade: quantidade, motivo: 'Estoque inicial via Nota Fiscal (IA)' });
        await movimento.save();

        results.push({ produto: novoProduto.nome, status: 'criado', quantidade: novoProduto.quantidadeEmEstoque });
      }
    }

    res.status(201).json({ message: 'Operação de estoque concluída com sucesso.', results });

  } catch (error) {
    console.error('Erro ao adicionar itens ao estoque:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Erro de validação.', error: error.message });
    }
    res.status(500).json({ message: 'Ocorreu um erro no servidor ao processar o estoque.' });
  }
};

module.exports = {
  addItemsInBatch,
};
