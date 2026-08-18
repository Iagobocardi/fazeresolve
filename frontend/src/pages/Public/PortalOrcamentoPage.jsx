// src/pages/Public/PortalOrcamentoPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPedidoState, sugerirVisita, aprovarOrcamento, recusarOrcamento, informarPagamento } from '../../api/portalApi';
import { toast } from 'react-hot-toast';

const ActionBlock = ({ pedido, setPedido }) => {
    const [dateSuggestion, setDateSuggestion] = useState('');

    const handleSugerirVisita = async () => {
        if (!dateSuggestion) {
            toast.error('Por favor, sugira uma data.');
            return;
        }
        try {
            const response = await sugerirVisita(pedido.id, dateSuggestion);
            setPedido(response.data);
            toast.success('Sugestão de visita enviada!');
        } catch (error) {
            toast.error('Erro ao enviar sugestão.');
        }
    };

    const handleAprovarOrcamento = async () => {
        try {
            const response = await aprovarOrcamento(pedido.id);
            setPedido(response.data);
            toast.success('Orçamento aprovado!');
        } catch (error) {
            toast.error('Erro ao aprovar orçamento.');
        }
    };

    const handleRecusarOrcamento = async () => {
        try {
            const response = await recusarOrcamento(pedido.id);
            setPedido(response.data);
            toast.success('Orçamento recusado.');
        } catch (error) {
            toast.error('Erro ao recusar orçamento.');
        }
    };

    const handleInformarPagamento = async () => {
        try {
            const response = await informarPagamento(pedido.id, 'sinal', 'pix');
            setPedido(response.data);
            toast.success('Informação de pagamento enviada.');
        } catch (error) {
            toast.error('Erro ao informar pagamento.');
        }
    };

    switch (pedido.status) {
        case 'AGUARDANDO_CLIENTE':
            return (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-4">
                        <i className="fas fa-calendar-alt text-blue-600 text-3xl"></i>
                        <div>
                            <h3 className="text-lg font-bold text-blue-800">Próximo Passo: Agendar a Visita Técnica</h3>
                            <p className="text-blue-700">Olá, {pedido.cliente.nome}! Para criar um orçamento preciso, o prestador precisa fazer uma visita técnica. Por favor, sugira uma data.</p>
                        </div>
                    </div>
                    <div className="border-t border-blue-200 my-4"></div>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <input type="text" value={dateSuggestion} onChange={(e) => setDateSuggestion(e.target.value)} placeholder="Ex: Amanhã à tarde ou 25/10 às 14h" className="w-full sm:flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={handleSugerirVisita} className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold px-8 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30 transform hover:scale-105">
                            <i className="fas fa-paper-plane mr-2"></i>
                            Sugerir Data
                        </button>
                    </div>
                </div>
            );
        case 'VISITA_SUGERIDA':
            return (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-4">
                        <i className="fas fa-hourglass-half text-yellow-600 text-3xl"></i>
                        <div>
                            <h3 className="text-lg font-bold text-yellow-800">Sugestão de Visita Enviada</h3>
                            <p className="text-yellow-700">Aguardando confirmação do prestador para: <span className="font-bold">{pedido.visita.data_sugerida}</span>.</p>
                        </div>
                    </div>
                </div>
            );
        case 'ORCAMENTO_ENVIADO':
            return (
                <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-4">
                        <i className="fas fa-check-circle text-green-600 text-3xl"></i>
                        <div>
                            <h3 className="text-lg font-bold text-green-800">Orçamento Recebido!</h3>
                            <p className="text-green-700">O prestador analisou a visita e enviou seu orçamento. Por favor, analise e aprove.</p>
                        </div>
                    </div>
                    <div className="border-t border-green-200 my-4"></div>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                            <span className="text-sm font-semibold text-slate-600">Valor Total do Serviço:</span>
                            <p className="text-3xl font-bold text-slate-800">R$ {pedido.orcamento.total.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleRecusarOrcamento} className="bg-red-500 text-white font-bold px-6 py-3 rounded-lg hover:bg-red-600 transition-all">
                                Recusar
                            </button>
                            <button onClick={handleAprovarOrcamento} className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold px-8 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/30 transform hover:scale-105">
                                <i className="fas fa-check mr-2"></i>
                                Aprovar Orçamento
                            </button>
                        </div>
                    </div>
                </div>
            );
        case 'ORCAMENTO_APROVADO':
            return (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-4">
                        <i className="fas fa-file-invoice-dollar text-blue-600 text-3xl"></i>
                        <div>
                            <h3 className="text-lg font-bold text-blue-800">Próximo Passo: Pagamento do Sinal ({pedido.orcamento.sinal_percent}%)</h3>
                            <p className="text-blue-700">Orçamento aprovado! Para garantir o agendamento, é necessário o pagamento do sinal.</p>
                        </div>
                    </div>
                    <div className="border-t border-blue-200 my-4"></div>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                            <span className="text-sm font-semibold text-slate-600">Valor do Sinal ({pedido.orcamento.sinal_percent}%):</span>
                            <p className="text-3xl font-bold text-slate-800">R$ {pedido.orcamento.sinal_valor.toFixed(2)}</p>
                        </div>
                        {pedido.pagamento.prestador_tem_mercadopago && (
                            <button className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold px-8 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/30 transform hover:scale-105">
                                <i className="fas fa-lock mr-2"></i>
                                Pagar com Cartão ou PIX
                            </button>
                        )}
                    </div>
                    {pedido.pagamento.chave_pix && (
                        <div className="mt-6 bg-slate-50 border border-slate-300 p-6 rounded-lg">
                            <h4 className="text-md font-semibold text-slate-800">Outras Formas de Pagamento</h4>
                            <p className="text-sm text-slate-600 mt-2">Você também pode pagar manualmente via PIX. Se optar por isso, avise o prestador e envie o comprovante.</p>
                            <div className="mt-4">
                                <p className="text-sm font-semibold text-slate-700">Chave PIX (CNPJ):</p>
                                <p className="text-lg font-bold text-slate-800 bg-slate-200 p-2 rounded-md flex justify-between items-center">
                                    <span>{pedido.pagamento.chave_pix}</span>
                                    <button onClick={() => navigator.clipboard.writeText(pedido.pagamento.chave_pix)} className="text-sm text-blue-600 hover:underline" title="Copiar Chave PIX"><i className="fas fa-copy"></i> Copiar</button>
                                </p>
                            </div>
                            <button onClick={handleInformarPagamento} className="mt-4 w-full bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-300 transition-colors">
                                <i className="fab fa-whatsapp mr-2"></i>
                                Já paguei / Enviar Comprovante
                            </button>
                        </div>
                    )}
                </div>
            );
        case 'SINAL_EM_ANALISE':
            return (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-4">
                        <i className="fas fa-hourglass-half text-yellow-600 text-3xl"></i>
                        <div>
                            <h3 className="text-lg font-bold text-yellow-800">Pagamento em Análise</h3>
                            <p className="text-yellow-700">Recebemos sua informação de pagamento. O prestador irá confirmar o recebimento manualmente para prosseguirmos.</p>
                        </div>
                    </div>
                </div>
            );
        case 'SINAL_PAGO':
            return (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-4">
                        <i className="fas fa-wrench text-blue-600 text-3xl"></i>
                        <div>
                            <h3 className="text-lg font-bold text-blue-800">Serviço em Andamento</h3>
                            <p className="text-blue-700">Pagamento confirmado! O serviço será executado na data agendada. Aguardando a conclusão pelo prestador.</p>
                        </div>
                    </div>
                </div>
            );
        case 'SERVICO_CONCLUIDO':
            return (
                <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-4">
                        <i className="fas fa-check-circle text-green-600 text-3xl"></i>
                        <div>
                            <h3 className="text-lg font-bold text-green-800">Serviço Concluído!</h3>
                            <p className="text-green-700">O prestador marcou o serviço como concluído. Efetue o pagamento final para fechar o pedido.</p>
                        </div>
                    </div>
                    <div className="border-t border-green-200 my-4"></div>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                            <span className="text-sm font-semibold text-slate-600">Valor Restante ({100 - pedido.orcamento.sinal_percent}%):</span>
                            <p className="text-3xl font-bold text-slate-800">R$ {(pedido.orcamento.total - pedido.orcamento.sinal_valor).toFixed(2)}</p>
                        </div>
                        <button className="bg-gradient-to-br from-green-500 to-green-600 text-white font-bold px-8 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/30 transform hover:scale-105">
                            <i className="fas fa-lock mr-2"></i>
                            Pagar Valor Restante
                        </button>
                    </div>
                </div>
            );
        case 'RECUSADO':
            return (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-4">
                        <i className="fas fa-times-circle text-red-600 text-3xl"></i>
                        <div>
                            <h3 className="text-lg font-bold text-red-800">Orçamento Recusado</h3>
                            <p className="text-red-700">Obrigado pelo seu tempo. O prestador foi notificado. Se desejar, entre em contato para renegociar.</p>
                        </div>
                    </div>
                </div>
            );
        default:
            return <div>Status do pedido: {pedido.status}</div>;
    }
};

const PortalOrcamentoPage = () => {
    const { token } = useParams();
    const [pedido, setPedido] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [flowType, setFlowType] = useState('visit-first'); // Default to visit-first

    useEffect(() => {
        const fetchPedido = async () => {
            try {
                setLoading(true);
                const response = await getPedidoState(token);
                setPedido(response.data);

                // Determine the flow type based on the initial status
                if (response.data.status === 'ORCAMENTO_ENVIADO') {
                    setFlowType('budget-first');
                }
            } catch (err) {
                setError('Não foi possível carregar os dados do pedido. Por favor, verifique o link e tente novamente.');
                toast.error('Erro ao carregar o pedido.');
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchPedido();
        }
    }, [token]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl font-semibold text-slate-700">A carregar...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl font-semibold text-red-600 bg-red-50 p-6 rounded-lg shadow-md">{error}</div>
            </div>
        );
    }

    if (!pedido) {
        return null; // Should not happen if loading and error are handled
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
            {/* Logo */}
            <button type="button" className="flex items-center gap-2 mb-4">
                <img src="https://i.imgur.com/YXPtR81.png" alt="Logo Faz & Resolve" className="h-8 w-auto" />
                <span className="font-bold text-xl text-slate-700">
                    <span className="text-blue-600">Faz</span> & Resolve
                </span>
            </button>

            {/* Main Card */}
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden">
                {/* Provider Header */}
                <header className="p-6 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <img src={pedido.prestador.logo_url} alt={`Logo de ${pedido.prestador.nome}`} className="w-12 h-12 rounded-full object-cover" />
                        <div>
                            <p className="text-sm text-slate-500">Serviço prestado por:</p>
                            <h2 className="text-lg font-bold text-slate-800">{pedido.prestador.nome}</h2>
                        </div>
                    </div>
                </header>

                <div className="p-6 md:p-8">
                    {/* Service Title */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-800">Solicitação de Orçamento #{pedido.id}</h1>
                        <p className="text-lg text-slate-600 mt-1">{pedido.servico.titulo}</p>
                        {pedido.visita.data_confirmada && (
                            <p className="text-sm text-slate-500 mt-2 font-semibold">
                                <i className="fas fa-calendar-check text-green-600 mr-2"></i>
                                Visita Técnica agendada para: {pedido.visita.data_confirmada}
                            </p>
                        )}
                    </div>

                    {/* Timeline */}
                    <Timeline status={pedido.status} flowType={flowType} />

                    {/* Action Block */}
                    <ActionBlock pedido={pedido} setPedido={setPedido} />

                    {/* Info Tabs */}
                    <InfoTabs pedido={pedido} />
                </div>
            </div>

            <p className="text-sm text-slate-400 mt-6">
                <i className="fas fa-shield-alt"></i> Pedido processado com segurança por <span className="font-bold text-slate-500">Faz & Resolve</span>
            </p>
        </div>
    );
};

const TimelineStep = ({ icon, label, status }) => {
    const getStatusClasses = () => {
        switch (status) {
            case 'done':
                return 'step-done';
            case 'active':
                return 'step-active';
            default:
                return 'step-pending';
        }
    };

    return (
        <div className={`step ${getStatusClasses()}`}>
            <div className="step-icon"><i className={`fas fa-${icon}`}></i></div>
            <span className="mt-2 step-label">{label}</span>
        </div>
    );
};

const Timeline = ({ status, flowType }) => {
    const getStepStatus = (stepOrder) => {
        const statusOrderVisitFirst = {
            'VISITA_SUGERIDA': 1,
            'ORCAMENTO_ENVIADO': 2,
            'ORCAMENTO_APROVADO': 3,
            'SINAL_PAGO': 4,
            'SERVICO_CONCLUIDO': 5,
        };
        
        const statusOrderBudgetFirst = {
            'ORCAMENTO_ENVIADO': 1,
            'ORCAMENTO_APROVADO': 2,
            'VISITA_SUGERIDA': 3,
            'SINAL_PAGO': 4,
            'SERVICO_CONCLUIDO': 5,
        };

        const statusOrder = flowType === 'budget-first' ? statusOrderBudgetFirst : statusOrderVisitFirst;
        
        const currentStep = statusOrder[status] || 0;
        if (stepOrder < currentStep) return 'done';
        if (stepOrder === currentStep) return 'active';
        return 'pending';
    };

    const visitFirstSteps = (
        <>
            <TimelineStep icon="hard-hat" label={<>Visita<br />Técnica</>} status={getStepStatus(1)} />
            <TimelineStep icon="file-alt" label="Orçamento" status={getStepStatus(2)} />
            <TimelineStep icon="credit-card" label={<>Pagamento<br />(Sinal 50%)</>} status={getStepStatus(3)} />
            <TimelineStep icon="wrench" label="Serviço" status={getStepStatus(4)} />
            <TimelineStep icon="flag-checkered" label="Concluído" status={getStepStatus(5)} />
        </>
    );

    const budgetFirstSteps = (
        <>
            <TimelineStep icon="file-alt" label="Orçamento" status={getStepStatus(1)} />
            <TimelineStep icon="hard-hat" label={<>Visita<br />Técnica</>} status={getStepStatus(2)} />
            <TimelineStep icon="credit-card" label={<>Pagamento<br />(Sinal 50%)</>} status={getStepStatus(3)} />
            <TimelineStep icon="wrench" label="Serviço" status={getStepStatus(4)} />
            <TimelineStep icon="flag-checkered" label="Concluído" status={getStepStatus(5)} />
        </>
    );

    return (
        <div className="flex items-start justify-between text-center mb-8 text-xs">
            {flowType === 'budget-first' ? budgetFirstSteps : visitFirstSteps}
        </div>
    );
};

const InfoTabs = ({ pedido }) => {
    const [activeTab, setActiveTab] = useState('detalhes');

    return (
        <div className="mt-8">
            <div className="flex border-b border-slate-300">
                <button onClick={() => setActiveTab('detalhes')} className={`tab-button ${activeTab === 'detalhes' ? 'active' : ''} font-semibold px-6 py-3 border-b-2`}>
                    <i className="fas fa-list-alt mr-2"></i>Detalhes do Orçamento
                </button>
                <button onClick={() => setActiveTab('pagamento')} className={`tab-button ${activeTab === 'pagamento' ? 'active' : ''} font-semibold px-6 py-3 border-b-2 border-transparent`}>
                    <i className="fas fa-file-invoice-dollar mr-2"></i>Condições
                </button>
                <button onClick={() => setActiveTab('historico')} className={`tab-button ${activeTab === 'historico' ? 'active' : ''} font-semibold px-6 py-3 border-b-2 border-transparent`}>
                    <i className="fas fa-history mr-2"></i>Histórico
                </button>
            </div>

            <div className="py-6">
                {activeTab === 'detalhes' && (
                    <div className="text-slate-700 space-y-3">
                        {pedido.orcamento ? (
                            <>
                                {pedido.orcamento.itens.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center pb-2 border-b border-slate-200">
                                        <span className="text-slate-500">{item.descricao}:</span>
                                        <span className="font-semibold">R$ {item.valor.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="font-bold text-slate-800 text-lg">Total do Orçamento:</span>
                                    <span className="font-bold text-slate-800 text-lg">R$ {pedido.orcamento.total.toFixed(2)}</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-slate-500 text-center p-4">
                                <i className="fas fa-file-invoice text-4xl text-slate-300 mb-3"></i>
                                <p className="font-semibold text-slate-600">O orçamento será detalhado aqui.</p>
                                <p className="text-sm">Ele será preenchido pelo prestador após a visita técnica.</p>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'pagamento' && (
                    <div className="text-slate-700">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="mb-3"><span className="font-bold">1. Visita Técnica:</span><br /> Agende uma data para o prestador avaliar o serviço.</p>
                            <hr className="my-3" />
                            <p className="my-3"><span className="font-bold">2. Orçamento:</span><br /> Você receberá o valor total do serviço <span className="text-blue-600 font-semibold">após a visita</span>.</p>
                            <hr className="my-3" />
                            <p className="mt-3"><span className="font-bold">3. Pagamento:</span><br /> Nossas condições padrão são 50% de sinal (após aprovação do orçamento) e 50% na conclusão.</p>
                        </div>
                    </div>
                )}
                {activeTab === 'historico' && (
                    <div className="text-slate-700">
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            {pedido.historico.map((item, index) => (
                                <li key={index}>
                                    <span className={`font-semibold ${item.tipo === 'success' ? 'text-green-600' : 'text-red-600'}`}>{item.mensagem}</span> - {new Date(item.timestamp).toLocaleString('pt-BR')}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};


export default PortalOrcamentoPage;
