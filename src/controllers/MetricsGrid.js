import React from 'react';
import { Skeleton } from '../../components/ui/Skeleton';

const StatCard = ({ title, value, icon, bgColor, iconColor, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="w-10 h-10 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-1/2" />
            </div>
        );
    }

    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-500">{title}</h2>
                <div className={`w-10 h-10 flex items-center justify-center ${bgColor} text-white rounded-lg`}>
                    <i className={`fas ${icon}`}></i>
                </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
        </div>
    );
};

const MetricsGrid = ({ stats, isLoading }) => {
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    const metrics = [
        { title: 'Faturamento', value: formatCurrency(stats?.faturamento), icon: 'fa-dollar-sign', bgColor: 'bg-blue-500' },
        { title: 'Lucro', value: formatCurrency(stats?.lucro), icon: 'fa-arrow-trend-up', bgColor: 'bg-green-500' },
        { title: 'Novos Clientes', value: stats?.novosClientes || 0, icon: 'fa-user-plus', bgColor: 'bg-orange-500' },
        { title: 'Pedidos Pendentes', value: stats?.pedidosPendentes || 0, icon: 'fa-hourglass-half', bgColor: 'bg-pink-500' }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {metrics.map(metric => (
                <StatCard 
                    key={metric.title}
                    title={metric.title}
                    value={metric.value}
                    icon={metric.icon}
                    bgColor={metric.bgColor}
                    isLoading={isLoading}
                />
            ))}
        </div>
    );
};

export default MetricsGrid;
