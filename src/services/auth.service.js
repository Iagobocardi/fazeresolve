const PasswordReset = require('../models/passwordReset.model');
const crypto = require('crypto');
const emailService = require('./email.service'); // Supondo que existe um serviço de email

const createAndSendPasswordReset = async (user) => {
    // Remove quaisquer tokens de reset antigos para este usuário
    await PasswordReset.deleteMany({ userId: user._id });

    // Cria um novo token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Salva o token no banco de dados
    const passwordReset = new PasswordReset({
        userId: user._id,
        token: resetToken,
        expiresAt: Date.now() + 3600000, // Expira em 1 hora
    });
    await passwordReset.save();

    // Constrói a URL de redefinição de senha
    // A URL do frontend deve ser configurada em uma variável de ambiente
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Envia o email
    // O conteúdo do email (template) pode ser mais elaborado
    await emailService.sendEmail({
        to: user.email,
        subject: 'Redefinição de Senha',
        html: `<p>Você solicitou a redefinição de sua senha. Por favor, clique no link a seguir para criar uma nova senha: <a href="${resetUrl}">${resetUrl}</a></p>
               <p>Se você não solicitou isso, por favor, ignore este email.</p>`,
    });

    console.log(`Link de redefinição de senha enviado para: ${user.email}`);
};

module.exports = {
    createAndSendPasswordReset,
};
