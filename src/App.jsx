import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PosView from './components/PosView';
import InventoryView from './components/InventoryView';
import ReportView from './components/ReportView';
import AddMenuModal from './components/AddMenuModal';
import EditMenuModal from './components/EditMenuModal';
import { initialMenuItems, initialOrders } from './data';
import { supabase } from './supabaseClient';

function App() {
    const [activeView, setActiveView] = useState('pos');
    const [menuItems, setMenuItems] = useState([]);
    const [orders, setOrders] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Products (tabel: products)
            const { data: menuData, error: menuError } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (menuError) throw menuError;
            setMenuItems(menuData || initialMenuItems);

            // Fetch Orders (tabel: orders)
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (orderError) throw orderError;
            setOrders(orderData || initialOrders);

            // Fetch Order Items with product info
            const { data: itemsData, error: itemsError } = await supabase
                .from('order_items')
                .select('*, orders(created_at), products(name, image_url)')
                .order('id');

            if (!itemsError && itemsData) {
                setOrderItems(itemsData);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            // Fallback to initial data if Supabase tables are not ready
            setMenuItems(initialMenuItems);
            setOrders(initialOrders);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMenu = async (newItem) => {
        try {
            const { data, error } = await supabase
                .from('products')
                .insert([{ ...newItem }])
                .select();

            if (error) throw error;
            setMenuItems(prev => [...prev, data[0]]);
            setIsAddModalOpen(false);
        } catch (error) {
            alert('Error adding product: ' + error.message);
        }
    };

    const handleDeleteMenu = async (id) => {
        if (!window.confirm('Permanently delete this item?')) return;
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setMenuItems(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            alert('Error deleting product: ' + error.message);
        }
    };

    const handleEditMenu = async (id, updatedData) => {
        try {
            const { data, error } = await supabase
                .from('products')
                .update(updatedData)
                .eq('id', id)
                .select();

            if (error) throw error;
            setMenuItems(prev => prev.map(item => item.id === id ? data[0] : item));
            setEditingItem(null);
        } catch (error) {
            alert('Error updating product: ' + error.message);
        }
    };

    const handleCheckout = async (cart) => {
        const total_amount = cart.reduce((sum, i) => sum + (Number(i.price) * i.qty), 0);

        try {
            // Gunakan RPC function create_order_and_reduce_stock
            const items = cart.map(item => ({
                product_id: item.id,
                quantity: item.qty,
                price: Number(item.price)
            }));

            const { data: orderId, error } = await supabase.rpc('create_order_and_reduce_stock', {
                p_user_id: null,
                p_items: items,
                p_total: total_amount
            });

            if (error) throw error;

            // Refresh data
            await fetchData();
            return true;
        } catch (error) {
            alert('Checkout failed: ' + error.message);
            return false;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar activeView={activeView} onNavigate={setActiveView} />

            <main className="flex-1 flex flex-col bg-[#F9FAFB] overflow-hidden relative">
                {activeView === 'pos' && (
                    <PosView menuItems={menuItems} onCheckout={handleCheckout} />
                )}
                {activeView === 'inventory' && (
                    <InventoryView
                        menuItems={menuItems}
                        onDelete={handleDeleteMenu}
                        onEdit={(item) => setEditingItem(item)}
                        onOpenAddModal={() => setIsAddModalOpen(true)}
                    />
                )}
                {activeView === 'report' && (
                    <ReportView orders={orders} orderItems={orderItems} menuItems={menuItems} />
                )}
            </main>

            <AddMenuModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddMenu}
            />

            <EditMenuModal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                onSave={handleEditMenu}
                item={editingItem}
            />
        </div>
    );
}

export default App;
