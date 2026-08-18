const Cliente = require('../models/cliente.model');
const Usuario = require('../models/usuario.model');
const Conta = require('../models/conta.model');

/**
 * Controller para atualizar as configurações de pagamento de um prestador.
 */
const getPaymentSettings = async (req, res) => {
    try {
        const conta = await Conta.findById(req.user.contaId).select('metodoRecebimento chavePixManual credenciaisMercadoPago');
        if (!conta) {
            return res.status(404).json({ message: 'Conta do prestador não encontrada.' });
        }
        res.status(200).json(conta);
    } catch (error) {
        console.error('Erro ao buscar configurações de pagamento:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

const updatePaymentSettings = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { metodoRecebimento, chavePixManual } = req.body;

        // Validação básica
        if (!metodoRecebimento || (metodoRecebimento === 'MANUAL' && !chavePixManual)) {
            return res.status(400).json({ message: 'Dados de configuração de pagamento inválidos.' });
        }

        const updateData = {
            metodoRecebimento: metodoRecebimento,
            $unset: { credenciaisMercadoPago: "" } // Garante que o campo seja removido
        };

        if (metodoRecebimento === 'MANUAL') {
            updateData.chavePixManual = chavePixManual;
        } else {
            updateData.chavePixManual = null; // Limpa a chave pix se mudar para Mercado Pago
        }

        const updatedConta = await Conta.findByIdAndUpdate(
            contaId,
            { $set: updateData },
            { new: true }
        );

        if (!updatedConta) {
            return res.status(404).json({ message: 'Conta do prestador não encontrada.' });
        }

        res.status(200).json({ message: 'Configurações de pagamento atualizadas com sucesso!', conta: updatedConta });

    } catch (error) {
        console.error('Erro ao atualizar configurações de pagamento:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

const connectMercadoPago = async (req, res) => {
    try {
        const { contaId } = req.user;
        const clientId = process.env.MERCADO_PAGO_CLIENT_ID; // Seu App ID do Mercado Pago
        const redirectUri = `${process.env.API_URL}/provider/mercadopago-callback`;

        if (!clientId) {
            throw new Error('MERCADO_PAGO_CLIENT_ID não está definido no ambiente.');
        }

        const authUrl = `https://auth.mercadopago.com.br/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${contaId}&redirect_uri=${redirectUri}`;

        res.status(200).json({ authorization_url: authUrl });

    } catch (error) {
        console.error('Erro ao gerar URL de autorização do Mercado Pago:', error);
        res.status(500).json({ message: 'Erro ao iniciar conexão com o Mercado Pago.' });
    }
};

const axios = require('axios');

const handleMercadoPagoCallback = async (req, res) => {
    try {
        const { code, state, error } = req.query;
        const contaId = state; // O 'state' agora contém o ID da conta

        // Se o usuário negar a permissão, o MP redireciona com um parâmetro 'error'
        if (error) {
            console.warn(`[OAuth] O usuário negou a permissão no Mercado Pago. Erro: ${error}`);
            return res.redirect(`${process.env.FRONTEND_URL}/settings?connect=denied`);
        }

        if (!code) {
            throw new Error('Código de autorização não recebido do Mercado Pago.');
        }

        const tokenUrl = 'https://api.mercadopago.com/oauth/token';
        const body = {
            grant_type: 'authorization_code',
            client_id: process.env.MERCADO_PAGO_CLIENT_ID,
            client_secret: process.env.MERCADO_PAGO_CLIENT_SECRET,
            code: code,
            redirect_uri: `${process.env.API_URL}/provider/mercadopago-callback`,
        };

        const response = await axios.post(tokenUrl, body, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const tokenData = response.data;

        // Salva as credenciais e atualiza o status da conta
        await Conta.findByIdAndUpdate(contaId, {
            $set: {
                credenciaisMercadoPago: tokenData,
                metodoRecebimento: 'MERCADOPAGO',
                chavePixManual: null, // Limpa a chave PIX manual
            }
        });

        console.log(`[INFO] Credenciais do Mercado Pago salvas para a conta ${contaId}`);

        res.redirect(`${process.env.FRONTEND_URL}/settings?connect=success`);

    } catch (error) {
        console.error('Erro ao trocar código por tokens do Mercado Pago:', error.response?.data || error.message);
        res.redirect(`${process.env.FRONTEND_URL}/settings?connect=error`);
    }
};

const updateCompanyInfo = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { companyInfo, focusNFeApiToken } = req.body;

        const updateData = {
            companyInfo,
            focusNFeApiToken
        };

        const updatedConta = await Conta.findByIdAndUpdate(
            contaId,
            { $set: updateData },
            { new: true }
        );

        if (!updatedConta) {
            return res.status(404).json({ message: 'Conta do prestador não encontrada.' });
        }

        res.status(200).json({ message: 'Informações da empresa atualizadas com sucesso!', conta: updatedConta });
    } catch (error) {
        console.error('Erro ao atualizar informações da empresa:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

const getProviderDashboard = async (req, res) => {
    try {
        // The auth middleware gives us the user, but we re-fetch to be sure we have the latest data
        const user = await Usuario.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // We specifically need the account info as well for the frontend
        const conta = await Conta.findById(user.contaId);

        res.status(200).json({ user, conta, userType: 'provider' });

    } catch (error) {
        console.error('Erro ao buscar dados do dashboard do prestador:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
    getPaymentSettings,
    updatePaymentSettings,
    connectMercadoPago,
    handleMercadoPagoCallback,
    updateCompanyInfo,
    getProviderDashboard,
    getAccountDetails: async (req, res) => {
        try {
            const { contaId } = req.user;
            const conta = await Conta.findById(contaId);
            if (!conta) {
                return res.status(404).json({ message: 'Conta não encontrada.' });
            }

            const membros = await Usuario.find({ contaId }).select('-password');

            res.status(200).json({
                conta,
                membros,
            });
        } catch (error) {
            console.error("Erro ao buscar detalhes da conta:", error);
            res.status(500).json({ message: 'Erro interno ao buscar detalhes da conta.' });
        }
    }
};
