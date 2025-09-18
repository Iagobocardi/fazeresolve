const axios = require('axios');

/**
 * Busca um endereço completo a partir de um CEP utilizando a API ViaCEP.
 * @param {object} req - O objeto de requisição do Express.
 * @param {object} res - O objeto de resposta do Express.
 */
const getAddressByCep = async (req, res) => {
    try {
        const { cep } = req.params;

        // Remove qualquer caractere que não seja número
        const sanitizedCep = cep.replace(/\D/g, '');

        // Validação básica do CEP
        if (sanitizedCep.length !== 8) {
            return res.status(400).json({ message: 'CEP inválido. O CEP deve conter 8 dígitos.' });
        }

        const viaCepUrl = `https://viacep.com.br/ws/${sanitizedCep}/json/`;

        const response = await axios.get(viaCepUrl);

        // ViaCEP retorna um { "erro": true } para CEPs que não existem
        if (response.data.erro) {
            return res.status(404).json({ message: 'CEP não encontrado.' });
        }

        // Retorna apenas os campos relevantes para o nosso modelo de endereço
        const addressData = {
            logradouro: response.data.logradouro,
            bairro: response.data.bairro,
            cidade: response.data.localidade,
            estado: response.data.uf,
            cep: response.data.cep,
            // O código do município pode ser útil para NF-e
            codigo_municipio: response.data.ibge
        };

        res.status(200).json(addressData);

    } catch (error) {
        console.error("Erro ao buscar endereço por CEP:", error);
        // Verifica se o erro foi uma resposta 404 ou similar da API
        if (error.response) {
            return res.status(error.response.status).json({ message: 'Erro ao consultar o serviço de CEP.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor ao buscar CEP.' });
    }
};

module.exports = {
    getAddressByCep,
};
