import { useState, useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Filler,
    Tooltip,
    Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

const FILTERS = [
    { key: 'day', label: '📅 Hari', desc: 'Hari Ini' },
    { key: 'week', label: '📆 Minggu', desc: '7 Hari Terakhir' },
    { key: 'month', label: '🗓️ Bulan', desc: 'Bulan Ini' },
    { key: 'year', label: '📊 Tahun', desc: 'Tahun Ini' },
];

function getStartOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function ReportView({ orders, orderItems = [], menuItems = [] }) {
    const [activeFilter, setActiveFilter] = useState('week');

    const now = new Date();

    // Compute filtered orders & chart data based on activeFilter
    const { filteredOrders, chartLabels, chartValues, periodLabel } = useMemo(() => {
        const todayStart = getStartOfDay(now);
        let filtered = [];
        let labels = [];
        let values = [];
        let periodLabel = '';

        if (activeFilter === 'day') {
            // Today: group by hour (0–23)
            const todayStr = now.toISOString().slice(0, 10);
            filtered = orders.filter(o => o.created_at && o.created_at.startsWith(todayStr));
            periodLabel = 'Hari Ini';

            for (let h = 0; h < 24; h++) {
                labels.push(`${String(h).padStart(2, '0')}:00`);
                const hourSum = filtered
                    .filter(o => {
                        const d = new Date(o.created_at);
                        return d.getHours() === h;
                    })
                    .reduce((s, o) => s + Number(o.total_amount || 0), 0);
                values.push(hourSum);
            }
        } else if (activeFilter === 'week') {
            // Last 7 days: group by day
            periodLabel = '7 Hari Terakhir';
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 6);
            const weekAgoStart = getStartOfDay(weekAgo);

            filtered = orders.filter(o => {
                if (!o.created_at) return false;
                return new Date(o.created_at) >= weekAgoStart;
            });

            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().slice(0, 10);
                labels.push(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
                const daySum = orders
                    .filter(o => o.created_at && o.created_at.startsWith(dateStr))
                    .reduce((s, o) => s + Number(o.total_amount || 0), 0);
                values.push(daySum);
            }
        } else if (activeFilter === 'month') {
            // This month: group by day of month
            const year = now.getFullYear();
            const month = now.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
            periodLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

            filtered = orders.filter(o => o.created_at && o.created_at.startsWith(monthStr));

            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
                labels.push(String(d));
                const daySum = orders
                    .filter(o => o.created_at && o.created_at.startsWith(dateStr))
                    .reduce((s, o) => s + Number(o.total_amount || 0), 0);
                values.push(daySum);
            }
        } else if (activeFilter === 'year') {
            // This year: group by month
            const year = now.getFullYear();
            const yearStr = String(year);
            periodLabel = `Tahun ${year}`;

            filtered = orders.filter(o => o.created_at && o.created_at.startsWith(yearStr));

            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            for (let m = 0; m < 12; m++) {
                const monthStr = `${year}-${String(m + 1).padStart(2, '0')}`;
                labels.push(monthNames[m]);
                const monthSum = orders
                    .filter(o => o.created_at && o.created_at.startsWith(monthStr))
                    .reduce((s, o) => s + Number(o.total_amount || 0), 0);
                values.push(monthSum);
            }
        }

        return { filteredOrders: filtered, chartLabels: labels, chartValues: values, periodLabel };
    }, [orders, activeFilter]);

    // Compute top-selling products for the selected period
    const topProducts = useMemo(() => {
        // Get order IDs in the current period
        const filteredOrderIds = new Set(filteredOrders.map(o => o.id));

        // Aggregate by product
        const productMap = {};
        orderItems.forEach(item => {
            if (!filteredOrderIds.has(item.order_id)) return;
            const pid = item.product_id;
            if (!productMap[pid]) {
                productMap[pid] = {
                    id: pid,
                    name: item.products?.name || 'Unknown',
                    image_url: item.products?.image_url || null,
                    totalQty: 0,
                    totalRevenue: 0
                };
            }
            productMap[pid].totalQty += item.quantity;
            productMap[pid].totalRevenue += item.quantity * Number(item.unit_price || 0);
        });

        return Object.values(productMap)
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 5);
    }, [orderItems, filteredOrders]);

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgPerOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Use Bar for year view, Line for others
    const useBarChart = activeFilter === 'year' || activeFilter === 'month';

    const chartConfig = {
        labels: chartLabels,
        datasets: [
            {
                label: 'Omset',
                data: chartValues,
                borderColor: '#4A3728',
                backgroundColor: useBarChart ? 'rgba(74, 55, 40, 0.7)' : 'rgba(74, 55, 40, 0.05)',
                fill: !useBarChart,
                tension: 0.4,
                borderWidth: useBarChart ? 0 : 4,
                pointRadius: 0,
                pointHoverRadius: 6,
                borderRadius: useBarChart ? 12 : 0,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1F2937',
                titleFont: { weight: 'bold', size: 12 },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 12,
                callbacks: {
                    label: (ctx) => `Rp ${Number(ctx.raw).toLocaleString()}`
                }
            }
        },
        scales: {
            y: {
                grid: { borderDash: [5, 5], color: '#F3F4F6' },
                ticks: {
                    font: { weight: 'bold', size: 10 },
                    callback: (v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v
                }
            },
            x: {
                grid: { display: false },
                ticks: { font: { weight: 'bold', size: 10 }, maxRotation: 0 }
            }
        }
    };

    return (
        <section id="view-report" className="flex-1 p-10 overflow-y-auto custom-scroll">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Analytics Dashboard</h2>
                        <p className="text-gray-400 font-medium">Real-time performance metrics</p>
                    </div>
                    <div className="flex gap-2">
                        {FILTERS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setActiveFilter(f.key)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 cursor-pointer
                                    ${activeFilter === f.key
                                        ? 'bg-[#4A3728] text-white shadow-lg shadow-amber-950/20 scale-105'
                                        : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 hover:text-gray-700'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Period Label */}
                <div className="mb-6">
                    <span className="px-4 py-2 bg-[#4A3728]/5 text-[#4A3728] rounded-full text-sm font-bold">
                        📌 {periodLabel}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    {/* Total Revenue */}
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <svg className="w-16 h-16 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                            </svg>
                        </div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Omset</p>
                        <h3 className="text-3xl font-black text-green-600">Rp {totalRevenue.toLocaleString()}</h3>
                        <p className="text-xs text-gray-400 mt-2 font-medium">{periodLabel}</p>
                    </div>

                    {/* Total Orders */}
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <svg className="w-16 h-16 text-[#4A3728]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Pesanan</p>
                        <h3 className="text-3xl font-black text-[#4A3728]">{totalOrders}</h3>
                        <p className="text-xs text-gray-400 mt-2 font-medium">{periodLabel}</p>
                    </div>

                    {/* Average per Order */}
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <svg className="w-16 h-16 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
                            </svg>
                        </div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Rata-rata / Pesanan</p>
                        <h3 className="text-3xl font-black text-blue-600">Rp {avgPerOrder.toLocaleString()}</h3>
                        <p className="text-xs text-gray-400 mt-2 font-medium">{periodLabel}</p>
                    </div>
                </div>

                {/* Revenue Trends Chart */}
                <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <h4 className="text-xl font-extrabold text-gray-900">Revenue Trends</h4>
                        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-xl">
                            {periodLabel}
                        </span>
                    </div>
                    <div className="h-80">
                        {useBarChart ? (
                            <Bar data={chartConfig} options={chartOptions} />
                        ) : (
                            <Line data={chartConfig} options={chartOptions} />
                        )}
                    </div>
                </div>

                {/* Produk Terlaris */}
                <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm mt-10">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="text-xl font-extrabold text-gray-900">🏆 Produk Terlaris</h4>
                        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-xl">
                            {periodLabel}
                        </span>
                    </div>

                    {topProducts.length === 0 ? (
                        <div className="text-center py-16 opacity-30">
                            <div className="text-5xl mb-4">📦</div>
                            <p className="font-bold text-sm tracking-widest uppercase">Belum ada data penjualan</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {topProducts.map((product, index) => {
                                const maxQty = topProducts[0]?.totalQty || 1;
                                const percentage = Math.round((product.totalQty / maxQty) * 100);
                                const medals = ['🥇', '🥈', '🥉'];
                                return (
                                    <div key={product.id} className="flex items-center gap-5 p-5 rounded-2xl hover:bg-gray-50/80 transition-colors group">
                                        {/* Rank */}
                                        <div className="w-10 h-10 flex items-center justify-center text-xl flex-shrink-0">
                                            {index < 3 ? medals[index] : (
                                                <span className="text-sm font-black text-gray-300">#{index + 1}</span>
                                            )}
                                        </div>

                                        {/* Product Image */}
                                        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                                            {product.image_url ? (
                                                <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center opacity-20 text-xl">☕</div>
                                            )}
                                        </div>

                                        {/* Product Info + Progress Bar */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="font-black text-gray-900 truncate">{product.name}</p>
                                                <p className="text-sm font-black text-[#4A3728] flex-shrink-0 ml-4">
                                                    {product.totalQty} terjual
                                                </p>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                <div
                                                    className="h-2.5 rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: index === 0 ? '#4A3728' : index === 1 ? '#8B7355' : index === 2 ? '#B8A088' : '#D4C4B0'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Revenue */}
                                        <div className="text-right flex-shrink-0 w-36">
                                            <p className="text-sm font-black text-green-600">Rp {product.totalRevenue.toLocaleString()}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Revenue</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default ReportView;

