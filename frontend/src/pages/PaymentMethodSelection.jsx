import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import apiClient from '../api/apiClient';

const PaymentMethodSelection = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [planId, setPlanId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState(null); // 'pix' or 'card'

    useEffect(() => {
        const pId = searchParams.get('planoId');
        const pType = searchParams.get('paymentType');

        if (!pId || !pType) {
            toast.error("Informações do plano não encontradas. Redirecionando...");
            navigate('/planos');
        } else {
            setPlanId(pId);
        }

        const publicKey = process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY;
        if (publicKey) {
            initMercadoPago(publicKey, { locale: 'pt-BR' });
        }
    }, [searchParams, navigate]);

    const handlePixPayment = async () => {
        if (isLoading) return;
        setIsLoading(true);
        console.log("Attempting PIX payment for plan:", planId);
        toast.loading('Gerando seu QR Code PIX...');

        try {
            const payload = {
                paymentMethod: 'pix',
                planId: planId,
            };
            console.log("Payload:", payload);

            const { data } = await apiClient.post('/pagamentos/onetime', payload);
            console.log("Response data:", data);

            toast.dismiss();
            toast.success('QR Code gerado! Agora é só pagar.');

            // Redirect to the PIX payment page with the QR code data
            navigate('/pagamento-pix', { state: { paymentInfo: data } });
            console.log("Redirecting to /pagamento-pix");

        } catch (error) {
            toast.dismiss();
            console.error("Error generating PIX:", error);
            const errorMessage = error.response?.data?.message || 'Erro ao gerar o PIX. Tente novamente.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCardPayment = async (formData) => {
        if (isLoading) return;
        setIsLoading(true);
        toast.loading('Processando seu pagamento...');

        try {
            const payload = {
                paymentMethod: 'card',
                planId: planId,
                cardToken: formData.token,
                installments: formData.installments,
                paymentMethodId: formData.payment_method_id,
                issuerId: formData.issuer_id,
            };

            const { data } = await apiClient.post('/pagamentos/onetime', payload);

            toast.dismiss();

            if (data.status === 'approved') {
                toast.success('Pagamento aprovado com sucesso!');
                navigate('/dashboard');
            } else {
                toast.error(data.message || 'Pagamento rejeitado. Verifique os dados do cartão.');
            }

        } catch (error) {
            toast.dismiss();
            const errorMessage = error.response?.data?.message || 'Erro ao processar o pagamento. Tente novamente.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const initialization = {
        amount: 1, // This will be replaced with the actual plan price
    };

    const customization = {
        visual: {
            style: {
                theme: 'bootstrap',
            },
            texts: {
                formTitle: '',
            },
        },
        paymentMethods: {
            maxInstallments: 1,
            creditCard: "all",
        },
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold">Escolha como Pagar</h1>
                <p className="text-gray-600 mt-2">Você está prestes a adquirir o plano. Finalize o pagamento abaixo.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-center space-x-4 mb-6 border-b pb-4">
                    <button
                        onClick={() => setSelectedMethod('pix')}
                        className={`px-6 py-2 rounded-md font-semibold ${selectedMethod === 'pix' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        Pagar com PIX
                    </button>
                    <button
                        onClick={() => setSelectedMethod('card')}
                        className={`px-6 py-2 rounded-md font-semibold ${selectedMethod === 'card' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        Pagar com Cartão
                    </button>
                </div>

                {selectedMethod === 'pix' && (
                    <div className="text-center">
                        <button
                            onClick={handlePixPayment}
                            disabled={isLoading}
                            className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition disabled:bg-gray-400"
                        >
                            {isLoading ? 'Gerando PIX...' : 'Gerar QR Code PIX'}
                        </button>
                    </div>
                )}

                {selectedMethod === 'card' && (
                    <div id="cardPaymentBrick_container">
                        <CardPayment
                            initialization={initialization}
                            customization={customization}
                            onSubmit={handleCardPayment}
                            onError={(error) => console.error('Erro no formulário de pagamento:', error)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentMethodSelection;
