// src/components/ui/SummaryCard.js
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./card.jsx";

const SummaryCard = ({ title, children, isLoading, error }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading && <p className="text-gray-500">A carregar...</p>}
                {error && <p className="text-red-500">{error.message}</p>}
                {!isLoading && !error && children}
            </CardContent>
        </Card>
    );
};

export default SummaryCard;