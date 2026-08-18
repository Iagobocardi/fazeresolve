// src/pages/TalentosPage.js
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Button } from '../components/ui/Button.jsx';

// Dados fictícios (mock data) para a base de talentos
const mockTalentos = [
    { id: 1, nome: "Ana Silva", especialidade: "Pintura e Acabamentos", localizacao: "São Paulo, SP", avaliacao: 4.9, fotoUrl: "https://i.pravatar.cc/150?img=1" },
    { id: 2, nome: "Bruno Costa", especialidade: "Marcenaria e Montagem", localizacao: "Campinas, SP", avaliacao: 4.8, fotoUrl: "https://i.pravatar.cc/150?img=2" },
    { id: 3, nome: "Carla Dias", especialidade: "Estofamento de Sofás", localizacao: "Tatuí, SP", avaliacao: 5.0, fotoUrl: "https://i.pravatar.cc/150?img=3" },
    { id: 4, nome: "Daniel Oliveira", especialidade: "Instalações Elétricas", localizacao: "Sorocaba, SP", avaliacao: 4.7, fotoUrl: "https://i.pravatar.cc/150?img=4" },
];

const TalentosPage = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Base de Talentos</h1>
                <Button>Indicar um Profissional</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Encontre Profissionais Qualificados</CardTitle>
                    <p className="text-sm text-muted-foreground pt-2">
                        Aqui você pode encontrar freelancers e profissionais para ajudar nos seus projetos. (Funcionalidade em desenvolvimento)
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {mockTalentos.map((talento) => (
                            <div key={talento.id} className="border bg-card rounded-lg p-4 flex flex-col items-center text-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
                                <img src={talento.fotoUrl} alt={`Foto de ${talento.nome}`} className="w-24 h-24 rounded-full border-2 border-primary mb-3" />
                                <h4 className="font-semibold text-foreground">{talento.nome}</h4>
                                <p className="text-sm text-primary font-medium">{talento.especialidade}</p>
                                <p className="text-xs text-muted-foreground mt-1">{talento.localizacao}</p>
                                <div className="mt-3">
                                    <span className="font-bold text-yellow-500">⭐ {talento.avaliacao.toFixed(1)}</span>
                                </div>
                                <Button variant="outline" size="sm" className="mt-4 w-full">Ver Perfil</Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TalentosPage;