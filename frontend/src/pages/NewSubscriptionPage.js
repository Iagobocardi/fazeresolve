import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { toast } from 'react-hot-toast';
import publicApiClient from '../api/publicApiClient';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Input } from '../components/ui/Input.jsx';

const NewSubscriptionPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { usuario } = useAuth();

    const [planId, setPlanId] = useState(null);
    const [paymentType, setPaymentType] = useState(null);

    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const pId = searchParams.get('planoId');
        const pType = searchParams.get('paymentType');

        if (!pId || !pType) {
            toast.error("Informações do plano inválidas. Por favor, selecione um plano novamente.");
            navigate('/planos');
            return;
        }

        setPlanId(pId);
        setPaymentType(pType);

        if (usuario) {
            toast.error("Você já está logado. Para trocar de plano, vá para as configurações.");
            navigate('/dashboard');
        }
    }, [searchParams, usuario, navigate]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleRegistrationSubmit = async () => {
        if (!formData.nome || !formData.email || !formData.telefone || !formData.password) {
            toast.error('Por favor, preencha todos os campos.');
            return;
        }
        if (formData.password.length < 8) {
            toast.error('A sua senha deve ter pelo menos 8 caracteres.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            toast.error('Por favor, insira um email válido.');
            return;
        }

        setIsLoading(true);
        try {
            const registrationPayload = {
                ...formData,
                planId: planId,
                paymentType: paymentType,
            };

            const { data } = await publicApiClient.post('/auth/register', registrationPayload);

            if (data.paymentInfo) {
                // PIX payment flow
                toast.success('Conta criada! Pague com PIX para ativar.');
                navigate('/pagamento-pendente', { state: { paymentInfo: data.paymentInfo } });
            } else if (data.token) {
                // Credit card flow
                toast.success('Conta criada! Prossiga para o pagamento.');
                navigate(`/payment?planoId=${planId}&token=${data.token}&email=${encodeURIComponent(formData.email)}`);
            } else {
                toast.error('Ocorreu um erro ao criar a sua conta. Tente novamente.');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Não foi possível criar a sua conta.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (!planId || !paymentType) {
        return <div className="text-center p-8">Carregando...</div>;
    }

    return (
        <div className="max-w-xl mx-auto p-4 md:p-8">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold mt-2">Crie sua Conta</h1>
                <p className="text-gray-600 mt-2">
                    Você está a um passo de começar.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>1. Seus Dados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label htmlFor="nome">Nome Completo</label>
                        <Input id="nome" type="text" value={formData.nome} onChange={handleInputChange} required disabled={isLoading} />
                    </div>
                    <div>
                        <label htmlFor="email">Email</label>
                        <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required disabled={isLoading} />
                    </div>
                    <div>
                        <label htmlFor="telefone">Telefone</label>
                        <Input id="telefone" type="tel" value={formData.telefone} onChange={handleInputChange} required disabled={isLoading} />
                    </div>
                    <div>
                        <label htmlFor="password">Senha</label>
                        <Input id="password" type="password" value={formData.password} onChange={handleInputChange} required disabled={isLoading} />
                    </div>
                </CardContent>
                <div className="p-6 pt-0">
                    <Button onClick={handleRegistrationSubmit} className="w-full" disabled={isLoading}>
                        {isLoading ? 'Criando conta...' : 'Continuar'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default NewSubscriptionPage;
