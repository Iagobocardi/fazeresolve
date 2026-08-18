// Em: src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ planosPermitidos, rolesPermitidos }) => {
    const { usuario } = useAuth();

    if (!usuario) {
        return <Navigate to="/login" />;
    }

    // Verifica o plano, se a verificação for necessária
    if (planosPermitidos && !planosPermitidos.includes(usuario.plano)) {
        // Redireciona se o plano não for permitido
        return <Navigate to="/" />; // Redireciona para o dashboard principal
    }

    // Verifica a role, se a verificação for necessária
    if (rolesPermitidos && !rolesPermitidos.includes(usuario.role)) {
        // Redireciona se a role não for permitida
        return <Navigate to="/" />; // Redireciona para o dashboard principal
    }

    // Se todas as verificações passarem, renderiza o conteúdo protegido
    return <Outlet />;
};

export default ProtectedRoute;
