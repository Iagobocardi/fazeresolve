// src/controllers/fornecedor.controller.js

const Fornecedor = require('../models/fornecedor.model.js');

// Função para listar todos os fornecedores ativos
exports.listarFornecedores = async (req, res) => {
    try {
        const fornecedores = await Fornecedor.find({ ativo: true }).sort({ nome: 1 });
        res.status(200).json(fornecedores);
    } catch (error) {
        console.error("Erro ao listar fornecedores:", error);
        res.status(500).json({ message: "Ocorreu um erro ao buscar os fornecedores." });
    }
};
exports.criarFornecedor = async (req, res) => {
    try {
        const { nome, especialidade, contato } = req.body;

        // Validação simples para garantir que os campos obrigatórios foram enviados
        if (!nome || !especialidade || !contato) {
            return res.status(400).json({ message: "Todos os campos (nome, especialidade, contato) são obrigatórios." });
        }

        // Verifica se já existe um fornecedor com o mesmo nome para evitar duplicados
        const fornecedorExistente = await Fornecedor.findOne({ nome });
        if (fornecedorExistente) {
            return res.status(409).json({ message: "Já existe um fornecedor com este nome." });
        }

        const novoFornecedor = new Fornecedor({
            nome,
            especialidade,
            contato,
            // Adicione outros campos opcionais se eles vierem do formulário
        });

        const fornecedorGuardado = await novoFornecedor.save();
        res.status(201).json(fornecedorGuardado);

    } catch (error) {
        console.error("Erro ao criar fornecedor:", error);
        res.status(500).json({ message: "Ocorreu um erro ao criar o fornecedor." });
    }
};

// Futuramente, podemos adicionar aqui outras funções como:
// exports.criarFornecedor = async (req, res) => { ... };
// exports.detalhesFornecedor = async (req, res) => { ... };