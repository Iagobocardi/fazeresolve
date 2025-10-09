// Em: src/services/email.service.js
const sgMail = require('@sendgrid/mail');

// A chave de API é lida das variáveis de ambiente
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Envia um email usando um template dinâmico do SendGrid.
 * @param {string} to - O destinatário do email.
 * @param {string} templateId - O ID do template dinâmico do SendGrid.
 * @param {object} dynamicTemplateData - Um objeto com os dados para preencher o template.
 */
const sendEmailWithTemplate = async ({ to, templateId, dynamicTemplateData }) => {
    const msg = {
        to: to,
        // O remetente DEVE ser um dos que você verificou no SendGrid
        from: {
            email: 'suporte@fazeresolve.com', // Altere se você configurou outro email verificado
            name: 'Faz e Resolve'
        },
        templateId: templateId,
        dynamic_template_data: dynamicTemplateData,
    };

    try {
        await sgMail.send(msg);
        console.log(`Email enviado com sucesso para ${to} usando o template ${templateId}`);
    } catch (error) {
        console.error('Erro ao enviar email pelo SendGrid:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        // Lançar o erro permite que o serviço que chamou saiba que falhou
        throw new Error('Falha ao enviar o email.');
    }
};

module.exports = {
    sendEmailWithTemplate,
};
