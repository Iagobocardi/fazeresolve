  import React, { useState, useEffect } from 'react';
  import { Calendar, momentLocalizer } from 'react-big-calendar';
  import moment from 'moment';
  import 'react-big-calendar/lib/css/react-big-calendar.css';
  import apiClient from '../api/apiClient';
  import { useQuery } from '@tanstack/react-query';
  import AgendaSidebar from '../components/agenda/AgendaSidebar.js';
  import AgendaToolbar from '../components/agenda/AgendaToolbar.js';
  import AgendaEvent from '../components/agenda/AgendaEvent.js';
  import EventModal from '../components/agenda/EventModal.js';

  const localizer = momentLocalizer(moment);

  // --- Funções de API ---
  const fetchScheduledPedidos = async (view, date) => {
      const start = moment(date).startOf(view).toISOString();
      const end = moment(date).endOf(view).toISOString();
      const { data } = await apiClient.get('/orcamentos/agendados', {
          params: { start, end }
      });
      return data;
  };


  // --- COMPONENTE PRINCIPAL DA PÁGINA ---
  const AgendaPage = () => {
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');

    const { data: pedidos, isLoading, error } = useQuery({
        queryKey: ['pedidosAgendados', currentView, currentDate.toISOString().split('T')[0]], // Key depends on view and date
        queryFn: () => fetchScheduledPedidos(currentView, currentDate),
    });

    useEffect(() => {
      if (pedidos) {
        const scheduledEvents = pedidos
          .filter(pedido => pedido.start) // Ensure the event has a start date from the API
          .map(pedido => ({
            title: pedido.title, // Use the title directly from the API response
            start: new Date(pedido.start),
            end: new Date(new Date(pedido.start).getTime() + 60 * 60 * 1000), // Adds 1 hour as a default duration
            resource: pedido,
          }));
        setEvents(scheduledEvents);
      }
    }, [pedidos]);

    const handleSelectSlot = (slotInfo) => {
      setSelectedSlot(slotInfo);
      setIsModalOpen(true);
    };

    const handleNovoAgendamento = () => {
        const now = new Date();
        setSelectedSlot({
            start: now,
            end: new Date(now.getTime() + 60 * 60 * 1000), // Default to 1 hour
        });
        setIsModalOpen(true);
    };

    const handleCreateEvent = async ({ title, description, start, end }) => {
      if (!title || !start || !end) {
        throw new Error("Dados do evento inválidos.");
      }

      const eventData = {
        summary: title,
        description: description,
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
      };

      try {
        const response = await apiClient.post('/google/create-event', eventData);
        
        // Adiciona o novo evento ao estado local para atualização da UI
        const newEvent = {
            title: title,
            start: start,
            end: end,
            resource: { status: 'Agendado' } // Adiciona um resource para estilização
        };
        setEvents(prevEvents => [...prevEvents, newEvent]);

        return response.data.message || 'Evento criado com sucesso!';
      } catch (err) {
        throw new Error(err.response?.data?.message || 'Falha ao criar o evento. Verifique se está autenticado com o Google.');
      }
    };
    
    if (isLoading) return <p className="p-6 text-muted-foreground">A carregar agendamentos...</p>;
    if (error) return <p className="p-6 text-destructive">Erro ao carregar dados: {error.message}</p>;

    return (
        <div className="flex h-screen bg-white text-gray-800">
            <EventModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedSlot={selectedSlot}
                onCreateEvent={handleCreateEvent}
            />

            <AgendaSidebar 
                onNovoAgendamento={handleNovoAgendamento}
                events={events}
                currentDate={currentDate}
                onNavigate={setCurrentDate}
                onViewChange={setCurrentView}
            />
            
            {/* Conteúdo Principal da Agenda */}
            <main className="flex-1 flex flex-col">
                <div className="flex-1 overflow-auto bg-gray-50 flex flex-col">
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ flex: '1' }} // Faz o calendário preencher o espaço
                        selectable={true}
                        onSelectSlot={handleSelectSlot}
                        view={currentView}
                        date={currentDate}
                        onView={setCurrentView}
                        onNavigate={setCurrentDate}
                        components={{
                            toolbar: AgendaToolbar,
                            event: AgendaEvent,
                        }}
                        messages={{
                            next: "Próximo",
                            previous: "Anterior",
                            today: "Hoje",
                            month: "Mês",
                            week: "Semana",
                            day: "Dia",
                            agenda: "Agenda",
                            date: "Data",
                            time: "Hora",
                            event: "Evento",
                        }}
                    />
                </div>
            </main>
        </div>
    );
  };

  export default AgendaPage;
