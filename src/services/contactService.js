// src/services/contactService.js

// Dummy Data for Contacts
let MOCK_CONTACTS = [
    { id: '1', name: 'Alice Smith', phone: '+1 234 567 8900', email: 'alice.smith@example.com', avatar: 'https://i.pravatar.cc/150?u=alice', status: 'online', isFavorite: true },
    { id: '2', name: 'Bob Johnson', phone: '+1 987 654 3210', email: 'bob.j@example.com', avatar: 'https://i.pravatar.cc/150?u=bob', status: 'offline', isFavorite: false },
    { id: '3', name: 'Charlie Brown', phone: '+1 555 123 4567', email: 'charlie.b@example.com', avatar: 'https://i.pravatar.cc/150?u=charlie', status: 'online', isFavorite: true },
    { id: '4', name: 'Diana Prince', phone: '+1 555 987 6543', email: 'diana.p@example.com', avatar: 'https://i.pravatar.cc/150?u=diana', status: 'offline', isFavorite: false },
    { id: '5', name: 'Evan Wright', phone: '+1 555 321 7890', email: 'evan.w@example.com', avatar: null, status: 'online', isFavorite: false },
    { id: '6', name: 'Fiona Gallagher', phone: '+1 555 111 2222', email: 'fiona.g@example.com', avatar: 'https://i.pravatar.cc/150?u=fiona', status: 'offline', isFavorite: false },
];

export const contactService = {
    getContacts: async () => {
        // Simulate network delay
        return new Promise((resolve) => setTimeout(() => resolve([...MOCK_CONTACTS]), 500));
    },

    addContact: async (contact) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newContact = {
                    ...contact,
                    id: String(Date.now()),
                    status: 'online',
                    isFavorite: false,
                };
                MOCK_CONTACTS.push(newContact);
                resolve(newContact);
            }, 500);
        });
    },

    toggleFavorite: async (id) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const index = MOCK_CONTACTS.findIndex(c => c.id === id);
                if (index !== -1) {
                    MOCK_CONTACTS[index].isFavorite = !MOCK_CONTACTS[index].isFavorite;
                }
                resolve([...MOCK_CONTACTS]);
            }, 200);
        });
    }
};
