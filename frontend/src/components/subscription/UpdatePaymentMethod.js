import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import apiClient from '../../api/apiClient';

const updatePaymentMethod = async (cardTokenId) => {
    const { data } = await apiClient.post('/subscriptions/update-payment-method', { cardTokenId });
    return data;
};

const UpdatePaymentMethod = ({ onFinished }) => {
    const [isCardFormReady, setIsCardFormReady] = useState(false);

    const mutation = useMutation({
        mutationFn: updatePaymentMethod,
        onSuccess: () => {
            toast.success('Seu método de pagamento foi atualizado com sucesso!');
            onFinished();
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || 'Falha ao atualizar o método de pagamento.';
            toast.error(errorMessage);
        },
    });

    useEffect(() => {
        const publicKey = process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY;
        if (publicKey) {
            initMercadoPago(publicKey, { locale: 'pt-BR' });
        } else {
            console.error("Mercado Pago public key not found.");
            toast.error("A configuração de pagamento não está disponível no momento.");
        }
    }, []);

    const handleSubmit = async (formData) => {
        mutation.mutate(formData.token);
    };

    const initialization = {
        amount: 0, // Not charging anything, just validating and tokenizing
    };

    const customization = {
        visual: {
            style: { 
                theme: 'bootstrap', // or 'default', 'dark'
            },
            texts: {
                formTitle: '', // We have our own title
            }
        },
        paymentMethods: {
            maxInstallments: 1,
            creditCard: "all",
        },
    };

    return (
        <div className="mt-4 pt-4 border-t">
            <h3 className="text-md font-semibold mb-3">Atualizar Método de Pagamento</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Insira os dados do novo cartão que será usado para a cobrança da sua assinatura.
            </p>
            <div id="cardPaymentBrick_container">
                 <CardPayment
                    initialization={initialization}
                    customization={customization}
                    onSubmit={handleSubmit}
                    onReady={() => setIsCardFormReady(true)}
                    onError={(error) => console.error(error)}
                />
            </div>
             {mutation.isPending && (
                <div className="text-center mt-4">
                    <p className="text-sm text-blue-600">A processar... Por favor, aguarde.</p>
                </div>
            )}
             {!isCardFormReady && <p className="text-sm text-gray-500">A carregar formulário de pagamento...</p>}
        </div>
    );
};

export default UpdatePaymentMethod;
