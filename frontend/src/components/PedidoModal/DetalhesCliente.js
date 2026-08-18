import React from 'react';

const DetalhesCliente = ({ cliente }) => {
    const getEnderecoCompleto = () => {
        const { endereco } = cliente || {};

        if (!endereco || typeof endereco !== 'object') {
            return endereco || 'N/A'; // Fallback for old data or missing address
        }

        const parts = [];
        if (endereco.logradouro) {
            parts.push(`${endereco.logradouro}${endereco.numero ? `, ${endereco.numero}` : ''}`);
        }
        
        const BairroCidadeEstado = [endereco.bairro, endereco.cidade, endereco.estado]
            .filter(Boolean) // Remove empty values
            .join(' - ');
            
        if (BairroCidadeEstado) {
            parts.push(BairroCidadeEstado);
        }

        if (endereco.cep) {
            parts.push(`CEP: ${endereco.cep}`);
        }

        return parts.length > 0 ? parts.join('\n') : 'N/A';
    };

    return (
        <>
            <div>
                <h3 className="font-semibold text-gray-700">Cliente</h3>
                <p>{cliente?.nome || 'N/A'}</p>
                <p className="text-sm text-gray-500">{cliente?.telefone}</p>
            </div>
            <div>
                <h3 className="font-semibold text-gray-700">Endereço</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{getEnderecoCompleto()}</p>
            </div>
        </>
    );
};

export default DetalhesCliente;
