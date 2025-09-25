const CatalogoMercado = require('../models/catalogoMercado.model');
const CatalogoPessoal = require('../models/catalogoPessoal.model');
const mongoose = require('mongoose');

// === Funções do Catálogo de Mercado ===

// @desc    Buscar itens do catálogo de mercado por área de atuação
// @route   GET /api/catalogo/mercado?area=:areaDeAtuacao
// @access  Privado
exports.getItensMercado = async (req, res, next) => {
  try {
    const { area } = req.query;
    if (!area) {
      return res.status(400).json({ success: false, message: 'A área de atuação é obrigatória.' });
    }

    const itens = await CatalogoMercado.find({ areasDeAtuacao: { $in: [area] } });

    console.log(`[DEBUG] Itens encontrados para a área "${area}":`, itens.length);

    res.status(200).json({
      success: true,
      count: itens.length,
      data: itens
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calcular preços médios regionais
// @route   GET /api/catalogo/mercado/precos-regionais
// @access  Privado
exports.getPrecosRegionais = async (req, res, next) => {
  try {
    const { groupBy = 'cidade' } = req.query;

    const groupId = {
        origemMercadoId: '$origemMercadoId',
    };

    if (groupBy === 'cidade') {
        groupId.cidade = '$cidadeCompra';
    } else {
        groupId.estado = '$estadoCompra';
    }

    const precosRegionais = await CatalogoPessoal.aggregate([
      {
        $match: {
          origemMercadoId: { $ne: null },
          cidadeCompra: { $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: groupId,
          precoMedioRegional: { $avg: '$meuPrecoCusto' },
          count: { $sum: 1 }
        }
      },
      {
          $sort: {
              count: -1
          }
      }
    ]);

    res.status(200).json({
      success: true,
      count: precosRegionais.length,
      data: precosRegionais
    });

  } catch (error) {
    next(error);
  }
};


// === Funções do Catálogo Pessoal ===

// @desc    Buscar todos os itens do catálogo pessoal do usuário
// @route   GET /api/catalogo/pessoal
// @access  Privado
exports.getItensPessoais = async (req, res, next) => {
    try {
        const itens = await CatalogoPessoal.find({ userId: req.user._id });
        res.status(200).json({
            success: true,
            count: itens.length,
            data: itens
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Criar um novo item no catálogo pessoal
// @route   POST /api/catalogo/pessoal
// @access  Privado
exports.createItemPessoal = async (req, res, next) => {
    try {
        const itemData = { ...req.body, userId: req.user._id };
        const novoItem = await CatalogoPessoal.create(itemData);

        // TODO: Chamar serviço assíncrono para atualizar preços regionais
        // if (novoItem.cidadeCompra && novoItem.estadoCompra) {
        //   updateRegionalPrices(novoItem);
        // }

        res.status(201).json({
            success: true,
            data: novoItem
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Atualizar um item do catálogo pessoal
// @route   PUT /api/catalogo/pessoal/:id
// @access  Privado
exports.updateItemPessoal = async (req, res, next) => {
    try {
        const item = await CatalogoPessoal.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item não encontrado.' });
        }

        // Garante que o usuário só pode atualizar seus próprios itens
        if (item.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Não autorizado a atualizar este item.' });
        }

        const itemAtualizado = await CatalogoPessoal.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        // TODO: Chamar serviço assíncrono para atualizar preços regionais
        // if (itemAtualizado.cidadeCompra && itemAtualizado.estadoCompra) {
        //   updateRegionalPrices(itemAtualizado);
        // }

        res.status(200).json({
            success: true,
            data: itemAtualizado
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Deletar um item do catálogo pessoal
// @route   DELETE /api/catalogo/pessoal/:id
// @access  Privado
exports.deleteItemPessoal = async (req, res, next) => {
    try {
        const item = await CatalogoPessoal.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item não encontrado.' });
        }

        // Garante que o usuário só pode deletar seus próprios itens
        if (item.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Não autorizado a deletar este item.' });
        }

        await item.remove();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
