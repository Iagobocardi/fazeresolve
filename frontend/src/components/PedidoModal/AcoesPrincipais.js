import React from 'react';
import { Button } from '../ui/Button.jsx';
import ScheduleForm from './ScheduleForm.js';

const AcoesPrincipais = ({
    pedido,
    podeAgendar,
    isScheduling,
    setIsScheduling,
    handleSchedule,
    isSubmitting,
    isSugestaoValida,
    formatSuggestedDate,
    handleUpdateStatus,
    isMutating,
}) => {
    return (
        <div className="bg-slate-50 p-6 rounded-lg border">
            <h2 className="font-bold text-lg text-gray-700 mb-4">Ações Principais</h2>
            <div className="space-y-3">
                {podeAgendar && (
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Agendamento</h4>
                        {pedido.sugestaoAgendamentoCliente && !isScheduling ? (
                            <div>
                                <p className="p-3 bg-blue-100 text-blue-800 rounded-lg text-xs">
                                    Sugestão do cliente: <span className="font-bold">{formatSuggestedDate(pedido.sugestaoAgendamentoCliente)}</span>
                                </p>
                                <div className="flex space-x-2 mt-2">
                                    <Button onClick={() => handleSchedule(pedido.sugestaoAgendamentoCliente)} disabled={isSubmitting || !isSugestaoValida} size="sm" className="flex-1 bg-green-500 hover:bg-green-600">
                                        Confirmar
                                    </Button>
                                    <Button onClick={() => setIsScheduling(true)} disabled={isSubmitting} size="sm" variant="outline" className="flex-1">
                                        Outra Data
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <ScheduleForm onSchedule={handleSchedule} onCancel={() => setIsScheduling(false)} isSubmitting={isSubmitting} />
                        )}
                    </div>
                )}
                <Button onClick={() => handleUpdateStatus('Finalizado')} disabled={isMutating || !podeAgendar} className="w-full">
                    Marcar como Finalizado
                </Button>
                <Button onClick={() => handleUpdateStatus('Rejeitado')} disabled={isMutating} variant="destructive" className="w-full">
                    Rejeitar Pedido
                </Button>
            </div>
        </div>
    );
};

export default AcoesPrincipais;
