const Usuario = require('../models/usuario.model');
const Conta = require('../models/conta.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ESTA FUNÇÃO AGORA É UM ESPELHO DA FUNÇÃO DE LOGIN PRINCIPAL
// PARA GARANTIR CONSISTÊNCIA, INDEPENDENTE DE QUAL ENDPOINT O FRONTEND CHAMA.
exports.loginAdmin = async (req, res) => {
    try {
        // Aceita 'login' ou 'email' como campo de usuário para flexibilidade.
        const { login, email, password } = req.body;
        const userIdentifier = email || login;

        if (!userIdentifier || !password) {
            return res.status(400).json({ message: 'Email/login e senha são obrigatórios.' });
        }

        // 1. Encontra o usuário pelo email no modelo correto (Usuario)
        const usuario = await Usuario.findOne({ email: userIdentifier }).select('+password');

        if (!usuario) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        // Garante que apenas Donos ou Admins possam usar esta rota, se necessário.
        // O ideal é que o /api/admin/login seja apenas para 'Admin' e o /api/auth/login para 'Dono' e 'Membro'.
        // Para resolver o bug de redirecionamento, vamos permitir 'Dono' e 'Membro' aqui também.
        // A role 'PRESTADOR' não existe no nosso modelo de dados, então não a verificamos.
        if (!['Dono', 'Membro', 'Admin'].includes(usuario.role)) {
             return res.status(403).json({ message: 'Este usuário não tem permissão para acessar esta área.' });
        }

        // 2. Compara a senha com bcrypt
        const isMatch = await bcrypt.compare(password, usuario.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        // 3. Busca a conta associada
        const conta = await Conta.findById(usuario.contaId);
        if (!conta) {
             return res.status(404).json({ message: 'Conta associada não encontrada.' });
        }

        // 4. Gera um token JWT minimalista
        const payload = { id: usuario._id };
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Aumentando a expiração para 7 dias
        );

        res.status(200).json({
            message: 'Login bem-sucedido!',
            token,
            userType: 'provider', // Adiciona o sinalizador para o frontend
            usuario: {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role,
                plano: conta.plano,
                statusAssinatura: conta.statusAssinatura,
                permissoes: usuario.permissoes // Adiciona as permissões
            },
            conta: conta
        });

    } catch (error) {
        console.error("ERRO no login do admin:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// A função getMe pode ser útil para o painel de admin
exports.getMe = async (req, res) => {
    // O middleware de autenticação já colocou os dados do token em req.user
    res.status(200).json(req.user);
};
