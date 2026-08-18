import React from 'react';
import ControleMateriais from './ControleMateriais.js';
import ScheduleForm from './ScheduleForm.js';
// The Checklist component is rendered in its own tab by the parent, so it's removed from here.

const AbaOperacional = (props) => {
    // This component receives all its logic and data as props from PedidoModal.js
    // The goal here is to render the new design while respecting the existing logic.

    const renderAgendamento = () => {
        if (!props.podeAgendar) {
            return <p className="text-sm text-gray-500 italic text-center">O agendamento será liberado após a aprovação do orçamento.</p>;
        }

        if (props.isScheduling) {
            return (
                <div>
                    <p className="text-sm text-gray-600 mb-4 text-center">Selecione a nova data e hora.</p>
                    <ScheduleForm onSchedule={props.handleSchedule} onCancel={() => props.setIsScheduling(false)} isSubmitting={props.isSubmitting} />
                </div>
            );
        }

        if (props.pedido.dataAgendamento) {
            return (
                <div className="text-center">
                    <i className="fas fa-calendar-check text-4xl text-green-500"></i>
                    <p className="font-semibold text-lg text-gray-800 mt-3">Serviço Agendado</p>
                    <p className="text-gray-600">{new Date(props.pedido.dataAgendamento).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-sm text-gray-500">{new Date(props.pedido.dataAgendamento).toLocaleTimeString('pt-BR', { timeStyle: 'short' })}</p>
                    {/* Applying flex-wrap to prevent button visibility issues on smaller containers */}
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button onClick={() => props.setIsScheduling(true)} className="flex-grow bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm">Reagendar</button>
                        <button className="flex-grow bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm">Ver Agenda</button>
                    </div>
                </div>
            );
        }
        
        if (props.pedido.sugestaoAgendamentoCliente) {
            return (
                 <div className="text-center">
                    <i className="fas fa-calendar-alt text-4xl text-blue-500"></i>
                    <p className="font-semibold text-lg text-gray-800 mt-3">Sugestão do Cliente</p>
                    <p className="text-gray-600 font-medium p-2 bg-blue-100 text-blue-800 rounded-lg my-2">{props.formatSuggestedDate(props.pedido.sugestaoAgendamentoCliente)}</p>
                    {/* Applying flex-wrap to prevent button visibility issues on smaller containers */}
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button onClick={() => props.handleSchedule(props.pedido.sugestaoAgendamentoCliente)} className="flex-grow bg-green-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-400" disabled={props.isSubmitting || !props.isSugestaoValida}>Confirmar</button>
                        <button onClick={() => props.setIsScheduling(true)} className="flex-grow bg-yellow-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-yellow-600">Propor Outra</button>
                    </div>
                </div>
            );
        }

        return (
            <div className="text-center">
                <i className="fas fa-calendar-plus text-4xl text-gray-400"></i>
                <p className="font-semibold text-lg text-gray-800 mt-3">Nenhum agendamento</p>
                <p className="text-gray-600 text-sm mb-4">O cliente não sugeriu uma data.</p>
                <button onClick={() => props.setIsScheduling(true)} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700">Agendar Serviço</button>
            </div>
        );
    };


    return (
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
            
            {/* Coluna Esquerda: Apenas Materiais */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* O Checklist foi removido daqui para respeitar a estrutura de abas do PedidoModal */}

                {/* Controle de Materiais */}
                <div>
                    <h2 className="font-bold text-xl text-gray-800 mb-4">Controle de Materiais</h2>
                    <div className="bg-slate-50 p-6 rounded-lg border">
                        <ControleMateriais
                            pedido={props.pedido}
                            getNumericValue={props.getNumericValue}
                            handleRemoveMaterial={props.handleRemoveMaterial}
                            produtosDisponiveis={props.produtosDisponiveis}
                            produtoSelecionadoId={props.produtoSelecionadoId}
                            setProdutoSelecionadoId={props.setProdutoSelecionadoId}
                            quantidadeUsada={props.quantidadeUsada}
                            setQuantidadeUsada={props.setQuantidadeUsada}
                            handleAdicionarMaterial={props.handleAdicionarMaterial}
                            isAddingMaterial={props.isAddingMaterial}
                        />
                    </div>
                </div>
            </div>

            {/* Coluna Direita: Agendamento */}
            <div className="space-y-8">
                <div>
                    <h2 className="font-bold text-xl text-gray-800 mb-4">Agendamento</h2>
                    <div className="bg-slate-50 p-6 rounded-lg border">
                        {renderAgendamento()}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default AbaOperacional;
