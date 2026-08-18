import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Chart from 'react-apexcharts';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Download } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useTheme } from '../contexts/ThemeProvider';
import { formatCurrency } from '../lib/utils.js';

// Função para lidar com o download dos relatórios
const handleDownload = (reportUrl) => {
    const backendUrl = 'http://localhost:3000'; // URL base do seu backend
    window.open(`${backendUrl}${reportUrl}`, '_blank');
};

// Helper function to get CSS variables for chart theming
const getCssVar = (varName) => {
    if (typeof window !== 'undefined') {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }
    return '';
};

// Data fetching function
const fetchTicketMedio = async () => {
    const { data } = await apiClient.get('/relatorios/ticket-medio');
    return data;
};

const TicketMedioChart = () => {
    const { theme } = useTheme();
    const { data, isLoading, error } = useQuery({ 
        queryKey: ['ticketMedio'], 
        queryFn: fetchTicketMedio 
    });

    const options = useMemo(() => {
        const primaryColor = `hsl(${getCssVar('--primary')})`;
        const mutedColor = `hsl(${getCssVar('--muted-foreground')})`;

        return {
            chart: {
                type: 'line',
                height: 350,
                toolbar: { show: true, tools: { download: true } },
                fontFamily: 'Inter, sans-serif',
                foreColor: mutedColor,
            },
            stroke: { curve: 'smooth', width: 3 },
            colors: [primaryColor],
            dataLabels: { enabled: false },
            grid: {
                borderColor: `hsl(${getCssVar('--border')})`,
                strokeDashArray: 4,
            },
            xaxis: {
                categories: data?.map(item => item.mes) || [],
                title: { text: 'Mês' },
                labels: { style: { fontWeight: 500 } },
            },
            yaxis: {
                title: { text: 'Ticket Médio (R$)' },
                labels: { formatter: (value) => formatCurrency(value) },
            },
            tooltip: {
                theme: theme,
                y: { formatter: (value) => formatCurrency(value) },
            },
        };
    }, [theme, data]);

    const series = [
        {
            name: 'Ticket Médio',
            data: data?.map(item => item.ticketMedio) || []
        }
    ];

    if (isLoading) return <Card className="flex items-center justify-center h-[450px]"><p>A carregar relatório...</p></Card>;
    if (error) return <Card className="flex items-center justify-center h-[450px]"><p className="text-destructive">Erro ao carregar o relatório: {error.message}</p></Card>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ticket Médio por Mês</CardTitle>
            </CardHeader>
            <CardContent>
                {data && data.length > 0 ? (
                    <Chart options={options} series={series} type="line" height={350} />
                ) : (
                    <div className="flex justify-center items-center h-[350px]">
                        <p className="text-muted-foreground">Não há dados para exibir.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const RelatoriosPage = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground dark:bg-gradient-to-r dark:from-blue-400 dark:to-blue-600 dark:text-transparent dark:bg-clip-text">
                Relatórios
            </h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Downloads de Relatórios</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <Button 
                        variant="outline" 
                        onClick={() => handleDownload('/api/relatorios/receita-vs-despesa/pdf')}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Receitas vs. Despesas
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => handleDownload('/api/relatorios/satisfacao-cliente/pdf')}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Satisfação do Cliente
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-1">
                <TicketMedioChart />
                {/* Outros relatórios podem ser adicionados aqui no futuro */}
            </div>
        </div>
    );
};

export default RelatoriosPage;
