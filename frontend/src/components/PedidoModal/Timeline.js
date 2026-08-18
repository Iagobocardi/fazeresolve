import React from 'react';

const Timeline = ({ historico }) => {
    return (
        <div className="bg-slate-50 p-6 rounded-lg border">
            <h2 className="font-bold text-lg text-gray-700 mb-4">Histórico do Pedido</h2>
            <ul className="space-y-3">
                {historico && historico.length > 0 ? (
                    historico.slice(0).reverse().map((item, index) => (
                        <li key={index} className="text-sm text-gray-600 border-l-2 pl-3 border-gray-200">
                            <p className="font-medium text-gray-800">{item.evento}</p>
                            <p className="text-xs text-gray-400">{new Date(item.data).toLocaleString('pt-BR')}</p>
                        </li>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 italic">Nenhum evento registrado.</p>
                )}
            </ul>
        </div>
    );
};

export default Timeline;
