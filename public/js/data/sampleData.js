export const sampleData = {
    user: {
        id: 'u-guest',
        email: null,
        displayName: null,
        authProvider: 'guest',
        createdAt: new Date().toISOString(),
        preferences: {
            currency: 'DZD',
            theme: 'system',
            autoAdjustBudgets: true,
            resetDay: 1
        }
    },
    categories: [
        {
            id: 'c-1',
            name: 'Food',
            color: '#FF8A65',
            icon: 'icon-categories',
            allocatedAmount: 200,
            history: [],
            spentTotal: 18.5,
            overdrawnAmount: 0,
            status: 'healthy'
        },
        {
            id: 'c-2',
            name: 'Transport',
            color: '#81D4FA',
            icon: 'icon-wallet',
            allocatedAmount: 100,
            history: [],
            spentTotal: 7,
            overdrawnAmount: 0,
            status: 'healthy'
        },
        {
            id: 'c-3',
            name: 'Housing',
            color: '#A5D6A7',
            icon: 'icon-settings',
            allocatedAmount: 900,
            history: [],
            spentTotal: 0,
            overdrawnAmount: 0,
            status: 'healthy'
        }
    ],
    dayNotes: [
        {
            id: '2025-10-05',
            date: '2025-10-05',
            items: ['e-1', 'e-2'],
            total: 18.5,
            createdAt: '2025-10-05T07:00:00Z',
            pinned: false
        },
        {
            id: '2025-10-06',
            date: '2025-10-06',
            items: ['e-3'],
            total: 7.0,
            createdAt: '2025-10-06T07:00:00Z',
            pinned: false
        }
    ],
    expenses: [
        {
            id: 'e-1',
            type: 'Coffee',
            amount: 3.5,
            currency: 'DZD',
            categoryId: 'c-1',
            noteId: '2025-10-05',
            createdAt: '2025-10-05T09:00:00Z',
            tags: []
        },
        {
            id: 'e-2',
            type: 'Lunch',
            amount: 15.0,
            currency: 'DZD',
            categoryId: 'c-1',
            noteId: '2025-10-05',
            createdAt: '2025-10-05T12:00:00Z',
            tags: []
        },
        {
            id: 'e-3',
            type: 'Bus',
            amount: 7.0,
            currency: 'DZD',
            categoryId: 'c-2',
            noteId: '2025-10-06',
            createdAt: '2025-10-06T08:00:00Z',
            tags: []
        }
    ],
    income: [
        {
            id: 'inc-1',
            name: 'Salary',
            amount: 3200,
            frequency: 'monthly',
            payday: '2025-10-01'
        }
    ],
    savings: [
        {
            id: 's-1',
            title: 'Emergency Fund',
            targetAmount: 2000,
            currentSaved: 800,
            contributions: [
                {
                    id: 'contrib-1',
                    amount: 500,
                    date: '2025-10-01T00:00:00Z',
                    createdAt: '2025-10-01T00:00:00Z'
                },
                {
                    id: 'contrib-2',
                    amount: 300,
                    date: '2025-10-10T00:00:00Z',
                    createdAt: '2025-10-10T00:00:00Z'
                }
            ],
            createdAt: '2025-09-01T00:00:00Z'
        }
    ]
};
