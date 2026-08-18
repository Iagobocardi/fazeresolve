// Em: src/pages/GoogleCallbackPage.js

import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const GoogleCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            // Lógica para "decodificar" o token e obter os dados do utilizador
            // Para simplificar, vamos assumir que o backend já nos deu os dados que precisamos
            // e que o token será usado pelo apiClient.
            // Precisamos de uma forma de obter os dados do utilizador a partir do token.
            // Vamos fazer uma chamada a um novo endpoint "me" (eu).
            
            // 1. Guardamos o token
            localStorage.setItem('token_fazeresolve', token);
            
            // 2. Buscamos os dados do utilizador
            fetch('http://localhost:3000/api/admin/me', { // <-- Precisaremos de criar este endpoint
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(userData => {
                if (userData) {
                    // 3. Finalizamos o login no AuthContext
                    login(userData, token);
                    toast.success('Login com Google bem-sucedido!');
                    navigate('/'); // Redireciona para o dashboard
                } else {
                    throw new Error('Não foi possível obter os dados do utilizador.');
                }
            })
            .catch(err => {
                toast.error(err.message);
                navigate('/login');
            });
        } else {
            toast.error('Falha na autenticação com o Google.');
            navigate('/login');
        }
    }, [searchParams, navigate, login]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>A autenticar com o Google, por favor aguarde...</p>
        </div>
    );
};

export default GoogleCallbackPage;