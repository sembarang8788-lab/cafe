import { createClient } from '@supabase/supabase-js'

// ========================================
// KONFIGURASI SUPABASE
// ========================================
// Untuk menghubungkan ke Supabase, Anda membutuhkan:
// 1. SUPABASE_URL - URL project Anda (dari Settings > API)
// 2. SUPABASE_ANON_KEY - Public anon key (dari Settings > API)
// 
// Cara mendapatkan:
// 1. Buka dashboard Supabase: https://supabase.com/dashboard
// 2. Pilih project Anda
// 3. Klik "Project Settings" (ikon gear di sidebar)
// 4. Klik "API" di menu sebelah kiri
// 5. Salin "Project URL" dan "anon public" key
// ========================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nsesifpesdgwpyaytqro.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZXNpZnBlc2Rnd3B5YXl0cXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDg4MTksImV4cCI6MjA4MzM4NDgxOX0.v75EwBEecxqWGV63HLavio7LbpjZZ9KMj58e15whkQM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ========================================
// TYPE DEFINITIONS
// ========================================
export interface MenuItem {
    id?: number
    nama: string
    kategori: 'kopi' | 'non-kopi' | 'makanan'
    harga: number
    stok: number
    created_at?: string
}

export interface Transaction {
    id?: number
    menu_id: number
    menu_nama: string
    qty: number
    harga_satuan: number
    total_harga: number
    tanggal?: string
}

// ========================================
// QUERY FUNCTIONS - MENU
// ========================================

// Ambil semua menu
export async function getAllMenu() {
    const { data, error } = await supabase
        .from('menu')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as MenuItem[]
}

// Tambah menu baru
export async function addMenu(menu: Omit<MenuItem, 'id' | 'created_at'>) {
    const { data, error } = await supabase
        .from('menu')
        .insert([menu])
        .select()
        .single()

    if (error) throw error
    return data as MenuItem
}

// Update menu
export async function updateMenu(id: number, updates: Partial<MenuItem>) {
    const { data, error } = await supabase
        .from('menu')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as MenuItem
}

// Hapus menu
export async function deleteMenu(id: number) {
    const { error } = await supabase
        .from('menu')
        .delete()
        .eq('id', id)

    if (error) throw error
    return true
}

// Update stok menu (untuk transaksi)
export async function updateStok(id: number, jumlahPengurangan: number) {
    // Ambil stok saat ini
    const { data: current, error: fetchError } = await supabase
        .from('menu')
        .select('stok')
        .eq('id', id)
        .single()

    if (fetchError) throw fetchError

    const newStok = current.stok - jumlahPengurangan
    if (newStok < 0) throw new Error('Stok tidak mencukupi')

    const { data, error } = await supabase
        .from('menu')
        .update({ stok: newStok })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as MenuItem
}

// ========================================
// QUERY FUNCTIONS - TRANSAKSI
// ========================================

// Ambil semua transaksi
export async function getAllTransactions() {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('tanggal', { ascending: false })

    if (error) throw error
    return data as Transaction[]
}

// Tambah transaksi baru
export async function addTransaction(transaction: Omit<Transaction, 'id' | 'tanggal'>) {
    const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single()

    if (error) throw error
    return data as Transaction
}

// Proses transaksi lengkap (kurangi stok + catat transaksi)
export async function processTransaction(
    menuId: number,
    menuNama: string,
    qty: number,
    hargaSatuan: number
) {
    // 1. Update stok
    await updateStok(menuId, qty)

    // 2. Catat transaksi
    const transaction = await addTransaction({
        menu_id: menuId,
        menu_nama: menuNama,
        qty: qty,
        harga_satuan: hargaSatuan,
        total_harga: qty * hargaSatuan
    })

    return transaction
}

// Ambil laporan penjualan harian
export async function getDailySales(date: string) {
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('tanggal', startOfDay)
        .lte('tanggal', endOfDay)

    if (error) throw error
    return data as Transaction[]
}

// Ambil laporan penjualan bulanan
export async function getMonthlySales(yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()

    const startOfMonth = `${yearMonth}-01T00:00:00`
    const endOfMonth = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}T23:59:59`

    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('tanggal', startOfMonth)
        .lte('tanggal', endOfMonth)
        .order('tanggal', { ascending: true })

    if (error) throw error
    return data as Transaction[]
}
