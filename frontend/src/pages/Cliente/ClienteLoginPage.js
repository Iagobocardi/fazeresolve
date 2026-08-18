// Em: src/pages/Cliente/ClienteLoginPage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card.jsx';
import { Button } from '../../components/ui/Button.jsx';

const ClienteLoginPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [status, setStatus] = useState('loading'); // 'loading', 'error', 'success'
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMessage('Nenhum token de acesso fornecido. Por favor, use o link enviado para o seu email.');
            return;
        }

        const authenticateClient = async () => {
            try {
                const response = await apiClient.post('/portal-cliente/login-token', { token });
                const { data } = response;

                // A API deve retornar os dados do cliente e um novo token de sessão
                login(data.cliente, data.token);
                localStorage.setItem('clienteToken', data.token); // Mantém o token para o ClienteProtectedRoute
                
                setStatus('success');
                navigate('/cliente/dashboard');

            } catch (err) {
                setStatus('error');
                const message = err.response?.data?.message || 'O link de acesso é inválido ou expirou. Por favor, solicite um novo link ao seu prestador de serviço.';
                setErrorMessage(message);
            }
        };

        authenticateClient();
    }, [token, login, navigate]);

    const handleProviderLoginClick = () => {
        window.location.href = '/login';
    };

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return <p>Autenticando, por favor aguarde...</p>;
            case 'error':
                return (
                    <div className="space-y-4">
                        <p className="text-destructive">{errorMessage}</p>
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Você é um prestador de serviço?</p>
                            <Button onClick={handleProviderLoginClick} variant="outline" className="w-full">Acesse o painel de prestador</Button>
                        </div>
                    </div>
                );
            default:
                return null; // Em caso de sucesso, o redirecionamento ocorre
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-secondary">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">Portal do Cliente</CardTitle>
                    <CardDescription>Validando seu acesso...</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
};

export default ClienteLoginPage;
