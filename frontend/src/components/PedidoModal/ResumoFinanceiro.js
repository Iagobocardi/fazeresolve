import React from 'react';
import { formatCurrency } from '../../lib/utils.js';

const ResumoFinanceiro = ({ valorProposto, custosTotais, lucroReal }) => {
    return (
        <div className="bg-slate-50 p-6 rounded-lg border">
            <h2 className="font-bold text-lg text-gray-700 mb-4">Resumo Financeiro</h2>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(valorProposto)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Custos</span>
                    <span className="text-red-600">{formatCurrency(custosTotais)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                    <span className="text-gray-800">Lucro</span>
                    <span className={lucroReal >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(lucroReal)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ResumoFinanceiro;
