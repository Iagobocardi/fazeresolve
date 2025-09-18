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

const estimarCustoProduto = async (req, res) => {
    try {
        const { descricao } = req.body;

        if (!descricao) {
            return res.status(400).json({ message: 'A descrição do produto é obrigatória.' });
        }

        const searchTerm = `preço ${descricao}`;
        const searchResults = await google_search(searchTerm);

        // Regex para encontrar preços no formato R$ 1.234,56 ou R$1234,56 etc.
        const priceRegex = /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g;
        let prices = [];
        let match;

        while ((match = priceRegex.exec(searchResults)) !== null) {
            // Converte o preço encontrado para um número (ex: "1.234,56" -> 1234.56)
            const priceString = match[1].replace(/\./g, '').replace(',', '.');
            prices.push(parseFloat(priceString));
        }

        if (prices.length === 0) {
            return res.status(404).json({ message: 'Nenhum preço de referência encontrado.' });
        }

        const sum = prices.reduce((a, b) => a + b, 0);
        const averagePrice = sum / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        res.status(200).json({
            averagePrice: parseFloat(averagePrice.toFixed(2)),
            minPrice,
            maxPrice,
            sourceCount: prices.length
        });

    } catch (error) {
        console.error("Erro ao estimar custo do produto:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao estimar custo.' });
    }
};

module.exports = {
    getAddressByCep,
    estimarCustoProduto,
};
