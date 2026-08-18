import React, { useRef, useEffect, useState } from 'react';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, BarController, PointElement, LineElement, LineController, Title, Tooltip, Legend, Filler } from 'chart.js';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { Skeleton } from '../../components/ui/Skeleton';

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, PointElement, LineElement, LineController, Title, Tooltip, Legend, Filler);

const fetchFinancialHistory = async () => {
    const { data } = await apiClient.get('/relatorios/desempenho-financeiro-mensal');
    return data;
};

function createGradient(ctx, area) {
    const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
    gradient.addColorStop(0, 'rgba(96, 165, 250, 0)');
    gradient.addColorStop(1, 'rgba(96, 165, 250, 0.5)');
    return gradient;
}

const FinancialChart = () => {
    const { data: history, isLoading, error } = useQuery({
        queryKey: ['financialHistory'],
        queryFn: fetchFinancialHistory,
    });

    const chartRef = useRef(null);
    const [chartData, setChartData] = useState({ datasets: [] });

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !history) return;

        const labels = history.map(item => new Date(item.mes).toLocaleString('pt-BR', { month: 'short' })) || [];
        const receitaData = history.map(item => item.receita) || [];
        const despesaData = history.map(item => item.despesa) || [];
        const lucroData = history.map(item => item.receita - item.despesa) || [];

        setChartData({
            labels,
            datasets: [
                {
                    label: 'Faturamento',
                    data: receitaData,
                    type: 'line',
                    borderColor: '#60a5fa',
                    backgroundColor: createGradient(chart.ctx, chart.chartArea),
                    fill: true,
                    tension: 0.4,
                },
                {
                    label: 'Lucro',
                    data: lucroData,
                    type: 'line',
                    borderColor: '#4ade80',
                    fill: false,
                    tension: 0.4,
                },
                {
                    label: 'Despesas',
                    data: despesaData,
                    type: 'line',
                    borderColor: '#f87171',
                    fill: false,
                    borderDash: [5, 5],
                }
            ]
        });
    }, [history]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                    }
                }
            }
        },
        scales: {
            x: { grid: { display: false } },
            y: { 
                beginAtZero: true, 
                grid: { color: '#e2e8f0' },
                ticks: {
                    callback: function(value) {
                        if (value >= 1000) return (value / 1000) + 'k';
                        return value;
                    }
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Desempenho Financeiro</h2>
                <div className="flex items-center gap-4 text-sm mt-2 sm:mt-0">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-400"></div><span>Lucro</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400"></div><span>Faturamento</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400"></div><span>Despesas</span></div>
                </div>
            </div>
            <div className="w-full h-80 relative">
                 {isLoading ? (
                    <Skeleton className="h-full w-full rounded-lg" />
                 ) : error ? (
                    <div className="flex items-center justify-center h-full text-center text-red-500">
                        <div>
                            <i className="fas fa-exclamation-circle text-4xl mb-3"></i>
                            <p className="font-semibold">Erro ao carregar gráfico.</p>
                        </div>
                    </div>
                 ) : (
                    <Chart ref={chartRef} type='line' data={chartData} options={options} />
                 )}
            </div>
        </div>
    );
};

export default FinancialChart;
