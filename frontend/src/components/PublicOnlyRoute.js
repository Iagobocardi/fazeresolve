import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicOnlyRoute = () => {
    const { usuario } = useAuth();

    // If the user is logged in, redirect them away from public pages like login/register
    if (usuario) {
        return <Navigate to="/" replace />;
    }

    // If the user is not logged in, show the public page
    return <Outlet />;
};

export default PublicOnlyRoute; 
