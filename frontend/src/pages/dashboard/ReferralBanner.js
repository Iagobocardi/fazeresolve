import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.jsx";
import { Button } from '../../components/ui/Button.jsx';

const ReferralBanner = () => {
    // Links foram hardcoded como solicitado pelo usuário
    const mercadoPagoLink = "https://mpago.li/1ScSvTu";
    const maquininhaLink = "https://mpago.li/2Jay3vB";

    return (
        <Card className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
            <CardHeader>
                <CardTitle>Modernize Seus Pagamentos com Mercado Pago</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4">
                <a href={mercadoPagoLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button className="w-full bg-white text-blue-600 hover:bg-blue-100">
                        Receber Pagamentos via App (PIX, Cartão)
                    </Button>
                </a>
                <a href={maquininhaLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                     <Button className="w-full bg-white text-cyan-600 hover:bg-cyan-100">
                        Adquirir Sua Maquininha Point
                    </Button>
                </a>
            </CardContent>
        </Card>
    );
};

export default ReferralBanner;
