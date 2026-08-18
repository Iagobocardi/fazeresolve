// src/pages/Public/ForgotPasswordPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import publicApiClient from '../../api/publicApiClient';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card.jsx';
import { Input } from '../../components/ui/Input.jsx';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error('Por favor, insira o seu email.');
            return;
        }
        setIsLoading(true);
        try {
            await publicApiClient.post('/auth/forgot-password', { email });
            setIsSubmitted(true);
        } catch (error) {
            // Show a generic message to prevent user enumeration attacks
            setIsSubmitted(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-secondary">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">Verifique seu Email</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Se uma conta com o email <strong>{email}</strong> existir, um link para redefinição de senha foi enviado.</p>
                        <p className="mt-4">Por favor, verifique sua caixa de entrada e pasta de spam.</p>
                        <Button asChild className="mt-6 w-full">
                            <Link to="/login">Voltar para o Login</Link>
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
                    <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
                    <CardDescription>Insira seu email para receber o link de redefinição.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="email" className="text-sm font-medium">Email</label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                placeholder="seu.email@exemplo.com"
                                className="w-full"
                            />
                        </div>
                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? 'Aguarde...' : 'Enviar Link de Redefinição'}
                        </Button>
                        <div className="text-center text-sm pt-4">
                            <Link to="/login" className="font-medium text-primary hover:underline">
                                Voltar para o Login
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ForgotPasswordPage;
