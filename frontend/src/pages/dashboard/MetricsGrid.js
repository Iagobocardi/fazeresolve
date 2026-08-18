// src/pages/dashboard/MetricsGrid.js
import React from 'react';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../lib/utils';

const MetricCard = ({ title, value, icon, color, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-md">
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-10 w-1/2" />
            </div>
        );
    }

    return (
        <div className={`bg-white p-6 rounded-2xl shadow-md border-l-4 ${color}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-500">{title}</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
                </div>
                <div className={`w-12 h-12 flex items-center justify-center rounded-full text-xl ${icon.bg} ${icon.text}`}>
                    <i className={icon.class}></i>
                </div>
            </div>
        </div>
    );
};


const MetricsGrid = ({ stats, isLoading }) => {
    const metrics = [
        { 
            title: "Faturamento (Mês)", 
            value: formatCurrency(stats?.faturamento || 0), 
            key: 'faturamento',
            icon: { class: 'fas fa-dollar-sign', bg: 'bg-blue-100', text: 'text-blue-500' },
            color: 'border-blue-500'
        },
        { 
            title: "Lucro (Mês)", 
            value: formatCurrency(stats?.lucro || 0), 
            key: 'lucro',
            icon: { class: 'fas fa-arrow-trend-up', bg: 'bg-green-100', text: 'text-green-500' },
            color: 'border-green-500'
        },
        { 
            title: "Novos Clientes", 
            value: stats?.novosClientes || 0, 
            key: 'novosClientes',
            icon: { class: 'fas fa-user-plus', bg: 'bg-orange-100', text: 'text-orange-500' },
            color: 'border-orange-500'
        },
        { 
            title: "Novas Solicitações", 
            value: stats?.novasSolicitacoes || 0, 
            key: 'novasSolicitacoes',
            icon: { class: 'fas fa-bell', bg: 'bg-pink-100', text: 'text-pink-500' },
            color: 'border-pink-500'
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {metrics.map((metric) => (
                <MetricCard 
                    key={metric.key}
                    title={metric.title} 
                    value={metric.value} 
                    icon={metric.icon}
                    color={metric.color}
                    isLoading={isLoading} 
                />
            ))}
        </div>
    );
};

export default MetricsGrid;
