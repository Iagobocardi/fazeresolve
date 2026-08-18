import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

const PagamentoPendentePage = () => {
  const location = useLocation();
  const paymentInfo = location.state?.paymentInfo;

  if (!paymentInfo) {
    // If no paymentInfo is passed, redirect to the plans page
    return <Navigate to="/planos" />;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentInfo.qrCode);
    toast.success('Código Pix copiado para a área de transferência!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-center p-4">
      <Card className="w-full max-w-md bg-white rounded-lg shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Sua conta foi criada!</CardTitle>
          <p className="text-slate-600">Pague com Pix para ativar seu acesso.</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <img 
            src={paymentInfo.qrCodeBase64} 
            alt="QR Code Pix" 
            className="w-64 h-64 border-4 border-gray-200 rounded-lg" 
          />
          <p className="text-sm text-center text-gray-600">
            Abra o app do seu banco e escaneie o QR Code ou copie o código abaixo.
          </p>
          <div className="w-full p-3 bg-gray-100 rounded-md">
            <p className="text-xs break-words text-gray-700">{paymentInfo.qrCode}</p>
          </div>
          <Button onClick={handleCopy} className="w-full">
            Copiar Código
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-center text-muted-foreground">
            O acesso será liberado automaticamente após a confirmação do pagamento.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PagamentoPendentePage;
