import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/Button';
import PaymentForm from '../PaymentForm';

const PaymentModal = ({ plano, onClose, onPaymentSuccess, registrationData }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Assinar Plano {plano.nome}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>X</Button>
        </CardHeader>
        <CardContent className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <p className="text-lg font-semibold">Valor: R$ {plano.preco}/mês</p>
          <div id="payment-brick-container">
            <PaymentForm
                plano={plano}
                onPaymentSuccess={onPaymentSuccess}
                registrationData={registrationData}
            />
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            O pagamento é processado de forma segura pelo Mercado Pago.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentModal;
