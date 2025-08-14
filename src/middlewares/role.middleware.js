// src/middlewares/role.middleware.js

/**
 * Middleware de verificação de função (Role-Based Access Control).
 * @param {Array<string>} allowedRoles - Um array de strings com as funções que têm permissão.
 * @returns {function} - Um middleware Express.
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    // O middleware de autenticação (authMiddleware) DEVE ter sido executado antes,
    // o que significa que `req.user` deve existir.
    if (!req.user || !req.user.role) {
      // Este é um erro inesperado, pois o authMiddleware deveria ter tratado a falta de token.
      return res.status(401).json({ message: 'Acesso negado. Informações de autenticação em falta.' });
    }

    const { role } = req.user;

    // Verifica se a função do utilizador está na lista de funções permitidas.
    if (allowedRoles.includes(role)) {
      // Se a função for permitida, continua para a próxima função de middleware ou para o controlador.
      next();
    } else {
      // Se a função não for permitida, retorna um erro de 'Forbidden'.
      res.status(403).json({ message: 'Acesso proibido. Você não tem permissão para executar esta ação.' });
    }
  };
};

module.exports = roleMiddleware;