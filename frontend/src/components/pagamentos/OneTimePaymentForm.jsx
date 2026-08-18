import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const OneTimePaymentForm = ({ onTokenReceived }) => {
  const [mercadoPago, setMercadoPago] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => {
      const mp = new window.MercadoPago(process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY);
      setMercadoPago(mp);
    };
    document.body.appendChild(script);

    return () => {
      const scriptElement = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
      if (scriptElement) {
        document.body.removeChild(scriptElement);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!mercadoPago) {
      toast.error('O formulário de pagamento não está pronto. Tente novamente em alguns segundos.');
      setIsLoading(false);
      return;
    }

    const form = e.target;
    try {
      const cardToken = await mercadoPago.createCardToken({
        cardholderName: form.cardholderName.value,
        cardNumber: form.cardNumber.value,
        cardExpirationMonth: form.cardExpirationMonth.value,
        cardExpirationYear: form.cardExpirationYear.value,
        securityCode: form.securityCode.value,
        docType: form.docType.value,
        docNumber: form.docNumber.value,
      });
      onTokenReceived(cardToken.id);
    } catch (error) {
      toast.error('Erro ao processar os dados do cartão. Verifique as informações e tente novamente.');
      console.error('Error creating card token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form id="form-checkout" onSubmit={handleSubmit} className="space-y-4">
      <input type="text" data-checkout="cardholderName" placeholder="Nome do Titular" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="text" data-checkout="cardNumber" placeholder="Número do Cartão" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="flex space-x-4">
        <input type="text" data-checkout="cardExpirationMonth" placeholder="Mês (MM)" className="w-1/2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="text" data-checkout="cardExpirationYear" placeholder="Ano (YY)" className="w-1/2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <input type="text" data-checkout="securityCode" placeholder="CVC" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="flex space-x-4">
        <select data-checkout="docType" className="w-1/2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="CPF">CPF</option>
        </select>
        <input type="text" data-checkout="docNumber" placeholder="Número do Documento" className="w-1/2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <select data-checkout="installments" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></select>
      <button type="submit" disabled={isLoading} className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition disabled:bg-slate-400">
        {isLoading ? 'Processando...' : 'Pagar'}
      </button>
    </form>
  );
};

export default OneTimePaymentForm;
