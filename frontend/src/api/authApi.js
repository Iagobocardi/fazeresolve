import publicApiClient from './publicApiClient';

export const checkExistingRegistration = async (identifier) => {
    try {
        const { data } = await publicApiClient.post('/auth/check-existing-registration', { identifier });
        return data;
    } catch (error) {
        // Log the error for debugging but re-throw it so the calling component can handle it.
        console.error("Error checking existing registration:", error.response?.data || error.message);
        throw error;
    }
};
