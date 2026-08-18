import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { useQuery } from '@tanstack/react-query';
import { getAvailablePermissions } from '../../api/permissoesApi';
import { Button } from '../ui/Button';

const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        border: 'none',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    overlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
};

Modal.setAppElement('#root');

const PermissionsModal = ({ isOpen, onClose, member, onSave }) => {
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    const { data: availablePermissions, isLoading, error } = useQuery({
        queryKey: ['availablePermissions'],
        queryFn: getAvailablePermissions,
        initialData: []
    });

    useEffect(() => {
        // As permissões do membro são um array de strings (as chaves)
        if (member?.permissoes) {
            setSelectedPermissions(member.permissoes);
        } else {
            setSelectedPermissions([]);
        }
    }, [member]);

    const handleCheckboxChange = (permissionKey) => {
        setSelectedPermissions(prev =>
            prev.includes(permissionKey)
                ? prev.filter(p => p !== permissionKey)
                : [...prev, permissionKey]
        );
    };

    const handleSubmit = () => {
        onSave(selectedPermissions);
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            style={customStyles}
            contentLabel="Editar Permissões"
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Editar Permissões para {member?.nome}</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>

            {isLoading && <p>Carregando permissões...</p>}
            {error && <p className="text-red-500">Erro ao carregar permissões.</p>}

            {!isLoading && !error && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Selecione as permissões que este membro terá acesso.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                        {availablePermissions.map((permission) => (
                            <div key={permission.key} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`perm-${permission.key}`}
                                    checked={selectedPermissions.includes(permission.key)}
                                    onChange={() => handleCheckboxChange(permission.key)}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                />
                                <label htmlFor={`perm-${permission.key}`} className="ml-3 block text-sm font-medium text-gray-700">
                                    {permission.label}
                                </label>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose} className="mr-2">
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleSubmit}>
                            Salvar Permissões
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default PermissionsModal;
