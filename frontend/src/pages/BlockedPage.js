// src/pages/BlockedPage.js
import React from 'react';
import RegularizePaymentPage from './RegularizePaymentPage'; // Re-use the form component

const BlockedPage = () => {
    return (
        <div className="min-h-screen bg-red-50 dark:bg-red-900/10">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                    <div className="bg-red-600 p-6 text-white text-center">
                        <h1 className="text-3xl font-bold">Acesso Suspenso</h1>
                        <p className="mt-2">Sua conta foi temporariamente bloqueada por falta de pagamento.</p>
                    </div>
                    <div className="p-6">
                        <p className="text-center text-gray-700 dark:text-gray-300 mb-6">
                            Para voltar a ter acesso a todas as funcionalidades da plataforma, por favor, regularize sua pendência abaixo.
                        </p>
                        {/* Embed the payment regularization form */}
                        <RegularizePaymentPage />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlockedPage;
