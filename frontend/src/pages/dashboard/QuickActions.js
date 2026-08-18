import React from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '../../components/ui/Skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const QuickActions = ({ agendamentos, atencao, isLoading }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Ações Rápidas</h2>
            <div className="space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-500 mb-2 tracking-wider">PRÓXIMOS AGENDAMENTOS</h3>
                    <div className="space-y-3">
                        {isLoading ? (
                            [...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                        ) : agendamentos && agendamentos.length > 0 ? (
                            agendamentos.map(ag => (
                                <Link to={`/pedidos/${ag.pedidoId}`} key={ag._id} className="block p-3 bg-slate-50 hover:bg-slate-100 rounded-lg">
                                    <p className="font-semibold text-slate-700">{ag.titulo}</p>
                                    <p className="text-sm text-slate-500">
                                        {format(new Date(ag.data), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center text-slate-500 py-4">
                                <p className="text-sm">Nenhum agendamento próximo.</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-bold text-slate-500 mb-2 tracking-wider">A PRECISAR DE ATENÇÃO</h3>
                    {isLoading ? (
                        [...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                    ) : atencao && atencao.length > 0 ? (
                        atencao.map(pedido => (
                             <Link to={`/pedidos/${pedido._id}`} key={pedido._id} className="block p-3 bg-amber-50 hover:bg-amber-100 rounded-lg">
                                <p className="font-semibold text-amber-800">{pedido.titulo}</p>
                                <p className="text-sm text-amber-600">
                                    Pendente desde {format(new Date(pedido.criadoEm), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                            </Link>
                        ))
                    ) : (
                         <div className="text-center text-slate-500 py-4">
                            <p className="text-sm">Nenhum pedido precisa de atenção.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuickActions;
