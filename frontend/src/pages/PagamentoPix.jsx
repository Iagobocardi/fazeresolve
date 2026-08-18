import React from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

// Ícone para o botão de copiar
const CopyIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> );

const PagamentoPix = () => {
    const location = useLocation();
    // Pega os dados do PIX que foram passados pela página de cadastro
    const paymentInfo = location.state?.paymentInfo;

    // Se um usuário chegar a esta página sem os dados do PIX, ele é redirecionado
    if (!paymentInfo) {
        toast.error("Nenhuma informação de pagamento encontrada.");
        return <Navigate to="/planos" />;
    }

    // Função para copiar o código PIX para a área de transferência
    const copyToClipboard = () => {
        navigator.clipboard.writeText(paymentInfo.qrCode);
        toast.success('Código PIX copiado!');
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center">
                <h2 className="text-2xl font-bold text-slate-900">Finalize seu Pagamento</h2>
                <p className="text-slate-600 mt-2">Sua conta foi criada com sucesso! Pague o PIX para liberar seu acesso.</p>

                <div className="my-6">
                    {/* Exibe a imagem do QR Code a partir da string base64 */}
                    <img
                        src={`data:image/png;base64,${paymentInfo.qrCodeBase64}`}
                        alt="QR Code PIX"
                        className="mx-auto border-4 border-slate-200 rounded-lg"
                    />
                </div>

                <p className="text-sm text-slate-500">Se preferir, use o código "copia e cola" abaixo:</p>

                <div className="mt-2">
                    {/* Exibe o código PIX completo */}
                    <div className="bg-slate-100 p-3 rounded-lg break-words text-xs text-slate-700">
                        {paymentInfo.qrCode}
                    </div>
                    {/* Botão para copiar o código */}
                    <button
                        onClick={copyToClipboard}
                        className="mt-4 w-full flex items-center justify-center bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-600 transition"
                    >
                        Copiar Código PIX <CopyIcon />
                    </button>
                </div>

                <div className="mt-8">
                    <p className="text-sm text-slate-500">
                        Após o pagamento, seu acesso será liberado automaticamente.
                    </p>
                    <Link to="/login" className="text-blue-600 hover:underline font-medium mt-2 inline-block">
                        Ir para a página de Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PagamentoPix;
