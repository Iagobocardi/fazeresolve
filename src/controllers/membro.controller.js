const Usuario = require('../models/usuario.model');
const Conta = require('../models/conta.model');

// Função para criar um novo membro na equipe
exports.criarMembro = async (req, res) => {
    try {
        const { nome, email, password } = req.body;
        const { contaId } = req.user; // O ID da conta vem do usuário autenticado (dono da conta)

        // Validação básica dos campos
        if (!nome || !email || !password) {
            return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
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
            role: 'Membro' // Definindo o papel como Membro da equipe
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
