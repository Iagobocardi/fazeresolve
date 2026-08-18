import React, { useEffect } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import apiClient from '../api/apiClient';
import axios from 'axios'; // Import axios
import toast from 'react-hot-toast';

const PaymentForm = ({ plano, registrationData, onPaymentProcessing }) => {
  useEffect(() => {
    // Initialize Mercado Pago SDK when the component mounts
    const publicKey = process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY;
    if (publicKey) {
      initMercadoPago(publicKey);
    }
  }, []);

  const handleSubmit = async (cardFormData) => {
    try {
      if (!registrationData || !registrationData.token) {
        console.error("Dados de registo ou token provisório ausentes.");
        toast.error("Ocorreu um erro com os seus dados de registo. Por favor, tente novamente.");
        return;
      }
      if (!plano || !plano.id) {
        console.error("Dados do plano ausentes.");
        toast.error("Ocorreu um erro com a seleção do plano. Por favor, tente novamente.");
        return;
      }

      const deviceId = window.MP_DEVICE_SESSION_ID;

      const payload = {
        planId: plano.id,
        cardTokenId: cardFormData.token,
        deviceId: deviceId,
      };

      // Crie uma instância isolada do axios para esta chamada específica
      // para garantir que o token provisório seja usado sem interferência dos interceptors globais.
      const provisionalApiClient = axios.create({
        baseURL: apiClient.defaults.baseURL,
      });

      const response = await provisionalApiClient.post(
        '/subscriptions/subscribe',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${registrationData.token}`
          }
        }
      );

      if (response.status === 200) {
        // A API agora sempre retorna 200 para indicar que o processamento começou.
        if (onPaymentProcessing) onPaymentProcessing(response.data.message);
      } else {
        // Qualquer outro status é tratado como um erro inesperado no fluxo novo.
        const errorMessage = response.data?.message || 'Ocorreu uma resposta inesperada do servidor.';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Erro na submissão:', error);
      // O erro 402 não é mais esperado aqui. Qualquer erro é uma falha na comunicação com a API.
      const errorMessage = error.response?.data?.message || 'Não foi possível enviar seu pagamento. Por favor, tente novamente.';
      toast.error(errorMessage);
    }
  };

  const payerEmail = registrationData?.usuario?.email;

  if (!plano) {
    return <div>Erro: Informações do plano não encontradas. Por favor, selecione um plano novamente.</div>;
  }
  
  // Este check pode ser problemático se o email não estiver disponível em registrationData.usuario
  if (!payerEmail) {
    // Adicionado um log para depuração
    console.error("Email do pagador não encontrado nos dados de registro:", registrationData);
    toast.error("Não foi possível verificar seu email para o pagamento. Por favor, tente o processo de registo novamente.");
    return <div>Erro: Email do pagador não encontrado.</div>;
  }

  const initialization = {
    amount: parseFloat(plano.preco),
    payer: {
      email: payerEmail,
    },
  };

  const customization = {
    visual: {
      style: {
        theme: 'bootstrap', // 'default', 'dark', 'bootstrap', 'flat'
        customVariables: {
          fontFamily: "'Inter', sans-serif",
          baseColor: '#333333', // Cor base para textos
          inputsBackgroundColor: '#F7F7F7',
          borderRadius: '8px',
          // Cor dos textos dentro dos inputs
          inputColor: '#333333',
        },
      },
      texts: {
        formTitle: '', // Oculta o título padrão "Meio de pagamento"
        cardHolderNamePlaceholder: 'Nome impresso no cartão',
        cardHolderEmailPlaceholder: 'E-mail',
        cardNumberPlaceholder: 'Número do cartão',
        cardExpirationDatePlaceholder: 'MM/AA',
        securityCodePlaceholder: 'CVC',
        issuerPlaceholder: 'Banco emissor',
        installmentsPlaceholder: 'Parcelas',
        cardHolderIdentificationTypePlaceholder: 'Tipo de documento',
        cardHolderIdentificationNumberPlaceholder: 'Número do documento',
      },
    },
  };

  return (
    <div id="payment-form-container" className="p-1">
        <p className="text-sm text-gray-600 mb-4">
            Preencha os dados do seu cartão. O ambiente é 100% seguro.
        </p>
        <p className="text-xs text-gray-500 mb-4 text-center">
            Pagamento processado com segurança pelo Mercado Pago.
        </p>
      <CardPayment
        initialization={initialization}
        customization={customization}
        onSubmit={handleSubmit}
        onError={(error) => console.error('Erro no Brick de Cartão:', error)}
        onReady={() => console.log('Brick de Cartão pronto!')}
      />
    </div>
  );
};

export default PaymentForm;
