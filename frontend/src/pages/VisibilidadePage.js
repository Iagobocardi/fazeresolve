import React, { useState, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { formatCurrency } from '../lib/utils';

// --- Data Fetching ---
const fetchPedidosCoordenadas = async () => {
    const { data } = await apiClient.get('/dashboard/pedidos-coordenadas');
    return data;
};

const fetchVisibilidadeData = async (periodo) => {
    const periodMap = {
        "Últimos 7 dias": "7dias",
        "Últimos 30 dias": "30dias",
        "Este Ano": "ano"
    };
    const apiPeriodo = periodMap[periodo] || "30dias";
    const { data } = await apiClient.get(`/dashboard/visibilidade?periodo=${apiPeriodo}`);
    return data;
};

// --- Sub-components ---

const KpiCard = ({ icon, title, value, isLoading, bgColor, iconColor }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 flex items-center gap-5">
        <div className={`${bgColor} ${iconColor} rounded-full h-12 w-12 flex items-center justify-center`}>
            <i className={`fas ${icon} text-xl`}></i>
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 rounded-md animate-pulse"></div>
            ) : (
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            )}
        </div>
    </div>
);

const TimeRangeFilter = ({ activeFilter, setFilter, disabled }) => {
    const filters = ["Últimos 7 dias", "Últimos 30 dias", "Este Ano"];
    return (
        <div className="flex items-center bg-white p-1 rounded-lg shadow-sm border">
            {filters.map(filter => (
                <button
                    key={filter}
                    onClick={() => setFilter(filter)}
                    disabled={disabled}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeFilter === filter ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-slate-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {filter}
                </button>
            ))}
        </div>
    );
};

const MapaDeAtividade = () => {
    const [selected, setSelected] = useState(null);
    const center = { lat: -23.55052, lng: -46.633308 };
    const containerStyle = { width: '100%', height: '24rem', borderRadius: '0.5rem' };

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script'
    });

    const { data: markers, isLoading, error } = useQuery({
        queryKey: ['pedidosCoordenadas'],
        queryFn: fetchPedidosCoordenadas,
    });

    if (loadError) return <div style={containerStyle} className="flex items-center justify-center bg-red-50 text-red-700 rounded-lg p-4"><p className="font-bold">O mapa não pôde ser carregado.</p></div>;
    if (error) return <div style={containerStyle} className="flex items-center justify-center bg-red-50 text-red-500 rounded-lg"><p>Erro ao carregar os dados do mapa.</p></div>;
    if (!isLoaded || isLoading) return <div style={containerStyle} className="flex items-center justify-center bg-slate-200 rounded-lg animate-pulse"><p className="text-muted-foreground">A carregar mapa...</p></div>;

    return (
        <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={10} options={{ disableDefaultUI: true, zoomControl: true }}>
            {markers?.map((marker) => (
                <Marker key={marker._id} position={{ lat: marker.lat, lng: marker.lng }} onClick={() => setSelected(marker)} />
            ))}
            {selected && (
                <InfoWindow position={{ lat: selected.lat, lng: selected.lng }} onCloseClick={() => setSelected(null)}>
                    <div className="p-1 text-center">
                        <h4 className="font-bold">Pedido #{selected.shortId}</h4>
                        <a href={`/pedidos?open=${selected._id}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Ver Detalhes</a>
                    </div>
                </InfoWindow>
            )}
        </GoogleMap>
    );
};

// --- Main Page Component ---

const VisibilidadePage = () => {
    const [activeFilter, setFilter] = useState("Últimos 30 dias");

    const { data, isLoading, error } = useQuery({
        queryKey: ['visibilidadeData', activeFilter],
        queryFn: () => fetchVisibilidadeData(activeFilter),
        keepPreviousData: true,
    });

    const topCityValue = useMemo(() => {
        return data?.topCidades?.[0]?.valor || 0;
    }, [data]);

    const serviceColors = ['bg-indigo-600', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-slate-400'];

    if (error) return <div className="text-center py-10"><p className="text-red-600">Ocorreu um erro ao buscar os dados de visibilidade. Tente novamente mais tarde.</p></div>

    const kpis = data?.kpis || {};
    const kpiData = [
        { icon: 'fa-users', title: 'Total de Clientes', value: kpis.totalClientes ?? '...', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
        { icon: 'fa-map-marker-alt', title: 'Cidades Atendidas', value: kpis.cidadesAtendidas ?? '...', bgColor: 'bg-green-100', iconColor: 'text-green-600' },
        { icon: 'fa-dollar-sign', title: 'Ticket Médio', value: kpis.ticketMedio ? formatCurrency(kpis.ticketMedio) : '...', bgColor: 'bg-yellow-100', iconColor: 'text-yellow-600' },
        { icon: 'fa-star', title: 'Principal Serviço', value: kpis.principalServico ?? '...', bgColor: 'bg-indigo-100', iconColor: 'text-indigo-600' }
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Visibilidade de Mercado</h1>
                    <p className="text-gray-500 mt-1">Analise o desempenho e a distribuição dos seus serviços.</p>
                </div>
                <TimeRangeFilter activeFilter={activeFilter} setFilter={setFilter} disabled={isLoading} />
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiData.map(kpi => <KpiCard key={kpi.title} {...kpi} isLoading={isLoading} />)}
            </section>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 lg:col-span-3">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Mapa de Atividade</h2>
                    <MapaDeAtividade />
                    <p className="text-xs text-gray-400 mt-2 text-center">As áreas mais quentes indicam maior concentração de serviços. Clique num marcador para detalhes.</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 lg:col-span-2">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Top 5 Cidades por Faturamento</h2>
                    <div className="space-y-4">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded-md animate-pulse"></div>)
                        ) : (
                            data?.topCidades?.map(city => (
                                <div key={city.nome}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-700">{city.nome}</span>
                                        <span className="font-semibold text-blue-600">{formatCurrency(city.valor)}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(city.valor / topCityValue) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Serviços Mais Solicitados</h2>
                    <div className="space-y-3 text-sm">
                         {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-6 bg-gray-200 rounded-md animate-pulse"></div>)
                        ) : (
                            data?.topServicos?.map((service, index) => (
                                <div key={service.nome} className="flex items-center">
                                    <div className={`h-4 w-4 rounded-sm ${serviceColors[index % serviceColors.length]} mr-3`}></div>
                                    <span className="flex-grow text-gray-700">{service.nome}</span>
                                    <span className="font-semibold">{service.percentual.toFixed(1)}%</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VisibilidadePage;
