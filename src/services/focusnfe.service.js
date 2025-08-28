const axios = require('axios');

// A URL base da API da Focus NFe
const API_URL = 'https://api.focusnfe.com.br';

/**
 * Emite uma Nota Fiscal Eletrônica (NF-e) usando a API da Focus NFe.
 *
 * @param {object} notaFiscalData - Os dados da nota fiscal do nosso banco de dados.
 * @param {string} apiToken - O token de acesso do prestador para a API da Focus NFe.
 * @returns {Promise<object>} A resposta da API da Focus NFe.
 */
/**
 * Mapeia os dados do nosso sistema para o formato esperado pela API da Focus NFe.
 * ESTA FUNÇÃO É UM EXEMPLO E PRECISA SER COMPLETADA COM A LÓGICA DE NEGÓCIO E FISCAL CORRETA.
 */
const mapToFocusNFeFormat = (notaFiscalData, providerData) => {
    // AVISO: A estrutura abaixo é uma simplificação.
    // A estrutura real da NFe é muito complexa e exige conhecimento fiscal.
    // Campos como CFOP, NCM, ICMS, PIS, COFINS, etc., precisam ser definidos
    // de acordo com as regras de negócio e a legislação para os serviços/produtos vendidos.

    const mappedData = {
        // Dados da NFe
        natureza_operacao: "Venda de mercadoria", // Exemplo, precisa ser dinâmico
        data_emissao: new Date().toISOString(),
        // ... outros campos gerais da NFe

        // Dados do Emitente (o nosso prestador)
        emitente: {
            cnpj: providerData.companyInfo.cnpj,
            razao_social: providerData.companyInfo.razaoSocial,
            // ... outros dados do emitente
        },

        // Dados do Destinatário (o cliente final)
        destinatario: {
            nome: notaFiscalData.cliente.nome,
            cpf: notaFiscalData.cliente.documento, // ou cnpj
            // ... outros dados do destinatário
        },

        // Itens da Nota
        items: notaFiscalData.items.map(item => ({
            numero_item: item.numero,
            descricao: item.descricao,
            quantidade: item.quantidade,
            valor_unitario: item.valorUnitario,
            // AVISO: Campos fiscais por item (NCM, CFOP, ICMS, etc.) são obrigatórios aqui
        })),
    };

    return mappedData;
};


const emitirNotaFiscal = async (notaFiscalData, providerData) => {
    console.log(`[FocusNFe Service] Iniciando emissão para a nota com ID interno: ${notaFiscalData._id}`);

    const apiToken = providerData.focusNFeApiToken;
    if (!apiToken) {
        throw new Error('Token da API Focus NFe não configurado para este prestador.');
    }

    // 1. Mapeia os dados para o formato da API
    const mappedData = mapToFocusNFeFormat(notaFiscalData, providerData);

    try {
        // 2. Faz a chamada POST para a API da Focus NFe
        // A autenticação é feita via Basic Auth, com o token como username.
        const response = await axios.post(`${API_URL}/v2/nfe`, mappedData, {
            auth: {
                username: apiToken,
                password: '' // A senha não é usada na autenticação com token
            }
        });

        console.log(`[FocusNFe Service] Resposta recebida da API para a nota ${notaFiscalData._id}:`, response.data);

        // 3. Retorna a resposta completa
        return response.data;

    } catch (error) {
        console.error(`[FocusNFe Service] Erro ao emitir NFe para ${notaFiscalData._id}:`, error.response?.data || error.message);
        // Lança o erro para que o controller possa tratá-lo
        throw new Error(error.response?.data?.message || 'Erro na comunicação com a API Focus NFe.');
    }
};

module.exports = {
    emitirNotaFiscal,
};
