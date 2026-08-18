import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { X } from 'lucide-react';

const EventModal = ({ isOpen, onClose, selectedSlot, onCreateEvent }) => {
    const [title, setTitle] = useState('');
    const [client, setClient] = useState(''); // Campo adicional do mockup
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [status, setStatus] = useState('confirmed'); // Campo adicional
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (selectedSlot) {
            setTitle('');
            setClient('');
            setStatus('confirmed');
            setDate(moment(selectedSlot.start).format('YYYY-MM-DD'));
            setTime(moment(selectedSlot.start).format('HH:mm'));
            setError('');
            setMessage('');
        }
    }, [selectedSlot]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title) {
            setError('O título do serviço é obrigatório.');
            return;
        }
        
        setError('');
        setMessage('');

        try {
            // Recalcula o start/end com base nos inputs do formulário
            const startDateTime = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm').toDate();
            const endDateTime = moment(startDateTime).add(1, 'hour').toDate(); // Assume 1h de duração

            const successMessage = await onCreateEvent({
                title: `${title} - Cliente: ${client}`, // Mantém o formato esperado pela função
                description: `Status: ${status}`,
                start: startDateTime,
                end: endDateTime,
            });
            setMessage(successMessage);
            
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err) {
            setError(err.message || 'Falha ao criar o evento.');
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-5 transform transition-all">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Novo Agendamento</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="event-title" className="block text-sm font-medium text-gray-700">Título do Serviço</label>
                        <input type="text" id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Ex: Manutenção de Ar Condicionado" required />
                    </div>
                    <div>
                        <label htmlFor="event-client" className="block text-sm font-medium text-gray-700">Cliente</label>
                        <input type="text" id="event-client" value={client} onChange={(e) => setClient(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Nome do cliente" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="event-date" className="block text-sm font-medium text-gray-700">Data</label>
                            <input type="date" id="event-date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label htmlFor="event-time" className="block text-sm font-medium text-gray-700">Horário</label>
                            <input type="time" id="event-time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="event-status" className="block text-sm font-medium text-gray-700">Status</label>
                        <select id="event-status" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                            <option value="confirmed">Confirmado</option>
                            <option value="pending">Pendente</option>
                            <option value="canceled">Cancelado</option>
                            <option value="completed">Concluído</option>
                        </select>
                    </div>
                    
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {message && <p className="text-sm text-green-600">{message}</p>}
                    
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="bg-gray-100 text-gray-700 font-bold py-2 px-5 rounded-lg hover:bg-gray-200">Cancelar</button>
                        <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 shadow-md">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventModal;
