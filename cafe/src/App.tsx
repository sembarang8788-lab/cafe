import { useState, useEffect } from "react";
import {
    getProducts,
    addProduct,
    deleteProduct,
    updateProduct,
    getOrders,
    createOrderAndReduceStock,
    formatCurrency,
    type Product,
    type Order,
    type CartItem,
    type OrderItem,
} from "@/lib/api";
import {
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Area,
    AreaChart,
} from "recharts";

type ViewType = "pos" | "inventory" | "report";

export default function App() {
    const [activeView, setActiveView] = useState<ViewType>("pos");
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [dbStatus, setDbStatus] = useState<"online" | "offline">("online");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        price: "",
        stock: "",
        category: "makanan",
        image_url: "",
    });


    // POS Category Filter
    const [posCategory, setPosCategory] = useState<"all" | "makanan" | "minuman">("all");


    // Analytics Filters
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());


    // Chart data
    const [chartData, setChartData] = useState<{ day: string; revenue: number }[]>([]);
    const [topProducts, setTopProducts] = useState<{ id: string; name: string; image: string; sold: number; revenue: number }[]>([]);

    // Load data on mount
    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        try {
            setLoading(true);
            const [productsData, ordersData] = await Promise.all([
                getProducts(),
                getOrders(),
            ]);
            console.log("Fetched Products Sample:", productsData[0]);
            setProducts(productsData);
            setOrders(ordersData);
            updateStats(ordersData, productsData);
            setDbStatus("online");
        } catch (err) {
            console.error("DB Error:", err);
            setDbStatus("offline");
        } finally {
            setLoading(false);
        }
    };

    const updateStats = (ordersData: Order[], productsData: Product[]) => {
        // 1. Chart Data - Show entire selected month
        const daysInMonth = new Date(filterYear, filterMonth, 0).getDate();
        const newChartData = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const sum = ordersData
                .filter((o) => o.created_at && o.created_at.startsWith(dateStr))
                .reduce((s, o) => s + Number(o.total_amount || 0), 0);

            newChartData.push({
                day: day.toString(),
                revenue: sum
            });
        }
        setChartData(newChartData);

        // 2. Top Selling Products - Only from selected month
        const selectedMonthStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
        const monthlyOrders = ordersData.filter(o => o.created_at?.startsWith(selectedMonthStr));

        const productStats: Record<string, { qty: number; revenue: number }> = {};
        monthlyOrders.forEach(order => {
            if (order.order_items) {
                order.order_items.forEach(item => {
                    if (!productStats[item.product_id]) {
                        productStats[item.product_id] = { qty: 0, revenue: 0 };
                    }
                    productStats[item.product_id].qty += item.quantity;
                    productStats[item.product_id].revenue += item.price * item.quantity;
                });
            }
        });

        const sortedProducts = Object.entries(productStats)
            .map(([id, stats]) => {
                const product = productsData.find(p => p.id === id);
                return {
                    id,
                    name: product?.name || 'Unknown Item',
                    image: product?.image_url || '',
                    sold: stats.qty,
                    revenue: stats.revenue
                };
            })
            .filter(p => p.name !== 'Unknown Item')
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        setTopProducts(sortedProducts);
    };

    // Sync stats when filters or orders change
    useEffect(() => {
        if (orders.length > 0 && products.length > 0) {
            updateStats(orders, products);
        }
    }, [filterMonth, filterYear, orders, products]);


    // Navigation
    const nav = (target: ViewType) => {
        setActiveView(target);
        if (target === "inventory" || target === "report") {
            refreshData();
        }
    };

    // Cart functions
    const addToCart = (id: string) => {
        const product = products.find((p) => p.id === id);
        if (!product || product.stock <= 0) return;

        setCart((prev) => {
            const existing = prev.find((c) => c.id === id);
            if (existing) {
                if (existing.qty >= product.stock) return prev;
                return prev.map((c) => (c.id === id ? { ...c, qty: c.qty + 1 } : c));
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const updateQty = (id: string, delta: number) => {
        const product = products.find((p) => p.id === id);
        setCart((prev) => {
            return prev
                .map((item) => {
                    if (item.id === id) {
                        let newQty = item.qty + delta;
                        if (product && newQty > product.stock) newQty = product.stock;
                        return { ...item, qty: newQty };
                    }
                    return item;
                })
                .filter((item) => item.qty > 0);
        });
    };

    const clearCart = () => setCart([]);

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

    const checkout = async () => {
        if (cart.length === 0) return;

        try {
            setLoading(true);
            const items: OrderItem[] = cart.map((item) => ({
                product_id: item.id,
                quantity: item.qty,
                price: item.price,
            }));

            await createOrderAndReduceStock(items, cartTotal);
            setCart([]);
            await refreshData();
            alert("Transaction Completed Successfully!");
        } catch (err: unknown) {
            alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    // Inventory functions
    const handleSaveMenu = async () => {
        const { name, price, stock, image_url } = formData;
        const p = parseFloat(price);
        const s = parseInt(stock);

        if (!name || isNaN(p)) {
            alert("Fill required fields!");
            return;
        }

        try {
            setLoading(true);
            console.log("Saving product data:", {
                id: editingProduct?.id,
                name,
                price: p,
                stock: s,
                category: formData.category,
                image_url
            });

            if (editingProduct) {
                await updateProduct(editingProduct.id, {
                    name,
                    price: p,
                    stock: isNaN(s) ? 0 : s,
                    category: formData.category as "makanan" | "minuman",
                    image_url: image_url || null,
                });
            } else {
                await addProduct({
                    name,
                    price: p,
                    stock: isNaN(s) ? 0 : s,
                    category: formData.category as "makanan" | "minuman",
                    image_url: image_url || null,
                });
            }
            setFormData({ name: "", price: "", stock: "", category: "makanan", image_url: "" });
            setEditingProduct(null);
            setShowModal(false);
            await refreshData();
        } catch (err: unknown) {
            console.error("Save Error Details:", err);
            const msg = err instanceof Error ? err.message : "Unknown error occurred";
            alert("Error: " + msg);
        } finally {
            setLoading(false);
        }
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price.toString(),
            stock: product.stock.toString(),
            category: product.category,
            image_url: product.image_url || "",
        });
        setShowModal(true);
    };


    const handleDeleteMenu = async (id: string) => {
        if (confirm("Permanently delete this item?")) {
            try {
                await deleteProduct(id);
                await refreshData();
            } catch (err: unknown) {
                alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
            }
        }
    };

    // Stats calculations
    const filteredDailyOrders = orders.filter((o) => o.created_at?.startsWith(filterDate));
    const dailyRevenue = filteredDailyOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    // Growth for daily revenue (vs yesterday)
    const selectedDate = new Date(filterDate);
    const yesterday = new Date(selectedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const yesterdayRevenue = orders
        .filter((o) => o.created_at?.startsWith(yesterdayStr))
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const dailyGrowth = yesterdayRevenue > 0 ? ((dailyRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1) : null;


    // Monthly revenue - filtered by month and year
    const selectedMonthStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
    const filteredMonthlyOrders = orders.filter((o) => o.created_at?.startsWith(selectedMonthStr));
    const monthlyRevenue = filteredMonthlyOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const monthlyOrderCount = filteredMonthlyOrders.length;

    // Previous month revenue for comparison (previous to selected month)
    const prevMonthDate = new Date(filterYear, filterMonth - 2, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthOrders = orders.filter((o) => o.created_at?.startsWith(prevMonthStr));
    const prevMonthlyRevenue = prevMonthOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const monthlyGrowth = prevMonthlyRevenue > 0 ? ((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue * 100).toFixed(1) : null;

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-100 flex flex-col z-20">
                <div className="p-8">
                    <h1 className="text-2xl font-extrabold text-[#4A3728] tracking-tight flex items-center gap-3">
                        <span className="p-2 bg-[#4A3728] text-white rounded-lg shadow-inner">☕</span>
                        Cak Yusop
                    </h1>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                            Premium Management
                        </span>
                    </div>
                </div>

                <nav className="flex-1 px-6 space-y-2 mt-4">
                    <button
                        onClick={() => nav("pos")}
                        className={`sidebar-link w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-semibold ${activeView === "pos" ? "active" : "text-gray-500"
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Point of Sale
                    </button>
                    <button
                        onClick={() => nav("inventory")}
                        className={`sidebar-link w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-semibold ${activeView === "inventory" ? "active" : "text-gray-500"
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 11m8 4V4.5" />
                        </svg>
                        Inventory
                    </button>
                    <button
                        onClick={() => nav("report")}
                        className={`sidebar-link w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-semibold ${activeView === "report" ? "active" : "text-gray-500"
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Analytics
                    </button>
                </nav>

                <div className="p-6">
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                System Health
                            </span>
                            <div className={`w-2 h-2 rounded-full ${dbStatus === "online" ? "bg-green-500" : "bg-red-500 animate-ping"}`}></div>
                        </div>
                        <p className="text-xs font-bold text-gray-700">
                            {dbStatus === "online" ? "Service Operational" : "System Offline"}
                        </p>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-[10px] text-gray-400 font-medium">V 2.1.0 • Cak Yusop POS</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col bg-[#F9FAFB] overflow-hidden relative">
                {/* View: POS */}
                {activeView === "pos" && (
                    <section className="flex-1 flex overflow-hidden animate-fadeIn">
                        <div className="flex-1 p-10 overflow-y-auto custom-scroll">
                            <header className="mb-10 flex justify-between items-end">
                                <div>
                                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Main Menu</h2>
                                    <p className="text-gray-400 mt-1 font-medium">Select items to process customer orders</p>
                                </div>
                                <div className="flex gap-2">
                                    {["all", "makanan", "minuman"].map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setPosCategory(cat as "all" | "makanan" | "minuman")}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all border ${posCategory === cat
                                                ? "bg-[#4A3728] text-white border-[#4A3728]"
                                                : "bg-white text-gray-500 border-gray-100 hover:border-[#4A3728]"
                                                }`}
                                        >
                                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {products
                                    .filter((p) => posCategory === "all" || p.category === posCategory)
                                    .map((item) => (

                                        <div
                                            key={item.id}
                                            onClick={() => addToCart(item.id)}
                                            className={`card-premium group p-5 rounded-[32px] cursor-pointer relative ${item.stock <= 0 ? "opacity-40 grayscale pointer-events-none" : ""
                                                }`}
                                        >
                                            <div className="h-44 w-full bg-gray-50 rounded-[24px] mb-5 overflow-hidden border border-gray-100">
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">☕</div>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-extrabold text-gray-900 group-hover:text-[#4A3728] transition-colors line-clamp-1">
                                                    {item.name}
                                                </h4>
                                                <span className={`text-[10px] font-black uppercase ${item.stock < 5 ? "text-red-500" : "text-gray-400"}`}>
                                                    Stock: {item.stock}
                                                </span>
                                            </div>
                                            <p className="text-xl font-black text-[#4A3728]">{formatCurrency(item.price)}</p>

                                            <div className="absolute bottom-5 right-5 w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                                                <svg className="w-5 h-5 text-[#4A3728]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditProduct(item);
                                                }}
                                                className="absolute top-5 right-5 w-10 h-10 bg-white/90 backdrop-blur-md border border-gray-100 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 transition-all hover:bg-[#4A3728] hover:text-white"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Cart Sidebar */}
                        <div className="w-[420px] bg-white border-l border-gray-100 flex flex-col shadow-2xl z-10">
                            <div className="p-8 flex-1 flex flex-col overflow-hidden">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-extrabold text-gray-900">Current Order</h3>
                                    <span className="bg-[#4A3728] text-white text-[10px] font-bold px-2 py-1 rounded-md">
                                        {cartCount} ITEMS
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scroll space-y-4 pr-2">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                                            <div className="text-6xl mb-4">🛒</div>
                                            <p className="font-bold text-sm tracking-widest uppercase">Cart is Empty</p>
                                        </div>
                                    ) : (
                                        cart.map((item) => (
                                            <div key={item.id} className="flex items-center gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 group">
                                                <div className="w-12 h-12 rounded-xl bg-white flex-shrink-0 flex items-center justify-center font-bold text-[#4A3728] shadow-sm border border-gray-100">
                                                    {item.qty}x
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900 truncate">{item.name}</p>
                                                    <p className="text-xs font-bold text-gray-400">{formatCurrency(item.price)}</p>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-inner border border-gray-100">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); updateQty(item.id, -1); }}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors font-bold"
                                                    >
                                                        -
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); updateQty(item.id, 1); }}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-green-50 hover:text-green-500 rounded-lg transition-colors font-bold"
                                                    >
                                                        +
                                                    </button>
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
                                        <span className="text-gray-900 font-bold">{formatCurrency(cartTotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                        <span className="text-gray-900 font-extrabold text-lg">Grand Total</span>
                                        <span className="text-2xl font-black text-[#4A3728]">{formatCurrency(cartTotal)}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={checkout}
                                    disabled={loading || cart.length === 0}
                                    className="w-full bg-[#4A3728] text-white py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-amber-950/20 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {loading ? "Processing..." : "Complete Transaction"}
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
                )}

                {/* View: Inventory */}
                {activeView === "inventory" && (
                    <section className="flex-1 p-10 overflow-y-auto custom-scroll animate-fadeIn">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Stock Inventory</h2>
                                    <p className="text-gray-400 font-medium">Manage your menu offerings and stock levels</p>
                                </div>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="bg-[#4A3728] text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-amber-950/20 hover:bg-black transition-all flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add New Item
                                </button>
                            </div>

                            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Menu Details</th>
                                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Unit Price</th>
                                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {products.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                                                            {item.image_url ? (
                                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center opacity-20 text-xl">☕</div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-900">{item.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                                ID: {item.id.slice(0, 8)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right font-black text-[#4A3728] text-lg">
                                                    {formatCurrency(item.price)}
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${item.stock < 10 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                                                        }`}>
                                                        {item.stock} Unit In Stock
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleEditProduct(item)}
                                                            className="p-2 hover:bg-gray-50 text-gray-300 hover:text-[#4A3728] rounded-xl transition-all"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMenu(item.id)}
                                                            className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}

                {/* View: Analytics */}
                {activeView === "report" && (
                    <section className="flex-1 p-8 overflow-y-auto custom-scroll animate-fadeIn bg-[#F9FAFB]">
                        <div className="max-w-7xl mx-auto space-y-8">
                            <header className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-4xl font-extrabold text-[#4A3728] tracking-tight">Analytics Center</h2>
                                    <p className="text-gray-400 font-bold mt-1">Real-time business performance insights</p>
                                </div>
                                <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-xs font-bold text-gray-600">Live Data</span>
                                </div>
                            </header>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                        <svg className="w-24 h-24 text-[#4A3728]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.35 0 2.53-.86 2.53-1.9s-1.18-1.91-2.53-1.91c-2.53 0-5.12-2-5.12-4.59 0-2.45 1.8-4.14 4.09-4.49V2h2.67v1.88c1.71.36 3.16 1.46 3.27 3.4h-1.96c-.1-1.05-1.18-1.91-2.53-1.91-1.35 0-2.53.86-2.53 1.9s1.18 1.91 2.53 1.91c2.53 0 5.12 2 5.12 4.59 0 2.45-1.8 4.14-4.09 4.49z" />
                                        </svg>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-2 text-gray-400">
                                            <p className="text-[10px] font-black uppercase tracking-widest">Daily Revenue</p>
                                            <input
                                                type="date"
                                                value={filterDate}
                                                onChange={(e) => setFilterDate(e.target.value)}
                                                className="text-[10px] font-bold bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
                                            />
                                        </div>
                                        <h3 className="text-4xl font-black text-[#4A3728] tracking-tight">{formatCurrency(dailyRevenue)}</h3>
                                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                                            <span className="text-[10px] font-medium text-gray-400">Selected: {new Date(filterDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                            {dailyGrowth !== null && (
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${Number(dailyGrowth) >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                    {Number(dailyGrowth) >= 0 ? '+' : ''}{dailyGrowth}%
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                </div>

                                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                        <svg className="w-24 h-24 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                                        </svg>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Orders</p>
                                        <h3 className="text-4xl font-black text-gray-900 tracking-tight">{filteredDailyOrders.length}</h3>
                                        <div className="flex items-center gap-1 mt-3">
                                            <span className="text-[10px] font-medium text-gray-400">Transactions on selected date</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                        <svg className="w-24 h-24 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                                        </svg>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-2 text-gray-400">
                                            <p className="text-[10px] font-black uppercase tracking-widest">Monthly Revenue</p>
                                            <div className="flex gap-1">
                                                <select
                                                    value={filterMonth}
                                                    onChange={(e) => setFilterMonth(Number(e.target.value))}
                                                    className="text-[10px] font-bold bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
                                                >
                                                    {Array.from({ length: 12 }, (_, i) => (
                                                        <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('id-ID', { month: 'short' })}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={filterYear}
                                                    onChange={(e) => setFilterYear(Number(e.target.value))}
                                                    className="text-[10px] font-bold bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
                                                >
                                                    {Array.from({ length: new Date().getFullYear() - 2020 + 2 }, (_, i) => 2020 + i).map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <h3 className="text-3xl font-black text-[#4A3728] tracking-tight">{formatCurrency(monthlyRevenue)}</h3>
                                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">{monthlyOrderCount} orders</span>
                                            {monthlyGrowth !== null && (
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${Number(monthlyGrowth) >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                    {Number(monthlyGrowth) >= 0 ? '+' : ''}{monthlyGrowth}%
                                                </span>
                                            )}
                                            <span className="text-[10px] font-medium text-gray-400">{monthlyGrowth !== null ? 'vs last month' : 'This month'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[500px]">
                                {/* Chart Section */}
                                <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-[#4A3728]/10 rounded-lg text-[#4A3728]">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-extrabold text-gray-900">Revenue Trends</h4>
                                                <p className="text-xs font-medium text-gray-400">Monthly performance trend</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#4A3728" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#4A3728" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                                <XAxis
                                                    dataKey="day"
                                                    tick={{ fontSize: 10, fontWeight: "600", fill: "#9CA3AF" }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    dy={10}
                                                    interval={4}
                                                />

                                                <YAxis
                                                    tick={{ fontSize: 11, fontWeight: "600", fill: "#9CA3AF" }}
                                                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    dx={-10}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    cursor={{ stroke: '#4A3728', strokeWidth: 2, strokeDasharray: '4 4' }}
                                                    formatter={(value: number | undefined) => [formatCurrency(value || 0), "Revenue"]}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    stroke="#4A3728"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorRevenue)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Top Selling Section */}
                                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm h-full flex flex-col">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-extrabold text-gray-900">Menu Terlaris</h4>
                                            <p className="text-xs font-medium text-gray-400">Most ordered items</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scroll">
                                        {topProducts.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                                <span className="text-4xl mb-2">🍽️</span>
                                                <p className="text-sm font-bold text-gray-400">No sale data yet.</p>
                                            </div>
                                        ) : (
                                            topProducts.map((p, i) => (
                                                <div key={p.id} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50/50 hover:bg-gray-100 transition-colors group cursor-default">
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 overflow-hidden shrink-0 shadow-sm">
                                                            {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">☕</div>}
                                                        </div>
                                                        <div className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm
                                    ${i === 0 ? 'bg-yellow-400 text-yellow-900' :
                                                                i === 1 ? 'bg-gray-300 text-gray-800' :
                                                                    i === 2 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 text-gray-500'}`}>
                                                            {i + 1}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-900 truncate text-sm">{p.name}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold">{p.sold} orders sold</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-[#4A3728] text-sm">{formatCurrency(p.revenue)}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {/* Modal: Add Product */}
            {showModal && (
                <div className="fixed inset-0 bg-[#4A3728]/40 backdrop-blur-md flex items-center justify-center z-[100]">
                    <div className="bg-white w-[500px] rounded-[40px] p-10 shadow-2xl animate-scaleIn">
                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-gray-900">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
                            <p className="text-gray-400 font-medium">{editingProduct ? 'Update product details and stock' : 'Enter details for the new menu item'}</p>
                        </div>


                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Title</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Signature Arabica Blend"
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-semibold text-gray-800 placeholder:text-gray-300"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (IDR)</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-[#4A3728]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Stock</label>
                                    <input
                                        type="number"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        placeholder="10"
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {["makanan", "minuman"].map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setFormData({ ...formData, category: cat })}
                                            className={`py-4 rounded-2xl font-bold text-sm border transition-all ${formData.category === cat
                                                ? "bg-[#4A3728] text-white border-[#4A3728]"
                                                : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300"
                                                }`}
                                        >
                                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Cover Image URL</label>
                                <input
                                    type="text"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="https://images.unsplash.com/..."
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-medium text-xs text-gray-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingProduct(null);
                                    setFormData({ name: "", price: "", stock: "", category: "makanan", image_url: "" });
                                }}
                                className="flex-1 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveMenu}
                                disabled={loading}
                                className="flex-[2] px-10 py-4 bg-[#4A3728] text-white font-bold rounded-2xl shadow-xl shadow-amber-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {loading ? "Saving..." : (editingProduct ? "Update Item" : "Add Item")}
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
