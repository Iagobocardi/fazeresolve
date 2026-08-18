import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

function ScheduleForm({ onSchedule, onCancel, isSubmitting }) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!date || !time) {
            toast.error("Por favor, preencha a data e a hora.");
            return;
        }
        const dataISO = `${date}T${time}:00`;
        const dataObjeto = new Date(dataISO);
        onSchedule(dataObjeto);
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold text-gray-700">Agendar Data e Hora</h4>
            <div className="flex items-center space-x-2 mt-2">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="p-2 border rounded-lg w-full"
                    disabled={isSubmitting}
                />
                <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="p-2 border rounded-lg w-full"
                    disabled={isSubmitting}
                />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm bg-gray-200 rounded-lg hover:bg-gray-300"
                    disabled={isSubmitting}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "A agendar..." : "Salvar Agendamento"}
                </button>
            </div>
        </form>
    );
}

export default ScheduleForm;
