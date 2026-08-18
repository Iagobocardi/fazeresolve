import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getInvoices } from '../api/invoicesApi';
import { getCompanyInfo } from '../api/providerApi.js';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertTriangle } from '../components/ui/icons';
import InvoiceModal from '../components/modals/InvoiceModal';

const StatusBadge = ({ status }) => {
    const statusClasses = {
        Autorizada: 'bg-green-100 text-green-800',
        Rascunho: 'bg-gray-100 text-gray-800',
        Cancelada: 'bg-red-100 text-red-800',
        Processando: 'bg-blue-100 text-blue-800',
    };

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
};

const NotasFiscaisPage = () => {
    const { usuario } = useAuth();
    const queryClient = useQueryClient();
    const { data: invoices, isLoading, error } = useQuery({
        queryKey: ['invoices'],
        queryFn: getInvoices,
        // Using mock data as a placeholder until the API is live
        initialData: [
            { id: 1, cliente: { nome: 'Empresa A' }, dataEmissao: '2023-10-26', valor: 1500.00, status: 'Autorizada', pdfUrl: '#' },
            { id: 2, cliente: { nome: 'Empresa B' }, dataEmissao: '2023-10-25', valor: 800.50, status: 'Rascunho' },
            { id: 3, cliente: { nome: 'Empresa C' }, dataEmissao: '2023-10-24', valor: 200.00, status: 'Cancelada' },
            { id: 4, cliente: { nome: 'Empresa D' }, dataEmissao: '2023-10-23', valor: 3500.00, status: 'Processando' },
        ]
    });

    const { data: companyInfo } = useQuery({
        queryKey: ['companyInfo'],
        queryFn: getCompanyInfo,
    });

    const fiscalDataMissing = !companyInfo?.companyInfo?.cnpj || !companyInfo?.focusNFeApiToken;

    useEffect(() => {
        const processingInvoices = invoices?.filter(inv => inv.status === 'Processando');

        if (processingInvoices && processingInvoices.length > 0) {
            const interval = setInterval(() => {
                console.log('Polling for invoice status...');
                queryClient.invalidateQueries({ queryKey: ['invoices'] });
            }, 10000); // Poll every 10 seconds

            return () => clearInterval(interval);
        }
    }, [invoices, queryClient]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const handleOpenModal = (invoice = null) => {
        setSelectedInvoice(invoice);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedInvoice(null);
        setIsModalOpen(false);
    };

    const hasPermission = (permission) => {
        if (!usuario || !usuario.permissoes) return false;
        if (usuario.role === 'Dono') return true;
        return usuario.permissoes.includes(permission);
    };

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Notas Fiscais
                    </h1>
                    {hasPermission('criar_nota_fiscal') && (
                        <Button onClick={() => handleOpenModal()} disabled={fiscalDataMissing}>
                            Criar Nova Nota Fiscal
                        </Button>
                    )}
                </div>

                {fiscalDataMissing && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    Para emitir notas fiscais, você precisa primeiro preencher seus dados fiscais.
                                    <Link to="/configuracoes" className="font-medium underline text-yellow-700 hover:text-yellow-600 ml-2">
                                        Ir para Configurações
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <Card>
                <CardHeader>
                    <CardTitle>Minhas Notas Fiscais</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && <p className="text-center text-muted-foreground">Carregando notas fiscais...</p>}
                    {error && <p className="text-center text-red-500">Erro ao carregar notas: {error.message}</p>}

                    {invoices && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Emissão</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.cliente.nome}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(invoice.dataEmissao).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {invoice.valor.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <StatusBadge status={invoice.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {invoice.status === 'Autorizada' && invoice.pdfUrl && hasPermission('ver_nota_fiscal') && (
                                                    <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="outline" size="sm">Ver PDF</Button>
                                                    </a>
                                                )}
                                                {invoice.status !== 'Autorizada' && hasPermission('editar_nota_fiscal') && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(invoice)}>
                                                        {invoice.status === 'Rascunho' ? 'Editar' : 'Ver'}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                     {!isLoading && !error && invoices && invoices.length === 0 && (
                        <p className="text-center text-muted-foreground py-10">Nenhuma nota fiscal encontrada.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        <InvoiceModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            invoice={selectedInvoice}
        />
    </>
    );
};

export default NotasFiscaisPage;
