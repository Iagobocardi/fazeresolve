const Usuario = require('../models/usuario.model');
const subscriptionService = require('../services/subscription.service');

// Função para criar um novo membro na equipe
exports.criarMembro = async (req, res) => {
    try {
        const { nome, email, password } = req.body;
        const { contaId, id: ownerId } = req.user; // O ID da conta vem do usuário autenticado

        // Validação básica dos campos
        if (!nome || !email || !password) {
            return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
        }

        // Se o middleware marcou que uma atualização de cobrança é necessária...
        if (req.billing_update_required) {
            try {
                // ...primeiro, tenta atualizar a assinatura no Mercado Pago.
                await subscriptionService.updateSubscriptionPriceForNewUser(contaId);
                console.log(`Cobrança da conta ${contaId} atualizada com sucesso para incluir novo usuário.`);
            } catch (billingError) {
                // Se a atualização da cobrança falhar, não cria o usuário e retorna um erro.
                console.error(`Falha ao atualizar cobrança da conta ${contaId}:`, billingError.message);
                return res.status(502).json({ message: 'Não foi possível atualizar sua assinatura. O novo membro não foi adicionado.' });
            }
        }

        // Verificar se já existe um usuário com este email
        const emailExistente = await Usuario.findOne({ email });
        if (emailExistente) {
            return res.status(409).json({ message: 'Este email já está em uso.' });
        }

        // Criar o novo usuário com o role 'Membro'
        const novoMembro = new Usuario({
            nome,
            email,
            password, // O hash da senha é feito automaticamente pelo 'pre-save' hook no modelo
            contaId,
            role: 'Membro'
        });

        await novoMembro.save();

        // Evitar retornar a senha na resposta
        const membroCriado = novoMembro.toObject();
        delete membroCriado.password;

        res.status(201).json(membroCriado);

    } catch (error) {
        console.error("Erro ao criar membro da equipe:", error);
        res.status(500).json({ message: 'Erro interno ao criar membro da equipe.' });
    }
};
