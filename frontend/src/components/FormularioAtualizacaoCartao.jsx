import React, { useState } from 'react';
import { CardPayment } from '@mercadopago/sdk-react';
import toast from 'react-hot-toast';

const FormularioAtualizacaoCartao = ({ onCardTokenReceived }) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleSubmit = async (formData) => {
    if (formData.token) {
      onCardTokenReceived(formData.token);
    } else {
      toast.error('Não foi possível processar os dados do cartão. Tente novamente.');
    }
  };

  const handleReady = () => {
    // The CardPayment brick is ready, so we can hide the loading indicator.
    setIsLoading(false);
  };

  const handleError = (error) => {
    // Handle errors from the CardPayment brick
    console.error('Erro no CardPayment Brick:', error);
    toast.error('Ocorreu um erro ao carregar o formulário de pagamento. Tente novamente.');
  };

  return (
    <div>
      {isLoading && <div>Carregando formulário de pagamento...</div>}
      <div style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
        <CardPayment
          initialization={{ amount: 1 }} // Amount must be non-zero for tokenization
          onSubmit={handleSubmit}
          onReady={handleReady}
          onError={handleError}
          customization={{
            visual: {
              style: {
                theme: 'bootstrap',
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default FormularioAtualizacaoCartao;
