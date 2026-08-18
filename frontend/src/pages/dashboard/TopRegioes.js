// src/pages/dashboard/TopRegioes.js
import React from 'react';
import SummaryCard from '../../components/ui/SummaryCard.js';

const TopRegioes = ({ regioes, isLoading }) => {
    return (
        <SummaryCard title="Regiões Mais Populares" isLoading={isLoading}>
            {regioes && regioes.length > 0 ? (
                <ul className="space-y-3">
                    {regioes.map((item, index) => (
                        <li key={index} className="text-sm flex justify-between items-center p-2 rounded-md hover:bg-accent">
                            <div>
                                <span className="font-bold text-gray-500 mr-3">{index + 1}.</span>
                                <span className="font-semibold text-foreground">{item.regiao}</span>
                            </div>
                            <span className="font-bold text-primary">{item.pedidos}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground h-full flex items-center justify-center">Não há dados de região suficientes.</p>
            )}
        </SummaryCard>
    );
}

export default TopRegioes;
