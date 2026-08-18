// src/App.js
import { initMercadoPago } from '@mercadopago/sdk-react';
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink as RouterNavLink, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query'; 
import VisibilidadePage from './pages/VisibilidadePage.js'; 
import FornecedoresPage from './pages/FornecedoresPage.js';
import Settings from './pages/Settings.js';
import ForgotPasswordPage from './pages/Public/ForgotPasswordPage.js';
import ResetPasswordPage from './pages/Public/ResetPasswordPage.js';
import PortalOrcamentoPage from './pages/Public/PortalOrcamentoPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.js';
// Páginas
import DashboardPage from './pages/DashboardPage.js';
import PedidosPage from './pages/PedidosPage.js';
import ClientesPage from './pages/ClientesPage.js';
import ClienteDetalhePage from './pages/ClienteDetalhePage.js';
import AgendaPage from './pages/AgendaPage.js';
import FinanceiroPage from './pages/FinanceiroPage.js';
import NotasFiscaisPage from './pages/NotasFiscaisPage.js';
import EstoquePage from './pages/EstoquePage.js';
import CatalogoPage from './pages/CatalogoPage.js';
import ModelosServicoPage from './pages/ModelosServicoPage.js';
import ClienteLoginPage from './pages/Cliente/ClienteLoginPage.js';
import ClienteDashboardPage from './pages/Cliente/ClienteDashboardPage.js';
import PedidoDetalheClientePage from './pages/Cliente/PedidoDetalheClientePage.js';
import MembrosPage from './pages/MembrosPage.js';
import AtivarContaPage from './pages/Public/AtivarContaPage.js';
import StatusPedidoPage from './pages/Public/StatusPedidoPage.js'; // Assumindo que você irá criar este
import TalentosPage from './pages/TalentosPage.js'; 
import { ThemeProvider } from './contexts/ThemeProvider';
import { AccountStatusProvider } from './contexts/AccountStatusContext.js'; // Added
import AccountStatusManager from './components/AccountStatusManager.js'; // Added
import { ThemeToggle } from './components/ThemeToggle';
import InboxPage from './pages/InboxPage';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute.js';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import PaginaDePlanos from './pages/PaginaDePlanos.js';
import Subscribe from './pages/Subscribe.jsx';
import PaymentPage from './pages/PaymentPage.js';
import PaymentMethodSelection from './pages/PaymentMethodSelection.jsx';
import PagamentoPix from './pages/PagamentoPix.jsx';
import PagamentoCartao from './pages/PagamentoCartao.jsx';
import EscolherPagamento from './pages/EscolherPagamento.jsx';
import RegularizePaymentPage from './pages/RegularizePaymentPage.js';
import BlockedPage from './pages/BlockedPage.js'; // Added
import WarningBanner from './components/WarningBanner';
import LockedBanner from './components/LockedBanner';
// Layouts
// Componentes
import ClienteProtectedRoute from './components/ClienteProtectedRoute.js';
import PedidoModal from './components/PedidoModal/PedidoModal.js';
import RelatoriosPage from './pages/RelatoriosPage.js';
import TemplatesWhatsappPage from './pages/TemplatesWhatsappPage.js';
import TemplateEditorPage from './pages/TemplateEditorPage.js';
import NovoPedidoPage from './pages/NovoPedidoPage.js'; // Importar a nova página
import PedidoDetalhePage from './pages/PedidoDetalhePage.js'; // Importar a página de detalhe
import BillingPage from './pages/BillingPage.js'; // Import the new BillingPage component
import {
    LayoutDashboard, List, Users, Settings as SettingsIcon, Menu, Calendar, Wallet,
    Archive, MapPin, ShoppingCart, Briefcase, FileText, Group, Clipboard
} from './components/ui/icons.js';
import { buttonVariants } from './components/ui/Button'; // Importe as variantes
import { cn } from './lib/utils'; // Importe a função cn

// Initialize Mercado Pago SDK
const MERCADO_PAGO_PUBLIC_KEY = process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY || 'TEST-4b36015c-3c28-4432-843e-7b6a5e1c279c'; // Using a placeholder
initMercadoPago(MERCADO_PAGO_PUBLIC_KEY);


const MessageSquare = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> );
 // 2. Defina todos os seus itens de menu com os planos permitidos
            const menuItems = [
                { to: "/", label: "Dashboard", icon: LayoutDashboard, planos: ['Essencial', 'Profissional', 'Premium'], permission: 'ver_dashboard' },
                { to: "/pedidos", label: "Pedidos", icon: List, planos: ['Essencial', 'Profissional', 'Premium'], permission: 'ver_pedidos' },
                { to: "/clientes", label: "Clientes", icon: Users, planos: ['Essencial', 'Profissional', 'Premium'], permission: 'ver_clientes' },
                { to: "/membros", label: "Membros", icon: Group, planos: ['Essencial', 'Profissional', 'Premium'], permission: 'ver_membros' },
                { to: "/agenda", label: "Agenda", icon: Calendar, planos: ['Essencial', 'Profissional', 'Premium'], permission: 'ver_agenda' },
                { to: "/financeiro", label: "Financeiro", icon: Wallet, planos: ['Essencial', 'Profissional', 'Premium'], permission: 'ver_financeiro' },
                { to: "/relatorios", label: "Relatórios", icon: FileText, planos: ['Essencial', 'Profissional', 'Premium'], permission: 'ver_relatorios' },
                { to: "/notas-fiscais", label: "Notas Fiscais", icon: FileText, planos: ['Essencial', 'Profissional', 'Premium'], permission: 'ver_notas_fiscais' },
                { to: "/fornecedores", label: "Fornecedores", icon: ShoppingCart, planos: ['Essencial', 'Profissional', 'Premium'], permission: 'ver_fornecedores' },
                { to: "/estoque", label: "Estoque", icon: Archive, planos: ['Profissional', 'Premium'], permission: 'ver_estoque' },
                { to: "/catalogo", label: "Catálogo Inteligente", icon: List, planos: ['Profissional', 'Premium'], permission: 'usar_catalogo_inteligente' },
                { to: "/modelos", label: "Modelos de Serviço", icon: Clipboard, planos: ['Profissional', 'Premium'], permission: 'gerenciar_modelos_servico' },
                { to: "/inbox", label: "Automação WhatsApp", icon: MessageSquare, planos: ['Premium'], permission: 'ver_inbox' },
                { to: "/talentos", label: "Talentos", icon: Briefcase, planos: ['Essencial', 'Profissional', 'Premium'], permission: 'ver_talentos' },
                { to: "/visibilidade", label: "Mercado", icon: MapPin, planos: ['Essencial', 'Profissional', 'Premium'], permission: 'ver_visibilidade' },
                { to: "/billing", label: "Billing", icon: Wallet, planos: ['Essencial', 'Profissional', 'Premium'] },
                { to: "/configuracoes", label: "Configurações", icon: SettingsIcon, planos: ['Essencial', 'Profissional', 'Premium'] } // Sem permissão específica, todos veem
];

const ProtectedDashboard = ({ children }) => {
    const { usuario } = useAuth();

    if (!usuario) {
        return <Navigate to="/login" />;
    }

    // Lógica de proteção final e correta, agora que o backend envia todos os dados.

    // 1. O utilizador tem de ter uma role de prestador para aceder a este dashboard.
    const providerRoles = ['PRESTADOR', 'Dono', 'Membro', 'ADMIN'];
    const userRole = usuario.role ? usuario.role.trim().toLowerCase() : '';
    const isProvider = providerRoles.some(r => r.toLowerCase() === userRole);

    if (!isProvider) {
        // Se não for um prestador, redireciona para o dashboard do cliente como um fallback seguro.
        return <Navigate to="/cliente/dashboard" />;
    }

    // The AccountStatusManager is now the single source of truth for redirects
    // based on subscription status. By removing the check here, we prevent
    // conflicting redirects and solve the loop.
    return children;
};

export default function App() {
    const [selectedPedido, setSelectedPedido] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
     const queryClient = useQueryClient();
     const { usuario } = useAuth(); 
     
    // --------------------------------
     const handleUpdateAndClose = () => {
        // Invalida todas as queries que dependem dos pedidos, forçando a atualização
        queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        queryClient.invalidateQueries({ queryKey: ['proximosAgendamentos'] });
        // Adicione aqui outras queries que precisam ser atualizadas
        
        // Fecha o modal
        setSelectedPedido(null);
    };
    
    const handlePedidoClick = (pedido) => { setSelectedPedido(pedido); };
    const handleCloseModal = () => { setSelectedPedido(null); };

    const NavLink = ({ to, label, icon: Icon }) => (
        <RouterNavLink to={to} className={({ isActive }) => cn(buttonVariants({ variant: isActive ? "default" : "ghost" }), "w-full justify-start space-x-3 px-4 py-2.5")}>
            <Icon className="h-5 w-5" />
            <span className={`font-medium ${!isSidebarOpen && 'hidden'}`}>{label}</span>
        </RouterNavLink>
    );

   // Componente de Layout do Painel Principal
    const MainLayout = () => {
        const { accountStatus, gracePeriodExpires } = useAuth();

        const hasPermission = (permission) => {
            if (!permission) return true; // Itens sem permissão são sempre visíveis
            if (!usuario || !usuario.permissoes) return false;
            // O Dono da conta sempre tem todas as permissões
            if (usuario.role === 'Dono') return true;
            return usuario.permissoes.includes(permission);
        };

        return (
            <div className="flex h-screen bg-secondary font-sans">
                <aside className={`bg-background text-foreground transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                    <div className="flex items-center justify-between p-4 border-b">
                        <h1 className={`text-xl font-bold text-primary ${!isSidebarOpen && 'hidden'}`}>Faz&Resolve</h1>
                        <ThemeToggle />
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg text-muted-foreground hover:bg-accent">
                            {isSidebarOpen ? <LayoutDashboard className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                    <nav className="mt-6 px-4 space-y-2">
                        {usuario && menuItems.map(item =>
                            item.planos.includes(usuario.plano) && hasPermission(item.permission) && (
                                <NavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
                            )
                        )}
                    </nav>
                </aside>
                <main className="flex-1 flex flex-col overflow-hidden bg-background">
                {accountStatus === 'PENDING' && <WarningBanner expiresAt={gracePeriodExpires} />}
                {accountStatus === 'LOCKED' && <LockedBanner />}
                <div className="flex-1 p-6 overflow-y-auto">
                    <Routes>
                        <Route index element={<DashboardPage onPedidoClick={handlePedidoClick} />} />
                        <Route path="pedidos" element={<PedidosPage />} />
                        <Route path="pedidos/novo" element={<NovoPedidoPage />} />
                        <Route path="pedidos/:id" element={<PedidoDetalhePage />} />
                        <Route path="clientes" element={<ClientesPage />} />
                        <Route path="clientes/:id" element={<ClienteDetalhePage />} />
                        <Route path="membros" element={<MembrosPage />} />
                        <Route path="agenda" element={<AgendaPage onPedidoClick={handlePedidoClick} />} />
                        <Route path="financeiro" element={<FinanceiroPage />} />
                        <Route path="relatorios" element={<RelatoriosPage />} />
                        <Route path="notas-fiscais" element={<NotasFiscaisPage />} />
                        <Route path="fornecedores" element={<FornecedoresPage />} />
                        <Route path="configuracoes" element={<Settings />} />
                        <Route path="billing" element={<BillingPage />} />
                        {/* Rota para os templates, protegida por plano e role */}
                        <Route element={<ProtectedRoute planosPermitidos={['Premium']} rolesPermitidos={['Dono', 'ADMIN']} />}>
                            <Route path="configuracoes/templates" element={<TemplatesWhatsappPage />} />
                            <Route path="configuracoes/templates/new" element={<TemplateEditorPage />} />
                            <Route path="configuracoes/templates/edit/:templateId" element={<TemplateEditorPage />} />
                        </Route>
                        <Route path="talentos" element={<TalentosPage />} /> {/* <-- REINSERIDA AQUI */}
                        <Route path="visibilidade" element={<VisibilidadePage onPedidoClick={handlePedidoClick} />} /> {/* <-- REINSERIDA AQUI */}
            
                         {/* --- PROTEGENDO A ROTA DE ESTOQUE --- */}
    <Route element={<ProtectedRoute planosPermitidos={['Profissional', 'Premium']} />}>
        <Route path="estoque" element={<EstoquePage />} />
        <Route path="catalogo" element={<CatalogoPage />} />
        <Route path="modelos" element={<ModelosServicoPage />} />
    </Route>

    {/* --- PROTEGENDO AS ROTAS PREMIUM --- */}
    <Route element={<ProtectedRoute planosPermitidos={['Premium']} />}>
        <Route path="inbox" element={<InboxPage />} />
    </Route>
    </Routes>
                </div>
            </main>
            <PedidoModal pedido={selectedPedido} onClose={handleCloseModal} onUpdate={handleUpdateAndClose} />
        </div>
        )
    };

       return (
            <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
                <BrowserRouter>
                    <AccountStatusProvider>
                        <Toaster position="top-right" toastOptions={{ success: { style: { background: '#22c55e', color: 'white' } }, error: { style: { background: '#ef4444', color: 'white' } } }} />
                        <AccountStatusManager />
                        <Routes>
                            {/* --- Public Routes --- */}
                            {/* These routes do not require authentication */}
                            <Route path="/status/:publicId" element={<StatusPedidoPage />} />
                            <Route path="/ativar-conta/:token" element={<AtivarContaPage />} />
                            <Route path="/portal/orcamento/:token" element={<PortalOrcamentoPage />} />
                            <Route path="/cliente/login/:token" element={<ClienteLoginPage />} />
                            <Route path="/login/google/callback" element={<GoogleCallbackPage />} />
                            <Route path="/planos" element={<PaginaDePlanos />} />
                            <Route path="/subscribe" element={<Subscribe />} />
                            <Route path="/payment-method-selection" element={<PaymentMethodSelection />} />
                            <Route path="/pagamento-pix" element={<PagamentoPix />} />
                            <Route path="/pagamento-cartao" element={<PagamentoCartao />} />
                            <Route path="/escolher-pagamento" element={<EscolherPagamento />} />
                            <Route path="/pagamento-assinatura" element={<PaymentPage />} />
                            <Route path="/acesso-bloqueado" element={<BlockedPage />} />

                            {/* The login page is only for unauthenticated users */}
                            <Route element={<PublicOnlyRoute />}>
                                <Route path="/login" element={<AdminLoginPage />} />
                                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                <Route path="/reset-password" element={<ResetPasswordPage />} />
                            </Route>

                            {/* --- Protected Routes --- */}
                            {/* All routes within this group require an authenticated user */}
                            <Route element={
                                <ProtectedDashboard>
                                    <Outlet />
                                </ProtectedDashboard>
                            }>
                                {/* The main dashboard layout and its nested routes */}
                                <Route path="/*" element={<MainLayout />} />

                                {/* Protected client-specific routes */}
                                <Route path="/cliente/dashboard" element={<ClienteProtectedRoute><ClienteDashboardPage /></ClienteProtectedRoute>} />
                                <Route path="/cliente/pedidos/:id" element={<ClienteProtectedRoute><PedidoDetalheClientePage /></ClienteProtectedRoute>} />

                                {/* The payment regularization page needs to be accessed by logged-in users */}
                                <Route path="/regularizar-pagamento" element={<RegularizePaymentPage />} />
                            </Route>
                        </Routes>
                </AccountStatusProvider>
                </BrowserRouter>
            </ThemeProvider>
    );
}
