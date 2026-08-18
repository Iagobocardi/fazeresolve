import React, { useEffect } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const UpdatePaymentMethodForm = ({ onFinished, onCancel }) => {
  useEffect(() => {
    const publicKey = process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY;
    if (publicKey) {
      initMercadoPago(publicKey, { locale: 'pt-BR' });
    } else {
      console.error('A chave pública do Mercado Pago não foi encontrada.');
      toast.error('Não foi possível carregar o formulário de pagamento.');
    }
  }, []);

  const handlePayment = async (formData) => {
    try {
      const cardTokenId = formData.token;
      if (!cardTokenId) {
        toast.error('Não foi possível gerar o token do cartão. Tente novamente.');
        return;
      }
      await apiClient.post('/configuracoes/assinatura/atualizar-pagamento', { cardTokenId });
      toast.success('Método de pagamento atualizado com sucesso!');
      if (onFinished) {
        onFinished();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Falha ao atualizar o método de pagamento.');
      console.error('Payment update failed:', error);
    }
  };

  const initialization = {
    amount: 0, // 0 amount for card tokenization
  };

  const customization = {
    visual: {
        style: {
            theme: 'bootstrap', // or 'default', 'dark'
            customVariables: {
                formBackgroundColor: '#ffffff',
                baseColor: '#4f46e5', // indigo-600
                // Add other custom styles here
            }
        }
    },
    paymentMethods: {
        maxInstallments: 1,
        // You can add other payment method customizations here
    }
  };

  const onError = async (error) => {
    console.error('Mercado Pago Error:', error);
    toast.error('Ocorreu um erro ao processar os dados do cartão. Verifique as informações e tente novamente.');
  };

  const onReady = () => {
    // Callback called when the Brick is ready.
    // For example, you can hide a loading indicator.
  };

  return (
    <div>
        <CardPayment
          initialization={initialization}
          customization={customization}
          onSubmit={handlePayment}
          onError={onError}
          onReady={onReady}
        />
        <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onCancel} className="bg-slate-100 text-slate-700 font-semibold px-6 py-2 rounded-lg hover:bg-slate-200">
                Cancelar
            </button>
            {/* The submit button is rendered by the CardPayment component itself */}
        </div>
    </div>
  );
};

export default UpdatePaymentMethodForm;
