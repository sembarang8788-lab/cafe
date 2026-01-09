"use client";

import { useState, useEffect } from "react";
import {
  supabase,
  getAllMenu,
  addMenu,
  updateStok,
  addTransaction,
  getDailySales,
  getMonthlySales,
  type MenuItem,
  type Transaction
} from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

type Category = "kopi" | "non-kopi" | "makanan";

interface Receipt {
  nama: string;
  qty: number;
  harga: number;
  total: number;
  date: string;
}

interface TopSellingItem {
  nama: string;
  qty: number;
  total: number;
  kategori: string;
}

export default function Home() {
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<"input" | "inventory" | "pos" | "omset">("input");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    kategori: "kopi" as Category,
    harga: "",
    stok: "",
  });
  const [posSelection, setPosSelection] = useState({
    menuId: "",
    qty: 1,
  });
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [alert, setAlert] = useState<{ id: string; msg: string; type: "success" | "error" } | null>(null);

  // Omset states
  const [filterTanggal, setFilterTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterBulan, setFilterBulan] = useState(() => new Date().toISOString().slice(0, 7));
  const [transaksiHariIni, setTransaksiHariIni] = useState<Transaction[]>([]);
  const [transaksiBulanIni, setTransaksiBulanIni] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<{ tanggal: number; omset: number }[]>([]);
  const [topSelling, setTopSelling] = useState<TopSellingItem[]>([]);

  // Load data from Supabase on mount
  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const data = await getAllMenu();
      setMenuData(data);
    } catch (error) {
      console.error("Error fetching menu:", error);
      showAlert("alert-input", "Gagal memuat data dari database", "error");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (id: string, msg: string, type: "success" | "error") => {
    setAlert({ id, msg, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleSimpanMenu = async () => {
    const { nama, kategori, harga, stok } = formData;
    const h = parseInt(harga);
    const s = parseInt(stok);

    if (!nama || isNaN(h) || isNaN(s)) {
      showAlert("alert-input", "Lengkapi semua data dengan benar!", "error");
      return;
    }

    try {
      setLoading(true);
      await addMenu({
        nama,
        kategori,
        harga: h,
        stok: s,
      });

      // Refresh data from Supabase
      await fetchMenuData();

      setFormData({ nama: "", kategori: "kopi", harga: "", stok: "" });
      showAlert("alert-input", "Menu berhasil ditambahkan!", "success");
    } catch (error) {
      console.error("Error adding menu:", error);
      showAlert("alert-input", "Gagal menyimpan menu ke database", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleProsesTransaksi = async () => {
    const { menuId, qty } = posSelection;

    if (menuId === "" || isNaN(qty) || qty <= 0) {
      showAlert("alert-pos", "Pilih menu dan masukkan jumlah yang valid!", "error");
      return;
    }

    const item = menuData.find(m => m.id?.toString() === menuId);

    if (!item || !item.id) {
      showAlert("alert-pos", "Menu tidak ditemukan!", "error");
      return;
    }

    if (qty > item.stok) {
      showAlert("alert-pos", `Gagal! Stok ${item.nama} tidak mencukupi (Tersisa: ${item.stok})`, "error");
      return;
    }

    try {
      setLoading(true);

      // Update stok di Supabase
      await updateStok(item.id, qty);

      // Catat transaksi di Supabase
      await addTransaction({
        menu_id: item.id,
        menu_nama: item.nama,
        qty: qty,
        harga_satuan: item.harga,
        total_harga: qty * item.harga
      });

      // Refresh data
      await fetchMenuData();

      const totalHarga = item.harga * qty;
      setReceipt({
        nama: item.nama,
        qty,
        harga: item.harga,
        total: totalHarga,
        date: new Date().toLocaleString("id-ID"),
      });

      showAlert("alert-pos", "Transaksi Berhasil!", "success");
    } catch (error) {
      console.error("Error processing transaction:", error);
      showAlert("alert-pos", "Gagal memproses transaksi", "error");
    } finally {
      setLoading(false);
    }
  };

  const getBadgeClass = (kategori: string) => {
    switch (kategori) {
      case "kopi": return "bg-[#5d4037] text-white";
      case "non-kopi": return "bg-[#43a047] text-white";
      case "makanan": return "bg-[#fbc02d] text-black";
      default: return "bg-gray-500 text-white";
    }
  };

  // ========================================
  // OMSET DASHBOARD FUNCTIONS
  // ========================================
  const fetchOmsetData = async () => {
    try {
      setLoading(true);

      // Fetch daily transactions
      const hariIni = await getDailySales(filterTanggal);
      setTransaksiHariIni(hariIni);

      // Fetch monthly transactions
      const bulanIni = await getMonthlySales(filterBulan);
      setTransaksiBulanIni(bulanIni);

      // Prepare chart data
      const [year, month] = filterBulan.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyData: { tanggal: number; omset: number }[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${filterBulan}-${String(day).padStart(2, '0')}`;
        const omsetHari = bulanIni
          .filter(t => t.tanggal?.slice(0, 10) === dateStr)
          .reduce((sum, t) => sum + t.total_harga, 0);
        dailyData.push({ tanggal: day, omset: omsetHari });
      }
      setChartData(dailyData);

      // Calculate top selling
      const menuSales: Record<string, TopSellingItem> = {};
      bulanIni.forEach(t => {
        if (!menuSales[t.menu_nama]) {
          menuSales[t.menu_nama] = { nama: t.menu_nama, qty: 0, total: 0, kategori: '' };
        }
        menuSales[t.menu_nama].qty += t.qty;
        menuSales[t.menu_nama].total += t.total_harga;
      });

      const sorted = Object.values(menuSales)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);
      setTopSelling(sorted);

    } catch (error) {
      console.error("Error fetching omset data:", error);
    } finally {
      setLoading(false);
    }
  };

  const omsetHari = transaksiHariIni.reduce((sum, t) => sum + t.total_harga, 0);
  const omsetBulan = transaksiBulanIni.reduce((sum, t) => sum + t.total_harga, 0);
  const totalTransaksi = transaksiHariIni.length;
  const totalItem = transaksiHariIni.reduce((sum, t) => sum + t.qty, 0);

  return (
    <div className="min-h-screen bg-[#FED8B1] p-5 font-sans text-[#3C2A21]">
      <div className="mx-auto max-w-[1100px] rounded-[15px] bg-white p-[30px] shadow-[0_10px_25px_rgba(0,0,0,0.1)]">
        <h1 className="mb-6 text-center text-3xl font-bold text-[#6F4E37]">☕ Kedai Cak Yusop</h1>

        {/* Loading Indicator */}
        {loading && (
          <div className="mb-4 text-center text-[#6F4E37]">
            <span className="animate-pulse">⏳ Memproses...</span>
          </div>
        )}

        <div className="mb-[30px] flex flex-wrap justify-center gap-2.5 border-b-2 border-[#ECB176] pb-2.5">
          <button
            className={`cursor-pointer px-5 py-2.5 text-lg font-bold transition-all duration-300 ${activeTab === "input" ? "border-b-4 border-[#6F4E37] text-[#6F4E37]" : "text-[#A67B5B]"
              }`}
            onClick={() => setActiveTab("input")}
          >
            Input Menu
          </button>
          <button
            className={`cursor-pointer px-5 py-2.5 text-lg font-bold transition-all duration-300 ${activeTab === "inventory" ? "border-b-4 border-[#6F4E37] text-[#6F4E37]" : "text-[#A67B5B]"
              }`}
            onClick={() => { setActiveTab("inventory"); fetchMenuData(); }}
          >
            Daftar Stok
          </button>
          <button
            className={`cursor-pointer px-5 py-2.5 text-lg font-bold transition-all duration-300 ${activeTab === "pos" ? "border-b-4 border-[#6F4E37] text-[#6F4E37]" : "text-[#A67B5B]"
              }`}
            onClick={() => { setActiveTab("pos"); fetchMenuData(); }}
          >
            Transaksi POS
          </button>
          <button
            className={`cursor-pointer px-5 py-2.5 text-lg font-bold transition-all duration-300 ${activeTab === "omset" ? "border-b-4 border-[#6F4E37] text-[#6F4E37]" : "text-[#A67B5B]"
              }`}
            onClick={() => { setActiveTab("omset"); fetchOmsetData(); }}
          >
            📊 Omset
          </button>
        </div>

        {/* Section 1: Input Menu */}
        {activeTab === "input" && (
          <div className="animate-fadeIn">
            <h2 className="mb-4 text-center text-2xl font-semibold text-[#6F4E37]">Tambah Menu Baru</h2>
            {alert?.id === "alert-input" && (
              <div className={`mb-4 rounded p-2.5 ${alert.type === "success" ? "bg-[#c8e6c9] text-[#1b5e20]" : "bg-[#ffcdd2] text-[#b71c1c]"}`}>
                {alert.msg}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block font-bold">Nama Menu</label>
                <input
                  type="text"
                  className="w-full rounded border border-gray-300 p-2.5"
                  placeholder="Contoh: Espresso"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block font-bold">Kategori</label>
                <select
                  className="w-full rounded border border-gray-300 p-2.5"
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value as Category })}
                >
                  <option value="kopi">Kopi</option>
                  <option value="non-kopi">Non-Kopi</option>
                  <option value="makanan">Makanan</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block font-bold">Harga Satuan (Rp)</label>
                <input
                  type="number"
                  className="w-full rounded border border-gray-300 p-2.5"
                  placeholder="15000"
                  value={formData.harga}
                  onChange={(e) => setFormData({ ...formData, harga: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block font-bold">Stok Awal</label>
                <input
                  type="number"
                  className="w-full rounded border border-gray-300 p-2.5"
                  placeholder="50"
                  value={formData.stok}
                  onChange={(e) => setFormData({ ...formData, stok: e.target.value })}
                />
              </div>
              <button
                className="w-full rounded bg-[#6F4E37] p-3 text-lg text-white transition-colors hover:bg-[#3C2A21] disabled:opacity-50"
                onClick={handleSimpanMenu}
                disabled={loading}
              >
                {loading ? "Menyimpan..." : "Simpan Menu"}
              </button>
            </div>
          </div>
        )}

        {/* Section 2: Daftar Stok */}
        {activeTab === "inventory" && (
          <div className="animate-fadeIn">
            <h2 className="mb-4 text-center text-2xl font-semibold text-[#6F4E37]">Inventory & Stok</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#A67B5B] text-white">
                    <th className="border border-gray-300 p-3 text-left">Nama</th>
                    <th className="border border-gray-300 p-3 text-left">Kategori</th>
                    <th className="border border-gray-300 p-3 text-left">Harga</th>
                    <th className="border border-gray-300 p-3 text-left">Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {menuData.map((item) => (
                    <tr key={item.id} className="border-b border-gray-300">
                      <td className="p-3">{item.nama}</td>
                      <td className="p-3">
                        <span className={`rounded px-2.5 py-1 text-xs ${getBadgeClass(item.kategori)}`}>
                          {item.kategori}
                        </span>
                      </td>
                      <td className="p-3">Rp. {item.harga.toLocaleString()}</td>
                      <td className={`p-3 font-bold ${item.stok < 5 ? "text-red-600" : "text-black"}`}>
                        {item.stok}
                      </td>
                    </tr>
                  ))}
                  {menuData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-gray-500 italic">
                        {loading ? "Memuat data..." : "Belum ada menu."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 3: Transaksi POS */}
        {activeTab === "pos" && (
          <div className="animate-fadeIn">
            <h2 className="mb-4 text-center text-2xl font-semibold text-[#6F4E37]">Kasir (Point of Sale)</h2>
            {alert?.id === "alert-pos" && (
              <div className={`mb-4 rounded p-2.5 ${alert.type === "success" ? "bg-[#c8e6c9] text-[#1b5e20]" : "bg-[#ffcdd2] text-[#b71c1c]"}`}>
                {alert.msg}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block font-bold">Pilih Menu</label>
                <select
                  className="w-full rounded border border-gray-300 p-2.5"
                  value={posSelection.menuId}
                  onChange={(e) => setPosSelection({ ...posSelection, menuId: e.target.value })}
                >
                  <option value="">-- Pilih Menu --</option>
                  {menuData.map((item) => (
                    <option key={item.id} value={item.id?.toString()}>
                      {item.nama} (Stok: {item.stok})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block font-bold">Jumlah</label>
                <input
                  type="number"
                  className="w-full rounded border border-gray-300 p-2.5"
                  min="1"
                  value={posSelection.qty}
                  onChange={(e) => setPosSelection({ ...posSelection, qty: parseInt(e.target.value) || 1 })}
                />
              </div>
              <button
                className="w-full rounded bg-[#6F4E37] p-3 text-lg text-white transition-colors hover:bg-[#3C2A21] disabled:opacity-50"
                onClick={handleProsesTransaksi}
                disabled={loading}
              >
                {loading ? "Memproses..." : "Proses Transaksi"}
              </button>
            </div>

            {receipt && (
              <div className="mt-5 border border-dashed border-[#3C2A21] bg-[#f9f9f9] p-5">
                <div className="mb-2.5 border-b border-gray-300 pb-2.5 text-center">
                  <h3 className="text-xl font-bold">STRUK PENJUALAN</h3>
                  <p className="text-sm">{receipt.date}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>{receipt.nama} x {receipt.qty}</span>
                    <span>Rp. {receipt.total.toLocaleString()}</span>
                  </div>
                  <small className="text-gray-600">Harga Satuan: Rp. {receipt.harga.toLocaleString()}</small>
                </div>
                <div className="mt-2.5 border-t border-gray-300 pt-2.5 text-right text-lg font-bold">
                  Total: Rp. {receipt.total.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Omset Dashboard */}
        {activeTab === "omset" && (
          <div className="animate-fadeIn">
            <h2 className="mb-4 text-center text-2xl font-semibold text-[#6F4E37]">📊 Dashboard Omset</h2>

            {/* Filter */}
            <div className="mb-5 flex flex-wrap items-end gap-4">
              <div className="min-w-[150px] flex-1">
                <label className="mb-1.5 block font-bold">Pilih Bulan</label>
                <input
                  type="month"
                  className="w-full rounded border border-gray-300 p-2.5"
                  value={filterBulan}
                  onChange={(e) => setFilterBulan(e.target.value)}
                />
              </div>
              <div className="min-w-[150px] flex-1">
                <label className="mb-1.5 block font-bold">Pilih Tanggal</label>
                <input
                  type="date"
                  className="w-full rounded border border-gray-300 p-2.5"
                  value={filterTanggal}
                  onChange={(e) => setFilterTanggal(e.target.value)}
                />
              </div>
              <button
                className="rounded bg-[#6F4E37] px-5 py-2.5 text-white transition-colors hover:bg-[#3C2A21]"
                onClick={fetchOmsetData}
              >
                🔄 Refresh
              </button>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-gradient-to-br from-[#6F4E37] to-[#A67B5B] p-5 text-center text-white shadow-lg">
                <h4 className="mb-2 text-sm opacity-90">💰 Omset Hari Ini</h4>
                <div className="text-2xl font-bold">Rp. {omsetHari.toLocaleString()}</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-[#43a047] to-[#66bb6a] p-5 text-center text-white shadow-lg">
                <h4 className="mb-2 text-sm opacity-90">📅 Omset Bulan Ini</h4>
                <div className="text-2xl font-bold">Rp. {omsetBulan.toLocaleString()}</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-[#ff9800] to-[#ffb74d] p-5 text-center text-white shadow-lg">
                <h4 className="mb-2 text-sm opacity-90">🛒 Total Transaksi</h4>
                <div className="text-2xl font-bold">{totalTransaksi}</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-[#1976d2] to-[#42a5f5] p-5 text-center text-white shadow-lg">
                <h4 className="mb-2 text-sm opacity-90">📦 Item Terjual</h4>
                <div className="text-2xl font-bold">{totalItem}</div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="mb-6 grid gap-5 lg:grid-cols-2">
              {/* Chart */}
              <div className="rounded-xl bg-[#fafafa] p-5">
                <h3 className="mb-4 border-b-2 border-[#ECB176] pb-2 text-center text-lg font-semibold text-[#6F4E37]">
                  📈 Grafik Omset Harian (Bulan Ini)
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tanggal" label={{ value: 'Tanggal', position: 'bottom', offset: -5 }} />
                      <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => [`Rp. ${value.toLocaleString()}`, 'Omset']}
                        labelFormatter={(label) => `Tanggal ${label}`}
                      />
                      <Bar dataKey="omset" fill="#6F4E37" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Selling */}
              <div className="rounded-xl bg-[#fafafa] p-5">
                <h3 className="mb-4 border-b-2 border-[#ECB176] pb-2 text-center text-lg font-semibold text-[#6F4E37]">
                  🏆 Menu Paling Laku
                </h3>
                <div className="space-y-3">
                  {topSelling.length === 0 ? (
                    <p className="text-center text-gray-500">Belum ada data penjualan</p>
                  ) : (
                    topSelling.map((item, index) => (
                      <div
                        key={item.nama}
                        className="flex items-center justify-between rounded-lg border-l-4 border-[#6F4E37] bg-[#f5f5f5] p-4"
                      >
                        <div className="text-2xl font-bold text-[#6F4E37]">#{index + 1}</div>
                        <div className="flex-1 px-4">
                          <h4 className="font-semibold text-[#3C2A21]">{item.nama}</h4>
                          <small className="text-gray-500">Total: Rp. {item.total.toLocaleString()}</small>
                        </div>
                        <div className="text-lg font-bold text-[#4CAF50]">{item.qty} terjual</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="rounded-xl bg-[#fafafa] p-5">
              <h3 className="mb-4 border-b-2 border-[#ECB176] pb-2 text-center text-lg font-semibold text-[#6F4E37]">
                📋 Riwayat Transaksi Hari Ini
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#A67B5B] text-white">
                      <th className="border border-gray-300 p-3 text-left">Waktu</th>
                      <th className="border border-gray-300 p-3 text-left">Menu</th>
                      <th className="border border-gray-300 p-3 text-left">Qty</th>
                      <th className="border border-gray-300 p-3 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transaksiHariIni.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-gray-500">
                          Belum ada transaksi hari ini
                        </td>
                      </tr>
                    ) : (
                      [...transaksiHariIni]
                        .sort((a, b) => new Date(b.tanggal || '').getTime() - new Date(a.tanggal || '').getTime())
                        .map((t) => (
                          <tr key={t.id} className="border-b border-gray-300">
                            <td className="p-3">
                              {t.tanggal ? new Date(t.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="p-3">{t.menu_nama}</td>
                            <td className="p-3">{t.qty}</td>
                            <td className="p-3">Rp. {t.total_harga.toLocaleString()}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
