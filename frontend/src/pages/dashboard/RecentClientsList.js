import React from 'react';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RecentClientsList = ({ clientes, isLoading }) => {
    const getInitials = (name) => {
        if (!name) return '?';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    const avatarColors = ['bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-orange-100 text-orange-600', 'bg-pink-100 text-pink-600', 'bg-purple-100 text-purple-600'];

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Clientes Recentes</h2>
            <div className="space-y-4">
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-full" />
                                <Skeleton className="h-5 w-32" />
                            </div>
                            <Skeleton className="h-5 w-24" />
                        </div>
                    ))
                ) : (
                    clientes && clientes.length > 0 ? (
                        clientes.map((cliente, index) => (
                            <div key={cliente._id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full ${avatarColors[index % avatarColors.length]} flex items-center justify-center font-bold`}>
                                        {getInitials(cliente.nome)}
                                    </div>
                                    <span className="font-semibold text-slate-700">{cliente.nome}</span>
                                </div>
                                <span className="text-sm text-slate-500">
                                    {formatDistanceToNow(new Date(cliente.ultimoPedido), { addSuffix: true, locale: ptBR })}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-slate-500 py-8">Nenhum cliente recente para exibir.</p>
                    )
                )}
            </div>
        </div>
    );
};

export default RecentClientsList;
