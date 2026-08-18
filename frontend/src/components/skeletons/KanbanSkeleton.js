// src/components/skeletons/KanbanSkeleton.js
import React from 'react';

const SkeletonCard = () => (
    <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-3 py-1">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                <div className="h-2 bg-gray-200 rounded w-5/6"></div>
            </div>
        </div>
    </div>
);

const KanbanSkeleton = () => {
    const columns = Array.from({ length: 5 }, (_, i) => i); // Cria 5 colunas de skeleton
    const cards = Array.from({ length: 2 }, (_, i) => i);   // Cria 2 cartões por coluna

    return (
        <div className="flex space-x-4 overflow-x-auto pb-4">
            {columns.map(colIndex => (
                <div key={colIndex} className="bg-gray-100 rounded-lg p-4 w-80 flex-shrink-0">
                    <div className="animate-pulse h-6 bg-gray-300 rounded w-1/2 mb-4"></div>
                    <div className="space-y-4 h-full">
                        {cards.map(cardIndex => <SkeletonCard key={cardIndex} />)}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KanbanSkeleton;