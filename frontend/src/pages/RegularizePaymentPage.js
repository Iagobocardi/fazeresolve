// src/pages/RegularizePaymentPage.js
import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import apiClient from '../api/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card.jsx';

const RegularizePaymentPage = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isCardFormReady, setIsCardFormReady] = useState(false);

    useEffect(() => {
        // Initialize Mercado Pago SDK
        const publicKey = process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY;
        if (publicKey) {
            initMercadoPago(publicKey, { locale: 'pt-BR' });
        }
    }, []);

    const handleSubmit = async (cardFormData) => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const payload = {
                cardToken: cardFormData.token,
                deviceId: window.MP_DEVICE_SESSION_ID,
            };

            const response = await apiClient.post('/subscriptions/regularizar', payload);

            if (response.status === 200) {
                toast.success(response.data.message || "Seu método de pagamento foi atualizado. Sua conta será reativada assim que o pagamento for confirmado.");
                navigate('/dashboard'); // Redirect to dashboard
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Não foi possível atualizar seu pagamento. Por favor, tente novamente.';
            toast.error(errorMessage);
            setIsLoading(false);
        }
    };

    const customization = {
        visual: {
            style: { theme: 'bootstrap' },
            texts: { formTitle: '' },
        },
        paymentMethods: {
            maxInstallments: 1,
            creditCard: "all",
        },
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="max-w-md w-full mx-auto p-4">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold">Regularizar Pagamento</CardTitle>
                        <CardDescription>
                            Houve um problema com seu último pagamento. Por favor, insira um novo método de pagamento para reativar sua conta.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Suspense fallback={<div>Carregando formulário...</div>}>
                            <CardPayment
                                initialization={{ amount: 1 }} // Amount is not needed here, but the component requires it.
                                customization={customization}
                                onSubmit={handleSubmit}
                                onReady={() => setIsCardFormReady(true)}
                                onError={(error) => console.error('Payment form error:', error)}
                            />
                        </Suspense>
                        {!isCardFormReady && <p className="text-sm text-center text-gray-500">Aguarde o formulário de pagamento...</p>}
                         <p className="text-xs text-gray-500 mt-4 text-center">
                            Pagamento processado com segurança pelo Mercado Pago.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RegularizePaymentPage;
