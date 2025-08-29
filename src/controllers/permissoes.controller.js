const Usuario = require('../models/usuario.model');

/**
 * Atualiza a lista de permissões para um usuário específico.
 */
exports.updatePermissoes = async (req, res) => {
    try {
        const { id: targetUserId } = req.params; // ID do usuário a ser modificado
        const { permissoes } = req.body;
        const { contaId: requesterContaId, role: requesterRole } = req.user; // Dados do usuário que está fazendo a requisição

        // Validação básica da entrada
        if (!Array.isArray(permissoes)) {
            return res.status(400).json({ message: 'O campo "permissoes" deve ser um array de strings.' });
        }

        const targetUser = await Usuario.findById(targetUserId);

        // Verifica se o usuário a ser modificado existe
        if (!targetUser) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Garante que o Dono só pode modificar membros da sua própria conta
        if (targetUser.contaId.toString() !== requesterContaId.toString()) {
            return res.status(403).json({ message: 'Acesso proibido. Você só pode modificar membros da sua própria conta.' });
        }

        // Impede que um Dono altere as permissões de outro Dono ou de si mesmo (regra de negócio)
        if (targetUser.role === 'Dono') {
            return res.status(403).json({ message: 'Não é possível alterar as permissões de um Dono de conta.' });
        }

        // Atualiza o campo de permissões
        targetUser.permissoes = permissoes;
        await targetUser.save();

        // Retorna o usuário atualizado (sem a senha)
        const userToReturn = targetUser.toObject();
        delete userToReturn.password;

        res.status(200).json(userToReturn);

    } catch (error) {
        console.error("Erro ao atualizar permissões:", error);
        res.status(500).json({ message: 'Erro interno ao atualizar as permissões.' });
    }
};
