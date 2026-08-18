import React from 'react';
import CatalogoTabela from '../components/ui/CatalogoTabela';

const CatalogoPage = () => {
    return (
        <div className="guide-container">
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Catálogo Inteligente</h1>
                    <p className="mt-2 text-slate-600">Bem-vindo ao seu Catálogo Inteligente. Explore os preços de mercado e gerencie seus próprios itens e estoque em um só lugar.</p>
                </div>
                <CatalogoTabela />
            </div>
        </div>
    );
};

export default CatalogoPage;
