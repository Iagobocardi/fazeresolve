import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WarningBanner = ({ expiresAt }) => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) {
        return null;
    }

    const formattedDate = expiresAt ? format(parseISO(expiresAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'data inválida';

    return (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 w-full" role="alert">
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-bold">Aviso de Pagamento</p>
                    <p>O seu pagamento está pendente. Para evitar a suspensão da sua conta, por favor, regularize a sua situação até {formattedDate}.</p>
                    <Link to="/billing" className="text-sm font-semibold text-yellow-800 hover:underline">
                        Atualizar Pagamento Agora
                    </Link>
                </div>
                <button onClick={() => setIsVisible(false)} className="text-yellow-500 hover:text-yellow-700">
                    <svg className="h-6 w-6" role="button" aria-label="Fechar" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default WarningBanner;
