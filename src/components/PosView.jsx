import { useState } from 'react';

function PosView({ menuItems, onCheckout }) {
    const [cart, setCart] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');

    // Get unique categories from menu items
    const categories = ['all', ...new Set(menuItems.map(item => item.category || 'makanan'))];

    // Filter items by category
    const filteredItems = activeCategory === 'all'
        ? menuItems
        : menuItems.filter(item => (item.category || 'makanan') === activeCategory);

    const addToCart = (id) => {
        const menu = menuItems.find(m => m.id === id);
        if (!menu || menu.stock <= 0) return;

        setCart(prev => {
            const existing = prev.find(c => c.id === id);
            if (existing) {
                if (existing.qty >= menu.stock) return prev;
                return prev.map(c => c.id === id ? { ...c, qty: c.qty + 1 } : c);
            }
            return [...prev, { ...menu, qty: 1 }];
        });
    };

    const updateQty = (id, delta) => {
        const menu = menuItems.find(m => m.id === id);
        setCart(prev => {
            return prev.map(item => {
                if (item.id !== id) return item;
                let newQty = item.qty + delta;
                if (delta > 0 && newQty > menu.stock) newQty = menu.stock;
                return { ...item, qty: newQty };
            }).filter(item => item.qty > 0);
        });
    };

    const clearCart = () => setCart([]);

    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const itemCount = cart.reduce((s, i) => s + i.qty, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        const success = await onCheckout(cart);
        if (success) {
            setCart([]);
            alert('Transaction Completed Successfully!');
        }
    };

    const categoryLabels = {
        all: '🍽️ Semua',
        makanan: '🍔 Makanan',
        minuman: '☕ Minuman'
    };

    return (
        <section id="view-pos" className="flex-1 flex overflow-hidden">
            {/* Menu Grid */}
            <div className="flex-1 p-10 overflow-y-auto custom-scroll">
                <header className="mb-10 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Main Menu</h2>
                        <p className="text-gray-400 mt-1 font-medium">Select items to process customer orders</p>
                    </div>
                    <div className="flex gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 cursor-pointer
                                    ${activeCategory === cat
                                        ? 'bg-[#4A3728] text-white shadow-lg shadow-amber-950/20 scale-105'
                                        : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 hover:text-gray-700'
                                    }`}
                            >
                                {categoryLabels[cat] || cat}
                            </button>
                        ))}
                    </div>
                </header>

                <div id="pos-menu-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => addToCart(item.id)}
                            className={`card-premium group p-5 rounded-[32px] cursor-pointer relative ${item.stock <= 0 ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                        >
                            <div className="h-44 w-full bg-gray-50 rounded-[24px] mb-5 overflow-hidden border border-gray-100">
                                {item.image_url ? (
                                    <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">☕</div>
                                )}
                            </div>
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-extrabold text-gray-900 group-hover:text-[#4A3728] transition-colors line-clamp-1">{item.name}</h4>
                                <span className={`text-[10px] font-black uppercase ${item.stock < 5 ? 'text-red-500' : 'text-gray-400'}`}>Stock: {item.stock}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-xl font-black text-[#4A3728]">Rp {Number(item.price).toLocaleString()}</p>
                                <span className="text-[10px] font-bold text-gray-300 uppercase bg-gray-50 px-2 py-1 rounded-lg">{item.category || 'makanan'}</span>
                            </div>

                            <div className="absolute bottom-5 right-5 w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                                <svg className="w-5 h-5 text-[#4A3728]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cart Sidebar */}
            <div className="w-[420px] bg-white border-l border-gray-100 flex flex-col shadow-2xl z-10">
                <div className="p-8 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-extrabold text-gray-900">Current Order</h3>
                        <span className="bg-[#4A3728] text-white text-[10px] font-bold px-2 py-1 rounded-md">{itemCount} ITEMS</span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll space-y-4 pr-2">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                                <div className="text-6xl mb-4">🛒</div>
                                <p className="font-bold text-sm tracking-widest uppercase">Cart is Empty</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex items-center gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 group">
                                    <div className="w-12 h-12 rounded-xl bg-white flex-shrink-0 flex items-center justify-center font-bold text-[#4A3728] shadow-sm border border-gray-100">
                                        {item.qty}x
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 truncate">{item.name}</p>
                                        <p className="text-xs font-bold text-gray-400">Rp {item.price.toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-inner border border-gray-100">
                                        <button onClick={(e) => { e.stopPropagation(); updateQty(item.id, -1); }} className="w-8 h-8 flex items-center justify-center hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors font-bold">-</button>
                                        <button onClick={(e) => { e.stopPropagation(); updateQty(item.id, 1); }} className="w-8 h-8 flex items-center justify-center hover:bg-green-50 hover:text-green-500 rounded-lg transition-colors font-bold">+</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-8 bg-gray-50/50 border-t border-gray-100">
                    <div className="space-y-3 mb-8">
                        <div className="flex justify-between text-gray-400 font-medium">
                            <span>Order Subtotal</span>
                            <span className="text-gray-900 font-bold">Rp {total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                            <span className="text-gray-900 font-extrabold text-lg">Grand Total</span>
                            <span className="text-2xl font-black text-[#4A3728]">Rp {total.toLocaleString()}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckout}
                        className="w-full bg-[#4A3728] text-white py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-amber-950/20 active:scale-[0.98]"
                    >
                        Complete Transaction
                    </button>
                    <button
                        onClick={clearCart}
                        className="w-full mt-4 py-2 text-gray-400 text-xs font-bold hover:text-red-500 uppercase tracking-widest transition-colors"
                    >
                        Discard All Items
                    </button>
                </div>
            </div>
        </section>
    );
}

export default PosView;

