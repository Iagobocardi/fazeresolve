// src/services/email.service.js

// Este é um serviço de email de placeholder.
// Em um ambiente de produção, você usaria uma biblioteca como Nodemailer ou um serviço como SendGrid.

const sendEmail = async ({ to, subject, html }) => {
    console.log('--- SERVIÇO DE EMAIL (PLACEHOLDER) ---');
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log('Corpo (HTML):');
    console.log(html);
    console.log('------------------------------------');

    // Em uma implementação real, aqui ocorreria o envio do email.
    // Como este é um placeholder, nós apenas simulamos o sucesso.
    return Promise.resolve();
};

module.exports = {
    sendEmail,
};
