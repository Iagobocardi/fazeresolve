// src/pages/Public/ResetPasswordPage.js
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import publicApiClient from '../../api/publicApiClient';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card.jsx';
import { Input } from '../../components/ui/Input.jsx';

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    const token = searchParams.get('token');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password || !confirmPassword) {
            toast.error('Por favor, preencha todos os campos.');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem.');
            return;
        }
        if (password.length < 8) {
            toast.error('A nova senha deve ter pelo menos 8 caracteres.');
            return;
        }

        setIsLoading(true);
        try {
            await publicApiClient.post('/auth/reset-password', { token, newPassword: password });
            toast.success('Sua senha foi redefinida com sucesso!');
            setIsSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Não foi possível redefinir sua senha. O link pode ter expirado.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-secondary">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl text-red-600">Token Inválido</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>O link para redefinição de senha é inválido ou está faltando. Por favor, solicite um novo link.</p>
                        <Button asChild className="mt-6 w-full">
                            <Link to="/forgot-password">Solicitar Novo Link</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-secondary">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl text-green-600">Senha Redefinida!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Sua senha foi alterada com sucesso. Você será redirecionado para a página de login em breve.</p>
                        <Button asChild className="mt-6 w-full">
                            <Link to="/login">Ir para o Login</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-secondary">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Crie uma Nova Senha</CardTitle>
                    <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="password">Nova Senha</label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="Pelo menos 8 caracteres"
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="confirmPassword">Confirme a Nova Senha</label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="Repita a nova senha"
                            />
                        </div>
                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? 'Aguarde...' : 'Redefinir Senha'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ResetPasswordPage;
