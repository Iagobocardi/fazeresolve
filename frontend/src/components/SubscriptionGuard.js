import React from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';

const SubscriptionGuard = ({ children }) => {
    const [searchParams] = useSearchParams();
    const planoId = searchParams.get('planoId');

    if (!planoId) {
        // Silently redirect to the plans page if no plan ID is present in the URL.
        // The 'replace' prop ensures this redirection doesn't mess up the user's browser history.
        return <Navigate to="/planos" replace />;
    }

    // If a plan ID exists, render the requested component (NewSubscriptionPage).
    return children;
};

export default SubscriptionGuard;
