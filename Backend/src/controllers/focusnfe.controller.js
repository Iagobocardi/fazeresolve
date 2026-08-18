// src/controllers/focusnfe.controller.js
const Cliente = require('../models/cliente.model');
const focusnfeService = require('../services/focusnfe.service');

// Salva e testa o token da API Focus NFe
exports.saveToken = async (req, res) => {
    const { focusNFeApiToken } = req.body;
    const providerId = req.user.id; // Assumindo que o ID do prestador está no req.user

    if (!focusNFeApiToken) {
        return res.status(400).json({ message: 'O token da API Focus NFe é obrigatório.' });
    }

    try {
        const provider = await Cliente.findById(providerId);
        if (!provider || provider.role !== 'PRESTADOR') {
            return res.status(404).json({ message: 'Prestador não encontrado.' });
        }

        // Usa o CNPJ do prestador para testar o token. Se não houver CNPJ, retorna erro.
        const cnpjToTest = provider.companyInfo?.cnpj;
        if (!cnpjToTest) {
            return res.status(400).json({ message: 'É necessário ter um CNPJ cadastrado nas informações da empresa para validar o token.' });
        }

        // Tenta validar o token fazendo uma chamada de teste
        await focusnfeService.consultarCnpj(focusNFeApiToken, cnpjToTest);

        // Se a chamada for bem-sucedida, o token é válido. Salva no banco.
        provider.focusNFeApiToken = focusNFeApiToken;
        provider.focusNFeConnected = true;
        await provider.save();

        res.status(200).json({
            message: 'Token da Focus NFe salvo e validado com sucesso!',
            focusNFeConnected: true,
        });

    } catch (error) {
        console.error('[FocusNFe Controller] Erro ao salvar o token:', error.message);

        // Garante que o estado no banco de dados reflita a falha na conexão
        try {
            await Cliente.findByIdAndUpdate(providerId, {
                focusNFeApiToken: '', // Limpa o token inválido
                focusNFeConnected: false,
            });
        } catch (dbError) {
            console.error('[FocusNFe Controller] Erro ao limpar o token no banco de dados após falha na validação:', dbError.message);
            // Mesmo que isso falhe, o erro original é mais importante para o cliente
        }

        // Retorna uma mensagem de erro específica se o token for inválido
        if (error.message.includes('inválido')) {
            return res.status(401).json({
                message: 'A conexão falhou. O token da API Focus NFe fornecido é inválido.',
                focusNFeConnected: false,
            });
        }

        // Retorna um erro genérico para outros problemas
        res.status(500).json({
            message: error.message || 'Ocorreu um erro ao validar o token da Focus NFe.',
            focusNFeConnected: false,
        });
    }
};

// Desconecta e limpa o token da API Focus NFe
exports.disconnectToken = async (req, res) => {
    const providerId = req.user.id; // Assumindo que o ID do prestador está no req.user

    try {
        const provider = await Cliente.findById(providerId);
        if (!provider) {
            return res.status(404).json({ message: 'Prestador não encontrado.' });
        }

        // Limpa as informações de conexão
        provider.focusNFeApiToken = '';
        provider.focusNFeConnected = false;
        await provider.save();

        res.status(200).json({
            message: 'Conexão com a Focus NFe removida com sucesso.',
            focusNFeConnected: false,
        });

    } catch (error) {
        console.error('[FocusNFe Controller] Erro ao desconectar o token:', error.message);
        res.status(500).json({ message: 'Ocorreu um erro ao remover a conexão com a Focus NFe.' });
    }
};
