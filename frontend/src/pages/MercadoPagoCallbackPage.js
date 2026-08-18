import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const MercadoPagoCallbackPage = () => {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    const processCallback = async () => {
      const queryParams = new URLSearchParams(location.search);
      const code = queryParams.get('code');

      if (!code) {
        setStatus('error');
        setError('O código de autorização do Mercado Pago não foi encontrado na URL.');
        toast.error('Erro de autorização: código não encontrado.');
        return;
      }

      // Etapa 2 (futura): Enviar o código para o back-end para finalizar a conexão.
      // Por enquanto, apenas exibimos uma mensagem de sucesso, pois o endpoint do back-end não está pronto.
      // try {
      //   const token = localStorage.getItem('authToken');
      //   await apiClient.post('/configuracoes/mercadopago/finalize', { code, token });
      //   setStatus('success');
      //   toast.success('Sua conta Mercado Pago foi conectada com sucesso!');
      // } catch (err) {
      //   setStatus('error');
      //   const errorMessage = err.response?.data?.message || 'Falha ao finalizar a conexão com o Mercado Pago.';
      //   setError(errorMessage);
      //   toast.error(errorMessage);
      // }

      // Simulação da Etapa 2
      console.log('Código de autorização recebido:', code);
      setStatus('success');
      toast.success('Conexão com Mercado Pago iniciada! O processo será finalizado em breve.');

    };

    processCallback();
  }, [location]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        {status === 'processing' && (
          <>
            <i className="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
            <h1 className="text-2xl font-bold text-slate-800">Processando Conexão</h1>
            <p className="text-slate-600 mt-2">Aguarde um momento enquanto finalizamos a conexão com sua conta do Mercado Pago...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <i className="fas fa-check-circle text-4xl text-green-500 mb-4"></i>
            <h1 className="text-2xl font-bold text-slate-800">Quase lá!</h1>
            <p className="text-slate-600 mt-2">
              Recebemos a autorização do Mercado Pago. A integração será completada no nosso sistema em breve.
              Você já pode voltar para suas configurações.
            </p>
            <Link to="/configuracoes?tab=recebimentos" className="mt-6 inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-700">
              Voltar para Configurações
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <i className="fas fa-times-circle text-4xl text-red-500 mb-4"></i>
            <h1 className="text-2xl font-bold text-slate-800">Erro na Conexão</h1>
            <p className="text-slate-600 mt-2">
              Ocorreu um problema ao tentar conectar sua conta do Mercado Pago.
            </p>
            <p className="text-red-600 bg-red-100 p-3 rounded-md mt-4 text-sm">{error}</p>
            <Link to="/configuracoes?tab=recebimentos" className="mt-6 inline-block bg-slate-200 text-slate-800 font-bold px-6 py-3 rounded-lg hover:bg-slate-300">
              Tentar Novamente
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default MercadoPagoCallbackPage;
