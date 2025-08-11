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
    'https://www.googleapis.com/auth/calendar' // Permissão para ler e escrever no calendário
  ];

  // O ID do utilizador logado é extraído do token JWT pelo authMiddleware
  const userId = req.user.id;

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    // Passa o ID do utilizador no estado para o podermos identificar no callback
    state: userId
  });

  res.redirect(url);
};

// Função que recebe o callback da Google após o consentimento do utilizador
const handleGoogleCallback = async (req, res) => {
    try {
        const { code, state: userId } = req.query;

        if (!code || !userId) {
            throw new Error("Código de autorização ou ID do utilizador em falta no callback.");
        }

        // Troca o código de autorização por tokens de acesso
        const { tokens } = await oauth2Client.getToken(code);

        // Encontra o utilizador pelo ID recebido no 'state' e guarda os tokens
        const utilizadorAtualizado = await Cliente.findByIdAndUpdate(
            userId,
            { googleTokens: tokens },
            { new: true } // Retorna o documento atualizado
        );

        if (utilizadorAtualizado) {
            console.log(`Tokens do Google guardados para o utilizador: ${utilizadorAtualizado.nome}`);
        } else {
            // Este caso é raro, mas pode acontecer se o utilizador for apagado entretanto
            console.error(`Utilizador com ID ${userId} não encontrado para guardar os tokens.`);
            return res.redirect('http://localhost:3001/configuracoes?google_auth=error&reason=user_not_found');
        }

        // Redireciona o utilizador de volta para a página de configurações no frontend com sucesso
        res.redirect('http://localhost:3001/configuracoes?google_auth=success');

    } catch (error) {
        console.error('Erro ao obter tokens do Google:', error.message);
        // Redireciona com uma mensagem de erro genérica
        res.redirect('http://localhost:3001/configuracoes?google_auth=error');
    }
};

// Função de Login
const loginCliente = async (req, res) => {
    try {
        const { login, password } = req.body;

        // 1. Verifica se o login (email/telefone) e a senha foram enviados
        if (!login || !password) {
            return res.status(400).json({ message: 'O campo de login e a senha são obrigatórios.' });
        }

        // 2. Encontra o cliente pelo telefone OU pelo email
        let cliente = await Cliente.findOne({ telefone: login }).select('+password');
        if (!cliente) {
            // Se não encontrou pelo telefone, tenta encontrar pelo email
            cliente = await Cliente.findOne({ email: login }).select('+password');
        }

        if (!cliente) {
            return res.status(401).json({ message: 'Credenciais inválidas.' }); // Mensagem genérica por segurança
        }

        // 3. Verifica se o cliente tem uma senha definida
        if (!cliente.password) {
            return res.status(401).json({ message: 'Login não configurado para este utilizador. Tente o login social ou redefina a senha.' });
        }


        // 4. Compara a senha enviada com a senha criptografada no banco de dados
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