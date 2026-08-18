import React, { useState } from 'react';
import Modal from 'react-modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { inviteMember } from '../../api/membrosApi';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '500px',
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

const AddMemberModal = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const mutation = useMutation({
        mutationFn: inviteMember,
        onSuccess: () => {
            toast.success('Membro convidado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['accountDetails'] });
            onClose(); // Close modal on success
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Falha ao convidar membro.');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!nome || !email || !password) {
            toast.error("Por favor, preencha todos os campos.");
            return;
        }
        const memberData = { nome, email, password };
        mutation.mutate(memberData);
    };
    
    // Reset form when modal is closed
    const handleClose = () => {
        if (!mutation.isPending) {
            setNome('');
            setEmail('');
            setPassword('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={handleClose}
            style={customStyles}
            contentLabel="Adicionar Novo Membro"
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Adicionar Novo Membro</h2>
                <button onClick={handleClose} disabled={mutation.isPending} className="text-gray-500 hover:text-gray-700 text-2xl leading-none disabled:opacity-50">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label htmlFor="nome">Nome Completo</label>
                    <Input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="space-y-1">
                    <label htmlFor="email">Email</label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1">
                    <label htmlFor="password">Senha</label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={mutation.isPending} className="mr-2">
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? 'A convidar...' : 'Convidar Membro'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default AddMemberModal;
