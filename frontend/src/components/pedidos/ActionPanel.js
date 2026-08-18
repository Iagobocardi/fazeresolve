import React, { useState } from 'react';
import { Calculator, Calendar as CalendarIcon, ThumbsUp, Archive } from 'lucide-react';
import Calendar from 'react-calendar';
import '../agenda/MiniCalendar.css';


const ActionPanel = ({ pedido, onAnalyze, onSchedule, onConfirm, onArchive, onAccept, onReschedule }) => {
    const status = pedido.status;
    const [date, setDate] = useState(new Date());
    const [selectedPeriod, setSelectedPeriod] = useState(null);

    const renderPanelContent = () => {
        switch (status) {
            case 'Pendente':
                return (
                    <div className="action-card card p-6 bg-yellow-50 border-yellow-200">
                        <h2 className="font-bold text-xl text-yellow-900 mb-2">Aguardando Orçamento</h2>
                        <p className="text-yellow-800 text-sm mb-4">O primeiro passo é analisar o pedido e enviar uma proposta para o cliente.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button onClick={onAnalyze} className="w-full bg-white border border-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-lg hover:bg-slate-100 transition-colors">
                                <Calculator className="inline-block mr-2" size={16} /> Orçamento
                            </button>
                            <button onClick={onAccept} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30">
                                <ThumbsUp className="inline-block mr-2" size={16} /> Aceitar Pedido
                            </button>
                        </div>
                    </div>
                );
            case 'Aceito':
                return (
                    <div className="action-card card p-6 bg-blue-50 border-blue-200">
                        <h2 className="font-bold text-xl text-blue-900 mb-4">Agendar Visita / Serviço</h2>
                        <p className="text-blue-800 text-sm mb-4">O orçamento foi aceito! Proponha uma data para realizar o serviço ou a visita técnica.</p>
                        
                        {pedido.sugestaoAgendamentoCliente && (
                            <div className="mb-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800 font-semibold">
                                    <span className="font-bold">Sugestão do Cliente:</span> {pedido.sugestaoAgendamentoCliente}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Calendar
                                  onChange={setDate}
                                  value={date}
                                  locale="pt-BR"
                                  prev2Label={null}
                                  next2Label={null}
                                />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-700 mb-2">Escolha um período</h3>
                                <div className="space-y-2">
                                    <button onClick={() => setSelectedPeriod('Manhã')} className={`w-full text-left p-3 rounded-lg border ${selectedPeriod === 'Manhã' ? 'bg-blue-100 border-blue-500' : 'bg-white hover:border-blue-400'}`}>Manhã (08:00 - 12:00)</button>
                                    <button onClick={() => setSelectedPeriod('Tarde')} className={`w-full text-left p-3 rounded-lg border ${selectedPeriod === 'Tarde' ? 'bg-blue-100 border-blue-500' : 'bg-white hover:border-blue-400'}`}>Tarde (13:00 - 18:00)</button>
                                </div>
                                 <button onClick={() => onSchedule(date, selectedPeriod)} disabled={!selectedPeriod} className="mt-4 w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
                                    <CalendarIcon className="inline-block mr-2" size={16} /> Propor Agendamento
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'Agendado':
                const scheduledDate = pedido.dataAgendamento ? new Date(pedido.dataAgendamento).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric'}) : 'Data não definida';
                const time = pedido.periodo ? `Período da ${pedido.periodo}` : 'Período não definido';
                return (
                    <div className="action-card card p-6 bg-green-50 border-green-200">
                        <h2 className="font-bold text-xl text-green-900 mb-2">Serviço Agendado!</h2>
                        <div className="flex items-center gap-4 text-center p-4 bg-white rounded-lg">
                            <CalendarIcon className="text-4xl text-green-500" />
                            <div>
                                <p className="font-bold text-lg text-slate-800">{scheduledDate}</p>
                                <p className="text-slate-600">{time}</p>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button onClick={onReschedule} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-md hover:bg-slate-100 transition-colors text-sm">Reagendar</button>
                            <button onClick={onConfirm} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm">Confirmar Execução</button>
                        </div>
                    </div>
                );
            case 'Finalizado':
                return (
                    <div className="action-card card p-6 bg-slate-100 border-slate-200">
                         <h2 className="font-bold text-xl text-slate-800 mb-2">Pedido Finalizado</h2>
                         <p className="text-slate-600 text-sm mb-4">Este serviço foi concluído com sucesso. Nenhuma ação adicional é necessária.</p>
                         <button onClick={onArchive} className="w-full bg-slate-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-colors">
                            <Archive className="inline-block mr-2" size={16} /> Arquivar Pedido
                        </button>
                    </div>
                );
            case 'Rejeitado':
                return (
                    <div className="action-card card p-6 bg-red-50 border-red-200">
                        <h2 className="font-bold text-xl text-red-900 mb-2">Pedido Rejeitado</h2>
                        <p className="text-red-800 text-sm mb-4">O pedido foi rejeitado e movido para o histórico. Nenhuma ação é necessária.</p>
                        <button onClick={onArchive} className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors">
                             <Archive className="inline-block mr-2" size={16} /> Arquivar Pedido
                        </button>
                    </div>
                );
            default:
                return (
                    <div className="card p-6 bg-slate-50 border-slate-200">
                        <p>Status do pedido inválido ou não reconhecido: {status}</p>
                    </div>
                );
        }
    };

    return (
        <section>
            {renderPanelContent()}
        </section>
    );
};

export default ActionPanel;
