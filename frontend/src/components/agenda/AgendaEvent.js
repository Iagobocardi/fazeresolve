import React from 'react';
import moment from 'moment';

const AgendaEvent = ({ event }) => {
  // Mapeamento de status para classes de estilo completas do Tailwind
  const statusStyles = {
    'Agendado': {
      bg: 'bg-blue-100',
      border: 'border-blue-500',
      text: 'text-blue-800',
      timeText: 'text-blue-600',
    },
    'Confirmado': {
      bg: 'bg-green-100',
      border: 'border-green-500',
      text: 'text-green-800',
      timeText: 'text-green-600',
    },
    'Pendente': {
      bg: 'bg-yellow-100',
      border: 'border-yellow-500',
      text: 'text-yellow-800',
      timeText: 'text-yellow-600',
    },
    'Cancelado': {
      bg: 'bg-red-100',
      border: 'border-red-500',
      text: 'text-red-800',
      timeText: 'text-red-600',
    },
    'default': {
      bg: 'bg-gray-100',
      border: 'border-gray-500',
      text: 'text-gray-800',
      timeText: 'text-gray-600',
    },
  };

  // O status do evento pode vir do "resource" associado
  const styles = statusStyles[event.resource?.status] || statusStyles['Agendado']; // Default para 'Agendado'

  return (
    <div className={`p-1 rounded-lg h-full ${styles.bg} border-l-4 ${styles.border} flex flex-col justify-center`}>
      <p className={`font-semibold text-xs ${styles.text} truncate`}>{event.title}</p>
      <p className={`text-xs ${styles.timeText}`}>
        {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
      </p>
    </div>
  );
};

export default AgendaEvent;
