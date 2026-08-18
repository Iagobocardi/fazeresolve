import React, { useMemo } from 'react';
import Calendar from 'react-calendar';
import moment from 'moment';
import './MiniCalendar.css'; // Importa o CSS customizado
import { Plus, Clock } from 'lucide-react';

const AgendaSidebar = ({ 
    onNovoAgendamento,
    events,
    currentDate,
    onNavigate,
    onViewChange,
}) => {

  // Filtra e ordena os próximos 3 compromissos
  const proximosEventos = useMemo(() => {
    if (!events) return [];
    const agora = new Date();
    return events
      .filter(event => event.start >= agora)
      .sort((a, b) => a.start - b.start)
      .slice(0, 3);
  }, [events]);

  return (
    <aside className="w-72 border-r border-gray-200 p-6 flex-col hidden lg:flex">
      <h2 className="text-xl font-bold text-blue-600">AgendaPro</h2>
      
      <button 
        onClick={onNovoAgendamento}
        className="w-full mt-6 bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:bg-blue-700 transition flex items-center justify-center"
      >
        <Plus size={18} className="mr-2" />
        Novo Agendamento
      </button>
      
      <div className="mt-8">
        <Calendar
          onChange={(newDate) => {
            onNavigate(newDate); // Navega o calendário principal
            onViewChange('day'); // Muda a view para dia
          }}
          value={currentDate}
          locale="pt-BR"
          prev2Label={null} // Remove navegação de ano
          next2Label={null} // Remove navegação de ano
        />
      </div>
      
      <div className="mt-8 border-t pt-6">
        <h3 className="font-semibold text-gray-700 mb-4">Próximos Compromissos</h3>
        <div className="space-y-3 text-sm">
          {proximosEventos.length > 0 ? (
            proximosEventos.map(event => (
              <div key={event.resource._id} className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-400">
                <p className="font-semibold text-blue-800 truncate">{event.title}</p>
                <p className="text-gray-600 mt-1 flex items-center">
                    <Clock size={12} className="mr-1.5" />
                    {moment(event.start).calendar()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Nenhum compromisso futuro.</p>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AgendaSidebar;
