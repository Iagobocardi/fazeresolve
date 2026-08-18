// src/pages/PaymentPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import apiClient from '../api/apiClient';

const MP_PUBLIC_KEY = process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY;

const PaymentPage = () => {
    const { publicId } = useParams();
    const navigate = useNavigate();
    const [mp, setMp] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [amount, setAmount] = useState(null);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            setIsLoading(true);
            try {
                const { data } = await apiClient.get(`/public/pedidos/${publicId}`);
                if (data && data.valorProposto > 0) {
                    setAmount(data.valorProposto);
                } else {
                    toast.error("Valor do pedido inválido ou não encontrado.");
                    navigate(`/status/${publicId}`);
                }
            } catch (error) {
                toast.error("Erro ao buscar detalhes do pedido.");
                navigate(`/status/${publicId}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrderDetails();
    }, [publicId, navigate]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => {
            if (window.MercadoPago) {
                setMp(new window.MercadoPago(MP_PUBLIC_KEY));
            }
        };
        document.body.appendChild(script);

        return () => {
            if(document.body.contains(script)){
                document.body.removeChild(script);
            }
        }
    }, []);

    const finalizePayment = useCallback(async (token) => {
        setIsLoading(true);
        try {
            const response = await apiClient.post(
                `/public/pedidos/${publicId}/pagar`,
                { cardTokenId: token }
            );

            toast.success(response.data.message || 'Pagamento realizado com sucesso!');
            navigate(`/status/${publicId}`);

        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Erro ao processar pagamento.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [navigate, publicId]);

    useEffect(() => {
        if (mp && amount) {
            mp.cardForm({
                amount: amount.toString(),
                iframe: true,
                form: {
                    id: "form-checkout",
                    cardNumber: { id: "cardNumber" },
                    cardExpirationMonth: { id: "expMonth" },
                    cardExpirationYear: { id: "expYear" },
                    securityCode: { id: "cvc" },
                    cardholderName: { id: "cardHolderName" },
                    identificationType: { id: "docType" },
                    identificationNumber: { id: "docNumber" },
                    issuer: { id: "issuer" },
                    installments: { id: "installments" },
                },
                callbacks: {
                    onFormMounted: error => {
                        if (error) toast.error("Erro ao inicializar o formulário.");
                    },
                    onSubmit: event => {
                        event.preventDefault();
                        const { getCardFormData } = mp.cardForm;
                        getCardFormData({
                            callback: finalizePayment,
                            errorCallback: error => {
                                toast.error('Dados do cartão inválidos. Verifique e tente novamente.');
                                console.error('Error getting card form data: ', error);
                            }
                        });
                    },
                },
            });
        }
    }, [mp, amount, finalizePayment]);
    
    return (
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center min-h-screen p-4">
            {isLoading && <LoadingSpinner />}
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full m-4">
                 <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Pagamento do Pedido</h1>
                    <p className="text-gray-500 text-sm">Preencha os dados do seu cartão com segurança.</p>
                </div>
                <div className="flex justify-center items-center space-x-2 mb-8">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" className="h-5" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/1200px-MasterCard_Logo.svg.png" alt="Mastercard" className="h-5" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/1200px-American_Express_logo_%282018%29.svg.png" alt="Amex" className="h-5" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Elo_symbol_transparent.svg/1200px-Elo_symbol_transparent.svg.png" alt="Elo" className="h-4" />
                </div>
                <form id="form-checkout" className="space-y-4">
                    <div>
                        <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">Número do cartão</label>
                        <div id="cardNumber" className="w-full h-10 px-3 border border-gray-300 rounded-lg focus-within:ring-blue-500 focus-within:border-blue-500 transition duration-150 ease-in-out font-mono tracking-wide"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="expMonth" className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
                            <div id="expMonth" className="w-full h-10 px-3 border border-gray-300 rounded-lg focus-within:ring-blue-500 focus-within:border-blue-500 transition duration-150 ease-in-out"></div>
                        </div>
                        <div>
                            <label htmlFor="expYear" className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                            <div id="expYear" className="w-full h-10 px-3 border border-gray-300 rounded-lg focus-within:ring-blue-500 focus-within:border-blue-500 transition duration-150 ease-in-out"></div>
                        </div>
                        <div>
                            <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                            <div id="cvc" className="w-full h-10 px-3 border border-gray-300 rounded-lg focus-within:ring-blue-500 focus-within:border-blue-500 transition duration-150 ease-in-out"></div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="cardHolderName" className="block text-sm font-medium text-gray-700 mb-1">Nome do titular</label>
                        <input type="text" id="cardHolderName" placeholder="Nome Completo (igual ao cartão)" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="docType" className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
                            <select id="docType" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out bg-white" required></select>
                        </div>
                        <div>
                            <label htmlFor="docNumber" className="block text-sm font-medium text-gray-700 mb-1">Número do documento</label>
                            <input type="text" id="docNumber" placeholder="Somente números" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out" required />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="issuer" className="block text-sm font-medium text-gray-700 mb-1">Banco emissor</label>
                        <select id="issuer" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out bg-white" required></select>
                    </div>
                    <div>
                        <label htmlFor="installments" className="block text-sm font-medium text-gray-700 mb-1">Parcelas</label>
                        <select id="installments" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out bg-white" required></select>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        Pagar Agora
                    </button>
                     <div className="flex items-center justify-center mt-6 text-gray-500 text-sm">
                        <svg className="w-4 h-4 mr-2 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M12 18.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM12 18.75c-4.142 0-7.5-3.136-7.5-7s3.358-7 7.5-7 7.5 3.136 7.5 7-3.358 7-7.5 7z" />
                        </svg>
                        <span>Pagamento seguro processado pelo </span>
                        <img src="https://logodownload.org/wp-content/uploads/2019/11/mercado-pago-logo.png" alt="Mercado Pago" className="h-4 ml-1" />
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentPage;

