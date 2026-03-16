// Static dummy data - replaces all database/API calls
export const initialMenuItems = [
    {
        id: 'item-001',
        name: 'Espresso Classic',
        price: 18000,
        stock: 50,
        image_url: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=300&fit=crop'
    },
    {
        id: 'item-002',
        name: 'Cappuccino',
        price: 25000,
        stock: 40,
        image_url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop'
    },
    {
        id: 'item-003',
        name: 'Caffe Latte',
        price: 28000,
        stock: 35,
        image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop'
    },
    {
        id: 'item-004',
        name: 'Matcha Latte',
        price: 30000,
        stock: 25,
        image_url: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=300&fit=crop'
    },
    {
        id: 'item-005',
        name: 'Americano',
        price: 20000,
        stock: 45,
        image_url: 'https://images.unsplash.com/photo-1551030173-122ade30e9c3?w=400&h=300&fit=crop'
    },
    {
        id: 'item-006',
        name: 'Mochaccino',
        price: 27000,
        stock: 30,
        image_url: 'https://images.unsplash.com/photo-1578314675249-a6910a80ca39?w=400&h=300&fit=crop'
    },
    {
        id: 'item-007',
        name: 'Es Kopi Susu',
        price: 22000,
        stock: 60,
        image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop'
    },
    {
        id: 'item-008',
        name: 'Thai Tea',
        price: 20000,
        stock: 3,
        image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop'
    },
    {
        id: 'item-009',
        name: 'Roti Bakar Coklat',
        price: 15000,
        stock: 20,
        image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop'
    }
];

// Generate sample orders for the past 7 days
function generateSampleOrders() {
    const orders = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const numOrders = Math.floor(Math.random() * 8) + 3;
        for (let j = 0; j < numOrders; j++) {
            const total = Math.floor(Math.random() * 80000) + 15000;
            orders.push({
                id: `order-${dateStr}-${j}`,
                created_at: `${dateStr}T${String(8 + j).padStart(2, '0')}:00:00`,
                total_amount: total,
                items: []
            });
        }
    }
    return orders;
}

export const initialOrders = generateSampleOrders();
