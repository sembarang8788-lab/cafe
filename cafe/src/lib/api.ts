// ========================================
// API CLIENT UNTUK NODE.JS BACKEND
// ========================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ========================================
// TYPE DEFINITIONS
// ========================================
export interface Product {
    id: string
    name: string
    price: number
    stock: number
    category: 'makanan' | 'minuman'
    image_url?: string | null
    created_at?: string
}

export interface Order {
    id: string
    user_id?: string | null
    total_amount: number
    created_at: string
    order_items?: OrderItem[]
    items?: OrderItem[] // Backend returns 'items' instead of 'order_items'
}

export interface OrderItem {
    product_id: string
    quantity: number
    price: number
}

export interface CartItem extends Product {
    qty: number
}

// ========================================
// HELPER FUNCTION
// ========================================

async function apiRequest<T>(
    endpoint: string,
    options?: RequestInit,
    retries: number = 3
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                ...options,
            });

            clearTimeout(timeoutId);

            const json = await response.json();

            if (!response.ok) {
                throw new Error(json.message || 'API request failed');
            }

            return json;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Jika koneksi terputus dan masih ada retry, tunggu sebentar lalu coba lagi
            if (attempt < retries && (
                lastError.message.includes('terminated') ||
                lastError.message.includes('Failed to fetch') ||
                lastError.message.includes('NetworkError') ||
                lastError.name === 'AbortError'
            )) {
                console.warn(`⚠️ API request attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                continue;
            }
            throw lastError;
        }
    }

    throw lastError || new Error('API request failed after retries');
}

// ========================================
// QUERY FUNCTIONS - PRODUCTS
// ========================================

export async function getProducts(): Promise<Product[]> {
    const response = await apiRequest<{ success: boolean; data: Product[] }>('/api/products');
    return response.data;
}

export async function getProductById(id: string): Promise<Product> {
    const response = await apiRequest<{ success: boolean; data: Product }>(`/api/products/${id}`);
    return response.data;
}

export async function addProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    const response = await apiRequest<{ success: boolean; data: Product }>('/api/products', {
        method: 'POST',
        body: JSON.stringify(product),
    });
    return response.data;
}

export async function updateProduct(
    id: string,
    updates: Partial<Omit<Product, 'id' | 'created_at'>>
): Promise<Product> {
    const response = await apiRequest<{ success: boolean; data: Product }>(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
    return response.data;
}

export async function deleteProduct(id: string): Promise<boolean> {
    await apiRequest<{ success: boolean; message: string }>(`/api/products/${id}`, {
        method: 'DELETE',
    });
    return true;
}

// ========================================
// QUERY FUNCTIONS - ORDERS
// ========================================

export async function getOrders(): Promise<Order[]> {
    const response = await apiRequest<{ success: boolean; data: Order[] }>('/api/orders');
    // Map 'items' to 'order_items' for compatibility with frontend
    return response.data.map(order => ({
        ...order,
        order_items: order.items || order.order_items || []
    }));
}

export async function getOrderById(id: string): Promise<Order> {
    const response = await apiRequest<{ success: boolean; data: Order }>(`/api/orders/${id}`);
    const order = response.data;
    return {
        ...order,
        order_items: order.items || order.order_items || []
    };
}

export async function createOrderAndReduceStock(
    items: OrderItem[],
    total: number
): Promise<string> {
    const response = await apiRequest<{ success: boolean; data: { id: string } }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
            items,
            total_amount: total,
            user_id: null,
        }),
    });
    return response.data.id;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

export function formatCurrency(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

// ========================================
// HEALTH CHECK
// ========================================

export async function checkHealth(): Promise<boolean> {
    try {
        const response = await apiRequest<{ status: string; database: string }>('/health');
        return response.status === 'healthy' && response.database === 'connected';
    } catch {
        return false;
    }
}
