import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PLANS } from './PaginaDePlanos'; // Importa os dados dos planos
import LoadingSpinner from '../components/LoadingSpinner'; // Importa o spinner

const EscolherPagamento = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { state } = location;
    const [isLoading, setIsLoading] = useState(false);

    // Extrair dados do estado da navegação
    const { planId, paymentType, registrationData } = state || {};

    // Encontra os detalhes do plano e do pacote específico
    const { planName, packagePrice } = useMemo(() => {
        let pName = 'Plano Desconhecido';
        let pkgPrice = '0,00';
        const plan = PLANS.find(p => 
            p.oneTime.some(pkg => pkg.id === planId) || 
            p.monthly.id === planId || 
            p.annual.id === planId
        );
        if (plan) {
            pName = plan.name;
            const oneTimePackage = plan.oneTime.find(pkg => pkg.id === planId);
            if (oneTimePackage) {
                pkgPrice = oneTimePackage.price;
            }
        }
        return { planName: pName, packagePrice: pkgPrice };
    }, [planId]);

    const handlePaymentSelection = async (paymentMethod) => {
        if (!registrationData || !planId || !paymentType) {
            toast.error("Dados de registro incompletos. Por favor, volte e preencha novamente.");
            navigate('/subscribe');
            return;
        }

        setIsLoading(true);

        // O endpoint de registro espera valores diferentes ('PIX'/'CREDIT_CARD') do endpoint de pagamento ('pix'/'card').
        const registrationPaymentMethod = paymentMethod === 'pix' ? 'PIX' : 'CREDIT_CARD';

        const finalRegistrationData = {
            ...registrationData,
            planId,
            paymentType,
            paymentMethod: registrationPaymentMethod, // Envia 'PIX' ou 'CREDIT_CARD' para o registro
        };

        try {
            // Etapa 1: Registrar o usuário
            const registerResponse = await axios.post(`${process.env.REACT_APP_API_URL}/auth/register`, finalRegistrationData);
            
            toast.success(registerResponse.data.message || "Conta criada com sucesso!");

            // Guarda o token para uso nas próximas requisições
            const authToken = registerResponse.data.token;
            localStorage.setItem('authToken', authToken);

            // Etapa 2: Criar o pagamento
            if (paymentMethod === 'pix') {
                toast.loading('Gerando QR Code PIX...');
                const paymentResponse = await axios.post(
                    `${process.env.REACT_APP_API_URL}/pagamentos/onetime`,
                    { planId, paymentMethod },
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );
                
                toast.dismiss(); // Remove o toast de "loading"
                
                if (paymentResponse.data.qrCode && paymentResponse.data.qrCodeBase64) {
                    navigate('/pagamento-pix', { state: { paymentInfo: paymentResponse.data } });
                } else {
                    throw new Error("Dados do PIX não recebidos do servidor.");
                }

            } else if (paymentMethod === 'card') {
                // Para o cartão, só precisamos navegar, os dados do cartão serão inseridos lá
                navigate('/pagamento-cartao', { state: { planId, paymentType, paymentMethod } });
            }

        } catch (error) {
            toast.dismiss(); // Garante que o toast de loading seja removido em caso de erro
            const errorMessage = error.response?.data?.message || 'Erro ao finalizar registro. Tente novamente.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVoltar = () => {
        // Volta para a página de inscrição para corrigir dados se necessário
        navigate('/subscribe', { state: { planId, paymentType } });
    };

    return (
        <div className="bg-gray-900 flex items-center justify-center min-h-screen font-sans">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full m-4">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Finalize sua Compra</h1>
                    <p className="text-gray-500 mt-1">Você está a um passo de adquirir seu acesso.</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">{planName}</span>
                        <span className="text-gray-800 font-bold text-lg">R$ {packagePrice}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Pagamento único para o período selecionado. Sem renovação automática.</p>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">Como você quer pagar?</h2>
                    <div className="space-y-4">
                        <button 
                            onClick={() => handlePaymentSelection('pix')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center text-left p-4 bg-white border-2 border-cyan-500 rounded-lg shadow-sm hover:bg-cyan-50 hover:border-cyan-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50">
                            <svg className="w-6 h-6 mr-3 text-cyan-600" xmlns="http://www.w.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14.92,10.26c-1.34-0.42-1.63-0.89-1.63-1.54c0-0.65,0.53-1.2,1.52-1.2c1.25,0,1.6,0.82,1.63,1.56h2.24 c-0.03-1.61-1.28-2.88-3.87-2.88c-2.31,0-3.76,1.25-3.76,3.03c0,2.15,1.75,2.83,3.02,3.25c1.42,0.48,1.68,0.96,1.68,1.59 c0,0.73-0.6,1.29-1.72,1.29c-1.22,0-1.82-0.8-1.85-1.65H10.5c0.05,1.68,1.38,3,4.03,3c2.45,0,3.95-1.22,3.95-3.12 C18.48,11.53,16.51,10.76,14.92,10.26z M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20 c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8S16.41,20,12,20z"/>
                            </svg>
                            <span className="font-semibold text-gray-800 text-base">Pagar com PIX</span>
                        </button>
                        
                        <button 
                            onClick={() => handlePaymentSelection('card')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center text-left p-4 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                            <svg className="w-6 h-6 mr-3" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 21z" />
                            </svg>
                            <span className="font-semibold text-base">Pagar com Cartão</span>
                        </button>
                    </div>
                </div>
                
                <div className="mt-8 text-center">
                    <div className="flex items-center justify-center text-gray-500 mb-4">
                        <svg className="w-4 h-4 mr-2" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" />
                        </svg>
                        <span className="text-xs font-medium">Pagamento 100% Seguro</span>
                    </div>
                    
                    <button onClick={handleVoltar} className="text-sm text-gray-500 hover:text-gray-700 hover:underline transition-colors">Voltar</button>
                </div>
            </div>
            {isLoading && <LoadingSpinner />}
        </div>
    );
};

export default EscolherPagamento;
