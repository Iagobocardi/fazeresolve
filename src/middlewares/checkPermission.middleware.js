// src/middlewares/checkPermission.middleware.js

/**
 * Middleware para verificar se um usuário possui uma permissão específica.
 * @param {string} requiredPermission - A string da permissão necessária para acessar a rota.
 * @returns {function} Um middleware Express.
 */
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    // O authMiddleware deve garantir que req.user exista.
    if (!req.user || !req.user.permissoes) {
      return res.status(403).json({ message: 'Acesso negado. Informações de permissão em falta.' });
    }

    const { permissoes, role } = req.user;

    // O "Dono" da conta tem acesso irrestrito a tudo dentro de sua conta.
    if (role === 'Dono') {
      return next();
    }

    // Verifica se a permissão necessária está no array de permissões do usuário.
    if (permissoes.includes(requiredPermission)) {
      next(); // Usuário tem a permissão, pode continuar.
    } else {
      // Usuário não tem a permissão, acesso negado.
      // Adicionado log detalhado para ajudar a diagnosticar problemas de permissão.
      console.error(`[PERMISSAO NEGADA] User ID: ${req.user.id} (Role: ${req.user.role}) tentou acessar uma rota que requer a permissão: "${requiredPermission}".`);
      res.status(403).json({ message: 'Acesso proibido. Você não tem a permissão necessária para esta ação.' });
    }
  };
};

module.exports = checkPermission;
