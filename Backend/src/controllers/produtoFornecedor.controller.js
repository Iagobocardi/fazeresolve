// src/controllers/produtoFornecedor.controller.js

const ProdutoFornecedor = require('../models/produtoFornecedor.model.js');
const Fornecedor = require('../models/fornecedor.model.js');

// Função para criar um novo produto para um fornecedor
exports.criarProduto = async (req, res) => {
    try {
        const { nome, preco, unidade, descricao, imagemUrl } = req.body;
        const { fornecedorId } = req.params;

        if (!nome || !preco) {
            return res.status(400).json({ message: "Nome e preço são obrigatórios." });
        }

        const fornecedor = await Fornecedor.findById(fornecedorId);
        if (!fornecedor) {
            return res.status(404).json({ message: "Fornecedor não encontrado." });
        }

        const novoProduto = new ProdutoFornecedor({
            nome,
            preco,
            unidade,
            descricao,
            imagemUrl,
            fornecedor: fornecedorId
        });

        const produtoSalvo = await novoProduto.save();
        res.status(201).json(produtoSalvo);

    } catch (error) {
        console.error("Erro ao criar produto de fornecedor:", error);
        res.status(500).json({ message: "Ocorreu um erro ao criar o produto." });
    }
};

// Função para listar todos os produtos de um fornecedor específico
exports.listarProdutosPorFornecedor = async (req, res) => {
    try {
        const { fornecedorId } = req.params;
        const produtos = await ProdutoFornecedor.find({ fornecedor: fornecedorId }).sort({ nome: 1 });
        res.status(200).json(produtos);
    } catch (error) {
        console.error("Erro ao listar produtos do fornecedor:", error);
        res.status(500).json({ message: "Ocorreu um erro ao buscar os produtos." });
    }
};