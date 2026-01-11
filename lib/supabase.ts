import { createClient } from '@supabase/supabase-js'

// ========================================
// KONFIGURASI SUPABASE
// ========================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nsesifpesdgwpyaytqro.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZXNpZnBlc2Rnd3B5YXl0cXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDg4MTksImV4cCI6MjA4MzM4NDgxOX0.v75EwBEecxqWGV63HLavio7LbpjZZ9KMj58e15whkQM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ========================================
// TYPE DEFINITIONS
// ========================================
export interface Product {
    id: string
    name: string
    price: number
    stock: number
    image_url?: string | null
    created_at?: string
}

export interface Order {
    id: string
    user_id?: string | null
    total_amount: number
    created_at: string
    order_items?: OrderItem[]
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
// QUERY FUNCTIONS - PRODUCTS
// ========================================

export async function getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')

    if (error) throw error
    return data as Product[]
}

export async function addProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single()

    if (error) throw error
    return data as Product
}

export async function deleteProduct(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

    if (error) throw error
    return true
}

// ========================================
// QUERY FUNCTIONS - ORDERS
// ========================================

export async function getOrders(): Promise<Order[]> {
    const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as Order[]
}

export async function createOrderAndReduceStock(
    items: OrderItem[],
    total: number
): Promise<string> {
    const { data, error } = await supabase.rpc('create_order_and_reduce_stock', {
        p_user_id: null,
        p_items: items,
        p_total: total
    })

    if (error) throw error
    return data as string
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

export function formatCurrency(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`
}
