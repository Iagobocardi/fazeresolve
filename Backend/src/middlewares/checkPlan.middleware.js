// Em: src/middlewares/checkPlan.middleware.js

// Este middleware recebe uma lista de planos que têm acesso
const checkPlan = (planosPermitidos) => {
    return (req, res, next) => {
        // Supondo que você tem um middleware de autenticação que coloca os dados do user em req.user
        const usuario = req.user; 

        if (!usuario || !usuario.plano) {
            return res.status(401).json({ message: 'Acesso negado. Utilizador não autenticado.' });
        }

        if (planosPermitidos.includes(usuario.plano)) {
            next(); // O utilizador tem um dos planos permitidos, pode prosseguir.
        } else {
            // O utilizador não tem permissão
            return res.status(403).json({ 
                message: `Funcionalidade indisponível. Faça um upgrade para um dos planos: ${planosPermitidos.join(', ')} para aceder.` 
            });
        }
    };
};

module.exports = checkPlan;