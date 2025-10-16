import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../api/apiClient'; // Assuming a public client is not needed for this

const formatCurrency = (value) => {
    if (typeof value !== 'number') return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const PortalOrcamentoPage = () => {
    const { token } = useParams();
    const [orcamento, setOrcamento] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOrcamento = async () => {
            if (!token) return;
            try {
                const { data } = await apiClient.get(`/portal-cliente/orcamento/${token}`);
                setOrcamento(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Erro ao buscar o orçamento.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrcamento();
    }, [token]);

    const handlePayment = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.post(`/portal-cliente/orcamento/${token}/pagar`, {});
            if (response.data.init_point) {
                window.location.href = response.data.init_point;
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao iniciar o pagamento.');
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="text-center p-10">Carregando orçamento...</div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-500">{error}</div>;
    }

    if (!orcamento) {
        return <div className="text-center p-10">Orçamento não encontrado.</div>;
    }

    return (
        <div className="bg-gray-50 min-h-screen p-4 sm:p-8">
            <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
                <header className="bg-blue-600 text-white p-6">
                    <h1 className="text-2xl font-bold">Detalhes do Orçamento</h1>
                    <p>De: {orcamento.prestador.nomeEmpresa}</p>
                </header>
                <main className="p-6 space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold border-b pb-2 mb-4">Serviços e Itens</h2>
                        <ul className="space-y-2">
                            {orcamento.itens.map(item => (
                                <li key={item._id} className="flex justify-between">
                                    <span>{item.descricao} (x{item.quantidade})</span>
                                    <span>{formatCurrency(item.valor)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                     <section className="text-right">
                        <p className="text-gray-600">Valor Total:</p>
                        <p className="text-3xl font-bold">{formatCurrency(orcamento.valorTotal)}</p>
                    </section>
                     <div className="text-center pt-6">
                        <button 
                            onClick={handlePayment}
                            className="bg-green-500 text-white font-bold py-3 px-12 rounded-lg hover:bg-green-600 transition"
                        >
                            Pagar Agora
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PortalOrcamentoPage;
