// src/controllers/configuracao.controller.js

const { google } = require('googleapis');
const axios = require('axios');
const Configuracao = require('../models/configuracao.model.js');
const Conta = require('../models/conta.model.js');
const Subscription = require('../models/subscription.model.js');
const Transacao = require('../models/transacao.model.js');
const subscriptionService = require('../services/subscription.service.js');
const mercadoPagoService = require('../services/mercadoPago.service.js');
const Usuario = require('../models/usuario.model.js');
const PLANS = require('../config/plans.config.js');


// Defina o cliente OAuth2 AQUI, no topo do ficheiro
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.API_URL}/configuracoes/google/callback` // /api embutido removido
);
// Função para obter a configuração da conta do usuário
exports.getConfiguracao = async (req, res) => {
    try {
        const { contaId } = req.user; // O middleware de autenticação nos dá o usuário

        let config = await Configuracao.findOne({ contaId });

        // Se não existir configuração para esta conta, cria uma nova
        if (!config) {
            config = await Configuracao.create({ contaId });
        }
        
        // Busca a informação de conexão do Google na conta separadamente
        const conta = await Conta.findById(contaId).select('googleCalendarConnected googleAccountEmail').lean();

        const configObject = config.toObject();
        configObject.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

        // Adiciona a informação de conexão ao objeto de resposta
        configObject.googleCalendarConnected = conta ? conta.googleCalendarConnected : false;
        configObject.googleAccountEmail = conta ? conta.googleAccountEmail : null;

        res.status(200).json(configObject);
    } catch (error) {
        console.error("Erro ao obter a configuração:", error);
        res.status(500).json({ message: "Ocorreu um erro ao buscar as configurações." });
    }
};

// Função para atualizar a configuração da conta do usuário
exports.updateConfiguracao = async (req, res) => {
    try {
        const { contaId } = req.user;
        const configAtualizada = await Configuracao.findOneAndUpdate(
            { contaId }, 
            req.body, 
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        );
        res.status(200).json(configAtualizada);
    } catch (error) {
        console.error("Erro ao atualizar a configuração:", error);
        res.status(500).json({ message: "Ocorreu um erro ao guardar as configurações." });
    }
};

// Inicia o processo de conexão com o Google
exports.connectGoogleCalendar = (req, res) => {
    if (!req.user || !req.user.contaId) {
        return res.status(400).send('Erro: O seu utilizador não está associado a uma conta de empresa. Não é possível conectar ao Google Calendar.');
    }
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.email'
    ];
    const state = JSON.stringify({ contaId: req.user.contaId });
   const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: state,
    redirect_uri: oauth2Client.redirectUri // Adicione esta linha
});
    res.redirect(url);
};

// Recebe o callback da Google após o consentimento
exports.handleGoogleCallback = async (req, res) => {
    console.log('[Google Callback] Recebido callback da Google.');
    try {
        const { code, state } = req.query;
        if (!code) {
            console.error('[Google Callback] Erro: Código de autorização não recebido.');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=error_no_code`);
        }
        console.log('[Google Callback] Código recebido. A trocar por tokens...');

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        console.log('[Google Callback] Tokens recebidos com sucesso.');

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: userInfo } = await oauth2.userinfo.get();
        const email = userInfo.email;
        console.log(`[Google Callback] Email do usuário obtido: ${email}`);

        const { contaId } = JSON.parse(state);
        if (!contaId) {
            console.error('[Google Callback] Erro: contaId não encontrado no parâmetro state.');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=error_no_state`);
        }
        console.log(`[Google Callback] A atualizar a conta: ${contaId}`);

        await Conta.findByIdAndUpdate(contaId, {
            googleCalendarConnected: true,
            googleTokens: tokens,
            googleAccountEmail: email
        });
        console.log(`[Google Callback] Conta ${contaId} atualizada com sucesso com o email ${email}.`);
        
        console.log('[Google Callback] A redirecionar para o frontend...');
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=success`);

    } catch (error) {
        console.error('[Google Callback] ERRO CRÍTICO no processamento do callback:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=error_critical`);
    }
};

// Desconecta a conta do Google Calendar
exports.disconnectGoogleCalendar = async (req, res) => {
    try {
        const { contaId } = req.user;
        await Conta.findByIdAndUpdate(contaId, {
            googleCalendarConnected: false,
            googleTokens: {}, // Limpa os tokens
            googleAccountEmail: null // Limpa o email
        });
        res.status(200).json({ message: 'Google Calendar desconectado com sucesso.' });
    } catch (error) {
        console.error("Erro ao desconectar o Google Calendar:", error);
        res.status(500).json({ message: 'Erro ao desconectar o Google Calendar.' });
    }
};

// Inicia o processo de onboarding do WhatsApp com a Twilio
exports.iniciarWhatsappOnboarding = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { numero, nomeExibicao, twilioAccountSid, twilioAuthToken } = req.body;

        if (!numero || !nomeExibicao || !twilioAccountSid || !twilioAuthToken) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios: número, nome de exibição e credenciais da Twilio.' });
        }
        
        const conta = await Conta.findById(contaId);
        if (!conta) {
            return res.status(404).json({ message: "Conta não encontrada. Não é possível iniciar o onboarding." });
        }

        // Salva as credenciais da Twilio na conta ANTES de chamar a API
        conta.twilioAccountSid = twilioAccountSid;
        conta.twilioAuthToken = twilioAuthToken;
        conta.whatsappSender = numero;
        await conta.save();

        const twilioUrl = 'https://messaging.twilio.com/v2/Channels/Senders';
        const basicAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

        const requestBody = {
            sender_id: `whatsapp:${numero}`,
            profile: { name: nomeExibicao },
            webhook: {
                callback_url: `${process.env.API_URL}/api/whatsapp/webhook`,
                callback_method: 'POST'
            }
        };

        const response = await axios.post(twilioUrl, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`
            }
        });

        // Salva o SID do Sender retornado pela Twilio
        conta.whatsappSenderSid = response.data.sid;
        await conta.save();

        res.status(200).json({ 
            message: 'Processo de registo do número iniciado. Um código de verificação foi enviado para o seu número via WhatsApp.',
            senderSid: response.data.sid 
        });

    } catch (error) {
        console.error("Erro ao iniciar onboarding do WhatsApp:", error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || 'Erro ao iniciar o processo de onboarding do WhatsApp.';
        const errorCode = error.response?.status || 500;
        res.status(errorCode).json({ message: errorMessage });
    }
};

// Manipula o callback do Mercado Pago após a autorização do vendedor
exports.handleMercadoPagoCallback = async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const redirectPath = '/configuracoes?tab=recebimentos';

    if (error || !code) {
        console.error("Callback do Mercado Pago com erro ou sem código:", error || "Código ausente");
        return res.redirect(`${frontendUrl}${redirectPath}&mp_connect=error`);
    }

    if (!state) {
        console.error("Callback do Mercado Pago sem 'state' (contaId).");
        return res.redirect(`${frontendUrl}${redirectPath}&mp_connect=error_no_state`);
    }

    try {
        const contaId = state;
        const redirectUri = `${process.env.API_URL}/configuracoes/mercadopago/callback`;

        const credentials = await mercadoPagoService.exchangeCodeForTokens(code, redirectUri);

        await Conta.findByIdAndUpdate(contaId, {
            'mercadoPagoCredentials': {
                ...credentials,
                connectedAt: new Date(),
            },
            'metodoRecebimento': 'MERCADOPAGO',
        });

        console.log(`Conta ${contaId} conectada com sucesso ao Mercado Pago.`);
        res.redirect(`${frontendUrl}${redirectPath}&mp_connect=success`);

    } catch (err) {
        console.error("Erro crítico ao processar callback do Mercado Pago:", err.message);
        if (err.response) {
            console.error("Detalhes do erro da API:", err.response.data);
        }
        res.redirect(`${frontendUrl}${redirectPath}&mp_connect=error_critical`);
    }
};

// Inicia a conexão com o Mercado Pago para o Split de Pagamentos
exports.connectMercadoPago = async (req, res) => {
    try {
        const { contaId } = req.user;

        // O state é usado para passar o ID da conta através do fluxo OAuth e validar no callback
        const state = req.user.contaId._id.toString();

        const redirect_uri = `${process.env.API_URL}/configuracoes/mercadopago/callback`;
        const connectionUrl = await mercadoPagoService.createConnectionUrl(state, redirect_uri);
        
        res.redirect(connectionUrl);

    } catch (error) {
        console.error("Erro ao iniciar conexão com o Mercado Pago:", error.message);
        // Retorna a mensagem de erro específica do serviço para facilitar a depuração.
        res.status(500).json({ message: error.message || "Erro interno ao tentar conectar com o Mercado Pago." });
    }
};

// Função para atualizar os dados do perfil da empresa
exports.updatePerfil = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { nomeEmpresa, cnpjCpf, telefone, endereco } = req.body;

        // Montar o objeto de atualização
        const updateData = {
            nome: nomeEmpresa,
            'companyInfo.cnpj': cnpjCpf,
            'companyInfo.telefone': telefone,
            'companyInfo.endereco': endereco,
        };

        const contaAtualizada = await Conta.findByIdAndUpdate(
            contaId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!contaAtualizada) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }

        res.status(200).json({ message: 'Perfil atualizado com sucesso.', data: contaAtualizada });

    } catch (error) {
        console.error("Erro em updatePerfil:", error);
        res.status(500).json({ message: "Erro ao atualizar o perfil." });
    }
};

// Função para alterar o plano do usuário (Refatorada)
exports.alterarPlano = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { planoId } = req.body; // Recebe o ID do plano (ex: 'prof_anual')

        if (!planoId) {
            return res.status(400).json({ message: 'O ID do novo plano é obrigatório.' });
        }

        const conta = await Conta.findById(contaId);
        if (!conta) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }

        const newPlanConfig = PLANS.find(p => p.id === planoId);
        if (!newPlanConfig || newPlanConfig.tipo !== 'assinatura') {
            return res.status(400).json({ message: 'Novo plano de assinatura inválido.' });
        }
        
        // Se a assinatura estiver ativa, tenta fazer o upgrade no gateway
        if (conta.statusAssinatura === 'ATIVO') {
            // O serviço de upgrade espera o nome do plano ('Profissional'), não o ID ('prof_anual')
            const resultado = await subscriptionService.upgradeSubscription(contaId, newPlanConfig.nome);

            // O serviço pode indicar que uma nova assinatura é necessária
            if (resultado.needsCreation) {
                return res.status(409).json({
                    message: 'É necessário criar uma nova assinatura para este plano.',
                    code: 'NEEDS_NEW_SUBSCRIPTION',
                    data: { newPlanId: resultado.newPlanId }
                });
            }
            
            res.status(200).json({ message: `Plano alterado para ${newPlanConfig.nome} com sucesso!`, data: resultado });

        } 
        // Se a assinatura não estiver ativa (ex: aguardando pagamento), apenas atualiza o plano localmente
        else {
            console.log(`[Plano] Alterando plano localmente para a conta ${contaId} para ${newPlanConfig.nome}.`);
            
            conta.plano = newPlanConfig.nome;
            conta.planId = newPlanConfig.id; // Salva o ID correto ('prof_anual')
            await conta.save();

            // Atualiza as permissões de todos os usuários da conta
            await Usuario.updateMany(
                { contaId: contaId },
                { $set: { permissoes: newPlanConfig.permissions } }
            );

            res.status(200).json({ 
                message: `Plano alterado para ${newPlanConfig.nome}. Prossiga para a tela de pagamento para ativar sua assinatura.`,
                data: {
                    newPlan: newPlanConfig.nome,
                    newPlanId: newPlanConfig.id
                }
            });
        }

    } catch (error) {
        console.error("Erro em alterarPlano:", error);
        res.status(500).json({ message: error.message || "Erro ao alterar o plano." });
    }
};

// Função para cancelar a assinatura do usuário
exports.cancelarAssinatura = async (req, res) => {
    try {
        const { contaId } = req.user;

        const resultado = await subscriptionService.cancelSubscription(contaId);

        res.status(200).json({ message: 'Assinatura cancelada com sucesso.', data: resultado });

    } catch (error) {
        console.error("Erro em cancelarAssinatura:", error);
        res.status(500).json({ message: error.message || "Erro ao cancelar a assinatura." });
    }
};

// Função para atualizar o método de pagamento ou regularizar uma assinatura pendente
exports.atualizarMetodoPagamento = async (req, res) => {
    try {
        const { contaId, id: userId, email: userEmail, nome: userName } = req.user;
        const { cardTokenId } = req.body;

        if (!cardTokenId) {
            return res.status(400).json({ message: 'O token do cartão é obrigatório.' });
        }

        const conta = await Conta.findById(contaId);
        if (!conta) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }

        // Cenário 1: O usuário já tem uma assinatura ativa e só quer trocar o cartão.
        if (conta.mercadoPagoSubscriptionId) {
            console.log(`[Pagamento] Atualizando cartão para a assinatura existente: ${conta.mercadoPagoSubscriptionId}`);
            const resultado = await subscriptionService.updateSubscriptionCard(conta.mercadoPagoSubscriptionId, cardTokenId);
            return res.status(200).json({ message: 'Método de pagamento atualizado com sucesso.', data: resultado });
        } 
        
        // Cenário 2: O usuário está com pagamento pendente e não tem assinatura no gateway.
        // Vamos criar uma nova assinatura para regularizar a situação.
        else {
            console.log(`[Pagamento] Criando nova assinatura para regularizar conta: ${contaId}`);
            if (!conta.planId) {
                return res.status(400).json({ message: 'ID do plano não encontrado na conta. Não é possível criar a assinatura.' });
            }

            // O serviço de criação de assinatura precisa de um objeto de usuário com email
            const userForSubscription = { id: userId, email: userEmail, nome: userName, contaId: contaId };

            const novaAssinatura = await subscriptionService.createSubscription(conta.planId, userForSubscription, cardTokenId);

            // Se a criação da assinatura no MP for bem-sucedida, atualizamos a conta localmente.
            if (novaAssinatura.id) {
                conta.mercadoPagoSubscriptionId = novaAssinatura.id;
                conta.statusAssinatura = 'ATIVO'; // A assinatura foi criada com sucesso, então está ativa.
                await conta.save();

                console.log(`[Pagamento] Nova assinatura ${novaAssinatura.id} criada e conta ${contaId} regularizada.`);
                return res.status(200).json({ message: 'Pagamento regularizado e assinatura ativada com sucesso!', data: novaAssinatura });
            } else {
                // Se a API do Mercado Pago retornar um erro, ele será propagado pelo serviço.
                console.error('[Pagamento] Falha ao criar a nova assinatura no Mercado Pago durante a regularização.');
                return res.status(500).json({ message: 'Falha ao processar o pagamento com o novo cartão.' });
            }
        }

    } catch (error) {
        console.error("Erro em atualizarMetodoPagamento:", error);
        res.status(500).json({ message: error.message || "Erro ao atualizar o método de pagamento." });
    }
};

// Função para atualizar as configurações de recebimento
exports.updateRecebimentos = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { metodo, chavePix } = req.body;

        if (!metodo || !['MANUAL', 'MERCADOPAGO'].includes(metodo)) {
            return res.status(400).json({ message: 'Método de recebimento inválido.' });
        }

        const updateData = {
            metodoRecebimento: metodo,
            chavePixManual: metodo === 'MANUAL' ? chavePix : null,
        };

        const contaAtualizada = await Conta.findByIdAndUpdate(
            contaId,
            { $set: updateData },
            { new: true }
        );

        if (!contaAtualizada) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }

        res.status(200).json({ message: 'Configurações de recebimento atualizadas com sucesso.', data: contaAtualizada });

    } catch (error) {
        console.error("Erro em updateRecebimentos:", error);
        res.status(500).json({ message: "Erro ao atualizar as configurações de recebimento." });
    }
};

// Função unificada para obter todos os dados da página de configurações (Refatorada para o novo design)
exports.getAllData = async (req, res) => {
    try {
        const { contaId } = req.user;

        // 1. Obter dados da Conta com todos os campos necessários
        const contaPromise = Conta.findById(contaId)
            .select(
                'nome companyInfo metodoRecebimento chavePixManual ' +
                'googleCalendarConnected googleAccountEmail isWhatsappConnected focusNFeConnected ' +
                'plano planId paymentType statusAssinatura gracePeriodExpiresAt acessoValidoAte'
            )
            .lean();

        // 2. Obter detalhes da assinatura do gateway (se existir)
        const subscriptionDetailsPromise = subscriptionService.getSubscriptionDetails(contaId).catch(err => {
            console.warn(`Aviso: Não foi possível obter detalhes da assinatura para a conta ${contaId}. Erro: ${err.message}`);
            return null;
        });

        // 3. Obter Histórico de Faturas
        const faturasPromise = Transacao.find({ contaId, tipo: { $in: ['FATURA_ASSINATURA', 'FATURA_PACOTE'] } })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('createdAt valor status linkBoleto notaFiscalId external_reference') // Adicionado external_reference
            .lean();
        
        const [conta, subscriptionDetails, faturas] = await Promise.all([
            contaPromise,
            subscriptionDetailsPromise,
            faturasPromise
        ]);

        if (!conta) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }

        // --- Construir o novo objeto 'assinatura' ---

        const planoAtual = PLANS.find(p => p.id === conta.planId);
        
        // Mapear status interno para um texto mais amigável
        const statusMap = {
            'ATIVO': 'Ativo',
            'AGUARDANDO_PAGAMENTO': 'Pagamento Pendente',
            'EM_ATRASO': 'Pagamento Atrasado',
            'CANCELADO': 'Cancelado'
        };

        const assinaturaResponse = {
            tipo: conta.paymentType === 'subscription' ? 'assinatura' : 'pacote',
            planoAtualId: conta.planId,
            planoAtualNome: planoAtual ? planoAtual.nome : conta.plano, // Fallback para o nome antigo
            status: statusMap[conta.statusAssinatura] || conta.statusAssinatura,
            metodoPagamento: subscriptionDetails?.metodoPagamento || null,
            planosDisponiveis: PLANS, // Envia a lista completa de planos detalhados
            faturas: faturas.map(f => {
                const planoFatura = PLANS.find(p => p.id === f.external_reference);
                let descricao = 'Não especificado';
                if (planoFatura) {
                    descricao = planoFatura.tipo === 'assinatura' 
                        ? `Assinatura ${planoFatura.ciclo} ${planoFatura.nome}`
                        : `Pacote ${planoFatura.nome} ${planoFatura.meses} Meses`;
                }
                return { ...f, descricao };
            })
        };

        // Adicionar campos condicionais baseados no tipo de plano
        if (assinaturaResponse.tipo === 'assinatura' && planoAtual) {
            assinaturaResponse.planoAtualCiclo = planoAtual.ciclo;
            assinaturaResponse.proximaCobranca = subscriptionDetails?.proximaCobranca;
        } else if (assinaturaResponse.tipo === 'pacote' && planoAtual) {
            assinaturaResponse.planoAtualMeses = planoAtual.meses;
            assinaturaResponse.validade = conta.acessoValidoAte;
        }

        // Montar o objeto de resposta final
        const response = {
            assinatura: assinaturaResponse,
            // Manter outros dados se necessário no futuro
             perfil: {
                nomeEmpresa: conta.nome,
                cnpjCpf: conta.companyInfo?.cnpj,
                telefone: conta.companyInfo?.telefone,
                endereco: conta.companyInfo?.endereco
            },
            recebimentos: {
                metodo: conta.metodoRecebimento,
                chavePix: conta.chavePixManual
            },
            integracoes: {
                whatsapp: { conectado: conta.isWhatsappConnected },
                google: { conectado: conta.googleCalendarConnected, email: conta.googleAccountEmail },
                focusNFe: { conectado: conta.focusNFeConnected },
                mercadoPago: { conectado: conta.metodoRecebimento === 'MERCADOPAGO' }
            }
        };

        // Adicionar status de conta bloqueada
        const isPaymentPending = ['AGUARDANDO_PAGAMENTO', 'EM_ATRASO', 'CANCELADO'].includes(conta.statusAssinatura);
        const gracePeriodExpired = conta.gracePeriodExpiresAt && new Date() > new Date(conta.gracePeriodExpiresAt);

        if (isPaymentPending && gracePeriodExpired) {
            response.account_status = 'LOCKED';
        } else {
            response.account_status = 'ACTIVE';
        }

        res.status(200).json(response);

    } catch (error) {
        console.error("Erro em getAllData:", error);
        res.status(500).json({ message: "Erro ao buscar os dados de configuração." });
    }
};

// Nova função para comprar um pacote pré-pago
exports.comprarPacote = async (req, res) => {
    try {
        const { contaId, email: userEmail, nome: userName } = req.user;
        const { planoId } = req.body;

        if (!planoId) {
            return res.status(400).json({ message: 'O ID do pacote é obrigatório.' });
        }

        const pacote = PLANS.find(p => p.id === planoId && p.tipo === 'pacote');
        if (!pacote) {
            return res.status(404).json({ message: 'Pacote não encontrado ou inválido.' });
        }

        const paymentData = {
            transaction_amount: pacote.precoValor,
            description: `Pacote ${pacote.nome} - ${pacote.meses} Meses`,
            payment_method_id: 'pix',
            payer: {
                email: userEmail,
                first_name: userName,
            },
            external_reference: `${contaId}_${planoId}`, // Referência para o webhook
            notification_url: `${process.env.API_URL}/mercado-pago/webhook`,
        };
        
        const paymentResult = await mercadoPagoService.createPixPayment(paymentData);

        res.status(201).json({
            paymentId: paymentResult.id,
            qrCode: paymentResult.point_of_interaction.transaction_data.qr_code,
            qrCodeBase64: paymentResult.point_of_interaction.transaction_data.qr_code_base64,
        });

    } catch (error) {
        console.error("Erro em comprarPacote:", error);
        res.status(500).json({ message: error.message || "Erro ao iniciar a compra do pacote." });
    }
};


// Verifica o código de verificação do número de WhatsApp
exports.verificarWhatsappSender = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { verificationCode } = req.body;

        if (!verificationCode) {
            return res.status(400).json({ message: 'O código de verificação é obrigatório.' });
        }

        const conta = await Conta.findById(contaId);
        if (!conta || !conta.twilioAccountSid || !conta.whatsappSenderSid) {
            return res.status(404).json({ message: 'Configuração da Twilio não encontrada ou processo de onboarding não iniciado para esta conta.' });
        }

        const twilioUrl = `https://messaging.twilio.com/v2/Channels/Senders/${conta.whatsappSenderSid}`;
        const basicAuth = Buffer.from(`${conta.twilioAccountSid}:${conta.twilioAuthToken}`).toString('base64');

        const requestBody = {
            configuration: {
                verification_code: verificationCode
            }
        };

        // Note: A API da Twilio para verificar o sender é um POST no mesmo endpoint de criação
        await axios.post(twilioUrl, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`
            }
        });

        res.status(200).json({ message: 'Número verificado com sucesso! A sua automação de WhatsApp está pronta para ser ativada.' });

    } catch (error) {
        console.error("Erro ao verificar o sender do WhatsApp:", error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || 'Erro ao verificar o código.';
        const errorCode = error.response?.status || 500;
        res.status(errorCode).json({ message: errorMessage });
    }
};
