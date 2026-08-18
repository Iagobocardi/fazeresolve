import React from 'react';
import { Link } from 'react-router-dom';

const LockedBanner = () => {
    return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 w-full sticky top-0 z-50" role="alert">
            <div className="flex items-center">
                <div className="py-1">
                    <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-10a1 1 0 0 0-2 0v4a1 1 0 0 0 2 0v-4zm2 0a1 1 0 0 0-2 0v4a1 1 0 0 0 2 0v-4z"/>
                    </svg>
                </div>
                <div>
                    <p className="font-bold">A sua conta está suspensa</p>
                    <p className="text-sm">
                        O seu acesso às funcionalidades foi restringido devido a um pagamento pendente.
                        <Link to="/billing" className="font-semibold text-red-800 hover:underline ml-1">
                            Clique aqui para regularizar a sua situação
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LockedBanner;
