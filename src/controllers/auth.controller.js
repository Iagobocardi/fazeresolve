// Arquivo: src/controllers/auth.controller.js

const Cliente = require('../models/cliente.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

// Configuração do cliente OAuth 2.0
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `http://localhost:3000/api/auth/google/callback` // O URI de redirecionamento que você configurou na Google Cloud
);

// Função que inicia o processo de login com a Google
const iniciarAuthGoogle = (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar' // Permissão total para ler e escrever no calendário
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Pede um refresh_token para acesso contínuo
    scope: scopes,
    // prompt: 'consent' // Descomente esta linha se quiser forçar o ecrã de consentimento sempre
  });
  res.redirect(url);
};

// Função que recebe o callback da Google após o consentimento do utilizador
const handleGoogleCallback = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            throw new Error("Código de autorização não recebido.");
        }

        const { tokens } = await oauth2Client.getToken(code);

        // =====================================================================
        // IMPORTANTE: GUARDAR OS TOKENS NO BANCO DE DADOS
        // =====================================================================
        // Acha o utilizador "Prestador" e guarda os tokens
        const prestador = await Cliente.findOneAndUpdate(
            { role: 'PRESTADOR' }, // Encontra o primeiro utilizador com o role 'PRESTADOR'
            { googleTokens: tokens }, // Define os tokens
            { new: true, sort: { createdAt: 1 } } // Opções: retorna o doc atualizado, ordena para pegar o mais antigo se houver múltiplos
        );

        if (prestador) {
            console.log('Tokens do Google guardados para o prestador:', prestador.nome);
        } else {
            console.error('Nenhum utilizador com o role PRESTADOR foi encontrado para guardar os tokens.');
        }

        // Redireciona o utilizador de volta para a página de configurações no frontend
        res.redirect('http://localhost:3001/configuracoes?google_auth=success');

    } catch (error) {
        console.error('Erro ao obter tokens do Google:', error.message);
        res.redirect('http://localhost:3001/configuracoes?google_auth=error');
    }
};

// Função de Login
const loginCliente = async (req, res) => {
    try {
        const { telefone, password } = req.body;

        // 1. Verifica se o telefone e a senha foram enviados
        if (!telefone || !password) {
            return res.status(400).json({ message: 'Telefone e senha são obrigatórios.' });
        }

        // 2. Encontra o cliente pelo telefone e, crucialmente, seleciona o campo 'password'
        // que por padrão não é retornado.
        const cliente = await Cliente.findOne({ telefone: telefone }).select('+password');

        if (!cliente) {
            return res.status(401).json({ message: 'Credenciais inválidas.' }); // Mensagem genérica por segurança
        }

        // 3. Compara a senha enviada com a senha criptografada no banco de dados
        const isMatch = await bcrypt.compare(password, cliente.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // 4. Se a senha estiver correta, gera um token JWT
        const payload = {
            id: cliente._id,
            nome: cliente.nome,
            role: cliente.role
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // Uma chave secreta que vamos adicionar ao .env
            { expiresIn: '1d' }    // O token expira em 1 dia
        );

        // Remove a senha do objeto antes de o enviar de volta
        cliente.password = undefined;

        res.status(200).json({
            message: 'Login bem-sucedido!',
            token,
            cliente
        });

    } catch (error) {
        console.error("ERRO em loginCliente:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};


module.exports = {
    loginCliente,
    handleGoogleCallback,
     iniciarAuthGoogle
};