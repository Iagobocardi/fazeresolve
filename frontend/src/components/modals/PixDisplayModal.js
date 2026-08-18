import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

const PixDisplayModal = ({ pixData, onClose }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(pixData.qr_code);
    toast.success('Código Pix copiado para a área de transferência!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <Card className="w-full max-w-sm bg-white rounded-lg shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Pague com Pix</CardTitle>
          <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={onClose}>
            X
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <img src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} alt="QR Code Pix" className="w-64 h-64 border-4 border-gray-200 rounded-lg" />
          <p className="text-sm text-center text-gray-600">
            Abra o app do seu banco e escaneie o QR Code ou copie o código abaixo.
          </p>
          <div className="w-full p-2 bg-gray-100 rounded-md">
            <p className="text-xs break-words text-gray-700">{pixData.qr_code}</p>
          </div>
          <Button onClick={handleCopy} className="w-full">
            Copiar Código
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-center text-muted-foreground">
            Após o pagamento, sua assinatura será ativada automaticamente.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PixDisplayModal;
