// src/components/ClienteProtectedRoute.js

import React from 'react';
import { Navigate } from 'react-router-dom';

const ClienteProtectedRoute = ({ children }) => {
    // 1. Pega o token do armazenamento local
    const token = localStorage.getItem('authToken');

    // 2. Se NÃO houver token, redireciona para a página de login.
    // O 'replace' impede o utilizador de voltar para a página protegida com o botão "Voltar" do navegador.
    if (!token) {
        // Se não houver token de cliente, não há para onde ir, a não ser a página de login principal.
        // A rota /cliente/login agora requer um token, então não podemos redirecionar para lá.
        return <Navigate to="/login" replace />;
    }

    // 3. Se houver token, renderiza o componente filho (que é a página do dashboard).
    return children;
};

export default ClienteProtectedRoute;
