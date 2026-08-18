import React from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';

const PaymentGuard = ({ children }) => {
    const [searchParams] = useSearchParams();
    const planoId = searchParams.get('planoId');
    const token = searchParams.get('token');

    if (!planoId || !token) {
        // Silently redirect to the plans page if either the plan ID or the token is missing.
        // This prevents direct access to the payment page and ensures the flow is followed correctly.
        return <Navigate to="/planos" replace />;
    }

    // If both parameters exist, render the requested component (PaymentPage).
    return children;
};

export default PaymentGuard;
