const PasswordReset = require('../models/passwordReset.model');
const crypto = require('crypto');
const emailService = require('./email.service');

const createAndSendPasswordReset = async (user) => {
    // Remove quaisquer tokens de reset antigos para este usuário
    await PasswordReset.deleteMany({ userId: user._id });

    // Cria um novo token de reset seguro
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Salva o token no banco de dados com data de expiração
    const passwordReset = new PasswordReset({
        userId: user._id,
        token: resetToken,
        expiresAt: Date.now() + 3600000, // Expira em 1 hora
    });
    await passwordReset.save();

    // Constrói a URL de redefinição que será usada no front-end
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Prepara e envia o email usando o serviço do SendGrid e o modelo dinâmico
    try {
        await emailService.sendEmailWithTemplate({
            to: user.email,
            templateId: process.env.SENDGRID_RESET_PASSWORD_TEMPLATE_ID,
            dynamicTemplateData: {
                nome: user.nome, // Passa o nome do usuário para o template
                resetUrl: resetUrl, // Passa o link de reset para o template
            },
        });
    } catch (error) {
        // Se o email falhar, não devemos deixar o usuário sem solução.
        // O erro já foi logado pelo email.service, aqui apenas relançamos
        // para que o controller possa lidar com ele se necessário.
        console.error(`Falha crítica ao tentar enviar email de redefinição para ${user.email}.`);
        throw error;
    }
};

module.exports = {
    createAndSendPasswordReset,
};
