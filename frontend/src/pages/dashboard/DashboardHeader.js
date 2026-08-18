import React from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardHeader = () => {
    const navigate = useNavigate();

    const handleNewServiceClick = () => {
        navigate('/pedidos/novo');
    };

    return (
        <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-slate-500">Bem-vindo! Aqui está um resumo do seu negócio.</p>
            </div>
            <div className="flex items-center gap-3">
                <button className="bg-white border border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
                    <i className="fas fa-calendar-alt mr-2 text-slate-400"></i>
                    <span>Últimos 30 dias</span>
                </button>
                 <button 
                    onClick={handleNewServiceClick}
                    className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all"
                 >
                    <i className="fas fa-plus mr-2"></i>
                    <span>Novo Serviço</span>
                </button>
            </div>
        </header>
    );
};

export default DashboardHeader;
