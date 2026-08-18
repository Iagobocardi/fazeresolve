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
/**
 * Mapeia os dados do nosso sistema para o formato NFS-e esperado pela API da Focus NFe.
 */
const mapToFocusNFS_eFormat = (notaFiscalData, providerData) => {
    const providerInfo = providerData.companyInfo;
    const clientInfo = notaFiscalData.cliente;

    const mappedData = {
        data_emissao: new Date().toISOString(),
        prestador: {
            cnpj: providerInfo.cnpj,
            inscricao_municipal: providerInfo.inscricaoMunicipal,
            codigo_municipio: providerInfo.codigoMunicipio,
        },
        tomador: {
            cnpj: clientInfo.documento, // Assumindo que o documento do cliente é o CNPJ/CPF
            razao_social: clientInfo.nome,
            email: clientInfo.email,
            endereco: {
                logradouro: clientInfo.endereco.logradouro,
                numero: clientInfo.endereco.numero,
                bairro: clientInfo.endereco.bairro,
                codigo_municipio: clientInfo.endereco.codigo_municipio, // O cliente também precisa deste código
                uf: clientInfo.endereco.estado,
                cep: clientInfo.endereco.cep,
            }
        },
        servico: {
            aliquota: notaFiscalData.servico.aliquota,
            discriminacao: notaFiscalData.servico.discriminacao,
            iss_retido: String(notaFiscalData.servico.iss_retido), // API espera uma string "true" ou "false"
            item_lista_servico: notaFiscalData.servico.item_lista_servico,
            codigo_tributario_municipio: notaFiscalData.servico.codigo_tributario_municipio,
            valor_servicos: notaFiscalData.valorTotal,
        }
    };

    return mappedData;
};

const emitirNotaFiscal = async (notaFiscalData, providerData) => {
    console.log(`[FocusNFe Service] Iniciando emissão de NFS-e para a nota com ID interno: ${notaFiscalData._id}`);

    const apiToken = providerData.focusNFeApiToken;
    if (!apiToken) {
        throw new Error('Token da API Focus NFe não configurado para este prestador.');
    }

    // 1. Mapeia os dados para o formato da API
    const mappedData = mapToFocusNFS_eFormat(notaFiscalData, providerData);

    try {
        // 2. Faz a chamada POST para o endpoint de NFS-e
        const response = await axios.post(`${API_URL}/v2/nfse`, mappedData, {
            auth: {
                username: apiToken,
                password: '' // A senha não é usada na autenticação com token
            }
        });

        console.log(`[FocusNFe Service] Resposta recebida da API para a NFS-e ${notaFiscalData._id}:`, response.data);

        // 3. Retorna a resposta completa
        return response.data;

    } catch (error) {
        console.error(`[FocusNFe Service] Erro ao emitir NFS-e para ${notaFiscalData._id}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Erro na comunicação com a API Focus NFe.');
    }
};

const consultarCnpj = async (apiToken, cnpj) => {
    if (!apiToken) {
        throw new Error('Token da API Focus NFe não fornecido.');
    }
    if (!cnpj) {
        throw new Error('CNPJ não fornecido para consulta.');
    }

    try {
        const response = await axios.get(`${API_URL}/v2/cnpjs/${cnpj}`, {
            auth: {
                username: apiToken,
                password: ''
            }
        });
        return response.data;
    } catch (error) {
        // Se o token for inválido, a API da Focus NFe retorna 403 Forbidden
        if (error.response && error.response.status === 403) {
            throw new Error('Token da API Focus NFe é inválido.');
        }
        // Outros erros
        console.error(`[FocusNFe Service] Erro ao consultar CNPJ ${cnpj}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Erro na comunicação com a API Focus NFe ao consultar CNPJ.');
    }
};

module.exports = {
    emitirNotaFiscal,
    consultarCnpj,
};
