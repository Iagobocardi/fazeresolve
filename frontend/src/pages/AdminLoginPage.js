// Em: src/pages/AdminLoginPage.js

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card.jsx';

const AdminLoginPage = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await apiClient.post('/auth/login', { login: identifier, password });

            // Scenario 2: Login Blocked (Grace Period Expired)
            if (response.status === 202 && response.data.needs_payment === true) {
                const { conta, token, plano, registrationData } = response.data;
                const paymentType = conta?.paymentType;

                toast('O seu pagamento está pendente. Vamos finalizar!', { icon: '💳' });

                if (paymentType === 'subscription' || paymentType === 'onetime') {
                    const planoId = plano?.id;
                    if (planoId) {
                        const destination = '/pagamento-assinatura'; // Simplified destination
                        navigate(`${destination}?planoId=${planoId}&paymentType=${paymentType}`, {
                            state: {
                                registrationData: { ...registrationData, token: token },
                                plano: plano
                            }
                        });
                    } else {
                        toast.error("ID do plano não encontrado. A redirecionar para a seleção de planos.");
                        navigate('/planos');
                    }
                } else {
                    console.error("Pagamento necessário, mas tipo de pagamento desconhecido:", response.data);
                    toast.error("Não foi possível identificar a página de pagamento correta.");
                    navigate('/planos');
                }
                return;
            }

            // Scenario 1 & 3: Successful Login (with or without warning)
            login(response.data);
            toast.success('Login bem-sucedido!');
            
            const { usuario } = response.data;
            const providerRoles = ['Dono', 'Membro', 'PRESTADOR'];
            if (usuario && providerRoles.includes(usuario.role)) {
                navigate('/');
            } else {
                navigate('/cliente/dashboard');
            }

        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Falha no login. Verifique as suas credenciais.';
            if (error.response?.status !== 202) { // Only toast if it's not a pending payment error
                toast.error(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-secondary">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Acesso ao Painel</CardTitle>
                    <CardDescription>Faça login para gerir o seu negócio.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="identifier" className="text-sm font-medium">Email ou Telefone</label>
                            <input
                                id="identifier" type="text" value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required disabled={isLoading}
                                autoComplete="username"
                                placeholder="ex: email@dominio.com ou 5511999999999"
                                className="w-full p-2 border rounded-md bg-background"
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="password" className="text-sm font-medium">Senha</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    autoComplete="current-password"
                                    className="w-full p-2 border rounded-md bg-background pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-gray-500"
                                    aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <Link to="/forgot-password"
                                className="text-sm text-primary hover:underline"
                            >
                                Esqueceu sua senha?
                            </Link>
                        </div>
                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? 'A entrar...' : 'Entrar'}
                        </Button>
                        <div className="text-center text-sm pt-4">
                            Não tem uma conta?{' '}
                            <Link to="/subscribe" className="font-medium text-primary hover:underline">
                                Registe-se
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminLoginPage;
