// src/controllers/fornecedor.controller.js

const Fornecedor = require('../models/fornecedor.model.js');

// Função para listar fornecedores com filtros e busca
exports.listarFornecedores = async (req, res) => {
    try {
        const { search, categoria } = req.query;
        let query = { ativo: true };

        if (search) {
            query.$or = [
                { nomeFantasia: { $regex: search, $options: 'i' } },
                { razaoSocial: { $regex: search, $options: 'i' } },
                { cnpj: { $regex: search, $options: 'i' } }
            ];
        }

        if (categoria) {
            query.categoria = categoria;
        }

        const fornecedores = await Fornecedor.find(query).sort({ nomeFantasia: 1 });
        res.status(200).json(fornecedores);
    } catch (error) {
        console.error("Erro ao listar fornecedores:", error);
        res.status(500).json({ message: "Ocorreu um erro ao buscar os fornecedores." });
    }
};

// Função para criar um novo fornecedor
exports.criarFornecedor = async (req, res) => {
    try {
        const {
            nomeFantasia,
            razaoSocial,
            cnpj,
            categoria,
            contato, // { nome, telefone, email }
            observacoes
        } = req.body;

        // Validação
        if (!nomeFantasia) {
            return res.status(400).json({ message: "O campo 'Nome Fantasia' é obrigatório." });
        }

        // Verifica se já existe um fornecedor com o mesmo CNPJ
        if (cnpj) {
            const fornecedorExistente = await Fornecedor.findOne({ cnpj });
            if (fornecedorExistente) {
                return res.status(409).json({ message: "Já existe um fornecedor com este CNPJ." });
            }
        }

        const novoFornecedor = new Fornecedor({
            nomeFantasia,
            razaoSocial,
            cnpj,
            categoria,
            contato,
            observacoes,
        });

        const fornecedorSalvo = await novoFornecedor.save();
        res.status(201).json(fornecedorSalvo);

    } catch (error) {
        console.error("Erro ao criar fornecedor:", error);
        // Tratar erro de chave duplicada do Mongoose (caso o sparse index não pegue tudo)
        if (error.code === 11000) {
             return res.status(409).json({ message: "Já existe um fornecedor com este CNPJ." });
        }
        res.status(500).json({ message: "Ocorreu um erro ao criar o fornecedor." });
    }
};

// Função para obter detalhes de um fornecedor
exports.obterFornecedor = async (req, res) => {
    try {
        const fornecedor = await Fornecedor.findById(req.params.id);
        if (!fornecedor) {
            return res.status(404).json({ message: 'Fornecedor não encontrado.' });
        }
        res.status(200).json(fornecedor);
    } catch (error) {
        console.error("Erro ao obter fornecedor:", error);
        res.status(500).json({ message: 'Erro ao buscar dados do fornecedor.' });
    }
};

// Função para atualizar um fornecedor
exports.atualizarFornecedor = async (req, res) => {
    try {
        const fornecedorAtualizado = await Fornecedor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!fornecedorAtualizado) {
            return res.status(404).json({ message: 'Fornecedor não encontrado.' });
        }
        res.status(200).json(fornecedorAtualizado);
    } catch (error) {
        console.error("Erro ao atualizar fornecedor:", error);
        res.status(500).json({ message: 'Erro ao atualizar o fornecedor.' });
    }
};

// Função para desativar (soft delete) um fornecedor
exports.deletarFornecedor = async (req, res) => {
    try {
        // Em vez de deletar, vamos marcar como inativo
        const fornecedorDesativado = await Fornecedor.findByIdAndUpdate(req.params.id, { ativo: false }, { new: true });
        if (!fornecedorDesativado) {
            return res.status(404).json({ message: 'Fornecedor não encontrado.' });
        }
        res.status(200).json({ message: 'Fornecedor desativado com sucesso.' });
    } catch (error) {
        console.error("Erro ao desativar fornecedor:", error);
        res.status(500).json({ message: 'Erro ao desativar o fornecedor.' });
    }
};
