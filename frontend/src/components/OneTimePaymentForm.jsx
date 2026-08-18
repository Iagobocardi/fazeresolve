import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// Chave pública do Mercado Pago (deve estar no seu .env do frontend)
const MP_PUBLIC_KEY = process.env.REACT_APP_MP_PUBLIC_KEY;

const OneTimePaymentForm = ({ onSubmit, isLoading }) => {
    const [mp, setMp] = useState(null);

    // 1. CARREGAR O SDK DO MERCADO PAGO
    useEffect(() => {
        if (window.MercadoPago) {
            setMp(new window.MercadoPago(MP_PUBLIC_KEY));
        } else {
            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.async = true;
            script.onload = () => {
                setMp(new window.MercadoPago(MP_PUBLIC_KEY));
            };
            document.body.appendChild(script);
        }
    }, []);

    // 2. FUNÇÃO PARA GERAR O TOKEN
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!mp) {
            toast.error('SDK do Mercado Pago não carregou. Tente novamente.');
            return;
        }

        try {
            const form = e.target;
            const cardToken = await mp.createCardToken({
                cardholderName: form.cardholderName.value,
                identificationType: form.docType.value,
                identificationNumber: form.docNumber.value,
            });

            // 3. ENVIAR O TOKEN PARA O COMPONENTE PAI
            onSubmit(cardToken.id);

        } catch (error) {
            console.error('Erro ao criar token do cartão:', error);
            toast.error('Dados do cartão inválidos. Verifique as informações e tente novamente.');
        }
    };

    // Se o SDK ainda não carregou, não mostra o formulário
    if (!mp) {
        return <div>Carregando formulário de pagamento...</div>;
    }

    // 4. RENDERIZAR O FORMULÁRIO COM OS ATRIBUTOS `data-checkout`
    return (
        <form id="form-checkout" onSubmit={handleFormSubmit} className="bg-white p-8 rounded-2xl shadow-lg space-y-4">
            <div>
                <label htmlFor="cardNumber" className="text-sm font-medium text-slate-700">Número do Cartão</label>
                <div id="cardNumber" className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg h-10"></div>
            </div>
            <div className="flex space-x-4">
                <div className="w-1/2">
                    <label htmlFor="expirationDate" className="text-sm font-medium text-slate-700">Validade</label>
                    <div id="expirationDate" className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg h-10"></div>
                </div>
                <div className="w-1/2">
                    <label htmlFor="securityCode" className="text-sm font-medium text-slate-700">CVC</label>
                    <div id="securityCode" className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg h-10"></div>
                </div>
            </div>
             <div>
                <label htmlFor="cardholderName" className="text-sm font-medium text-slate-700">Nome do Titular</label>
                <input type="text" id="cardholderName" className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
                <label htmlFor="docType" className="text-sm font-medium text-slate-700">Tipo de Documento</label>
                <select id="docType" className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg">
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                </select>
            </div>
            <div>
                <label htmlFor="docNumber" className="text-sm font-medium text-slate-700">Número do Documento</label>
                <input type="text" id="docNumber" className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition disabled:bg-slate-400">
                {isLoading ? 'Processando...' : 'Pagar Agora'}
            </button>
        </form>
    );
};

export default OneTimePaymentForm;
