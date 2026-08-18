import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AgendaToolbar = ({ label, view, views, onNavigate, onView }) => {
  
  const navigate = (action) => {
    onNavigate(action);
  };

  const changeView = (newView) => {
    onView(newView);
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('PREV')} className="w-10 h-10 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-semibold w-48 text-center">{label}</h2>
          <button onClick={() => navigate('NEXT')} className="w-10 h-10 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center">
            <ChevronRight size={20} />
          </button>
        </div>
        <button onClick={() => navigate('TODAY')} className="hidden sm:block border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100">
          Hoje
        </button>
      </div>
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
        {views.map(viewName => {
          // Capitalize view names for display
          const viewLabel = viewName.charAt(0).toUpperCase() + viewName.slice(1);
          // Map 'month', 'week', 'day' to 'Mês', 'Semana', 'Dia'
          const labels = { 'month': 'Mês', 'week': 'Semana', 'day': 'Dia', 'agenda': 'Agenda' };
          return (
            <button
              key={viewName}
              onClick={() => changeView(viewName)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === viewName ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              {labels[viewName] || viewLabel}
            </button>
          )
        })}
      </div>
    </header>
  );
};

export default AgendaToolbar;
