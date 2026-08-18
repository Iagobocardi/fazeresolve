import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Import components
import DashboardHeader from './dashboard/DashboardHeader';
import MetricsGrid from './dashboard/MetricsGrid';
import FinancialChart from './dashboard/FinancialChart';
import PendingPayments from './dashboard/PendingPayments';
import QuickActions from './dashboard/QuickActions';
import RecentClientsList from './dashboard/RecentClientsList';
import TopServicesList from './dashboard/TopServicesList';
import PopularRegionsList from './dashboard/PopularRegionsList';
import FaturamentoPorCategoria from './dashboard/FaturamentoPorCategoria';

const fetchDashboardStats = async () => {
    const { data } = await apiClient.get('/dashboard');
    return data;
};

const DashboardPage = () => { 
    const { usuario, login } = useAuth();

    const { data: dashboardData, isLoading, error } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: fetchDashboardStats
    });

    useEffect(() => {
        // Inicia o polling apenas se a conta do usuário estiver aguardando pagamento.
        if (usuario?.conta?.status !== 'AGUARDANDO_PAGAMENTO') {
            return;
        }

        const pollInterval = setInterval(async () => {
            try {
                // O endpoint /api/auth/me busca os dados mais recentes do usuário.
                const { data: updatedUserData } = await apiClient.get('/auth/me');

                if (updatedUserData?.conta?.status === 'ATIVO') {
                    toast.success("Sua assinatura foi confirmada! Acesso liberado.");
                    
                    // Reutiliza o token existente para atualizar o estado global do usuário.
                    const token = localStorage.getItem('authToken');
                    login(updatedUserData, token);
                    
                    clearInterval(pollInterval); // Para o polling.
                }
            } catch (err) {
                console.error("Erro ao verificar status da assinatura:", err);
                // O polling não é interrompido em caso de erro para ser resiliente a falhas de rede.
            }
        }, 15000); // Verifica a cada 15 segundos.

        // Limpa o intervalo quando o componente é desmontado ou o status do usuário muda.
        return () => clearInterval(pollInterval);
    }, [usuario, login]);

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                    <strong className="font-bold">Ocorreu um erro no servidor!</strong>
                    <pre className="mt-2 text-xs">{error.message}</pre>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-screen-2xl mx-auto p-4 md:p-8">
            <DashboardHeader />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Esquerda (Principal) */}
                <div className="lg:col-span-2 space-y-8">
                    <MetricsGrid stats={dashboardData?.stats} isLoading={isLoading} />
                    <FinancialChart />
                    <PendingPayments stats={dashboardData?.stats} isLoading={isLoading} />
                </div>

                {/* Coluna Direita (Listas e Resumos) */}
                <div className="lg:col-span-1 space-y-8">
                    <QuickActions 
                        agendamentos={dashboardData?.proximosAgendamentos} 
                        atencao={dashboardData?.pedidosPendentes} 
                        isLoading={isLoading} 
                    />
                    <RecentClientsList clientes={dashboardData?.recentesClientes} isLoading={isLoading} />
                    <TopServicesList servicos={dashboardData?.topServicos} isLoading={isLoading} />
                    <FaturamentoPorCategoria />
                    <PopularRegionsList />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
