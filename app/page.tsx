"use client";

import { useState, useEffect } from "react";

type Category = "kopi" | "non-kopi" | "makanan";

interface MenuItem {
  id: number;
  nama: string;
  kategori: Category;
  harga: number;
  stok: number;
}

interface Receipt {
  nama: string;
  qty: number;
  harga: number;
  total: number;
  date: string;
}

export default function Home() {
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<"input" | "inventory" | "pos">("input");
  const [formData, setFormData] = useState({
    nama: "",
    kategori: "kopi" as Category,
    harga: "",
    stok: "",
  });
  const [posSelection, setPosSelection] = useState({
    index: "",
    qty: 1,
  });
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [alert, setAlert] = useState<{ id: string; msg: string; type: "success" | "error" } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("kopiData");
    if (saved) {
      setMenuData(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage whenever menuData changes
  useEffect(() => {
    if (menuData.length > 0 || localStorage.getItem("kopiData")) {
      localStorage.setItem("kopiData", JSON.stringify(menuData));
    }
  }, [menuData]);

  const showAlert = (id: string, msg: string, type: "success" | "error") => {
    setAlert({ id, msg, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleSimpanMenu = () => {
    const { nama, kategori, harga, stok } = formData;
    const h = parseInt(harga);
    const s = parseInt(stok);

    if (!nama || isNaN(h) || isNaN(s)) {
      showAlert("alert-input", "Lengkapi semua data dengan benar!", "error");
      return;
    }

    const newMenu: MenuItem = {
      id: Date.now(),
      nama,
      kategori,
      harga: h,
      stok: s,
    };

    setMenuData([...menuData, newMenu]);
    setFormData({ nama: "", kategori: "kopi", harga: "", stok: "" });
    showAlert("alert-input", "Menu berhasil ditambahkan!", "success");
  };

  const handleProsesTransaksi = () => {
    const { index, qty } = posSelection;
    const idx = parseInt(index);

    if (index === "" || isNaN(qty) || qty <= 0) {
      showAlert("alert-pos", "Pilih menu dan masukkan jumlah yang valid!", "error");
      return;
    }

    const item = menuData[idx];

    if (qty > item.stok) {
      showAlert("alert-pos", `Gagal! Stok ${item.nama} tidak mencukupi (Tersisa: ${item.stok})`, "error");
      return;
    }

    const updatedMenu = [...menuData];
    updatedMenu[idx].stok -= qty;
    setMenuData(updatedMenu);

    const totalHarga = item.harga * qty;
    setReceipt({
      nama: item.nama,
      qty,
      harga: item.harga,
      total: totalHarga,
      date: new Date().toLocaleString("id-ID"),
    });

    showAlert("alert-pos", "Transaksi Berhasil!", "success");
  };

  const getBadgeClass = (kategori: Category) => {
    switch (kategori) {
      case "kopi": return "bg-[#5d4037] text-white";
      case "non-kopi": return "bg-[#43a047] text-white";
      case "makanan": return "bg-[#fbc02d] text-black";
      default: return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-[#FED8B1] p-5 font-sans text-[#3C2A21]">
      <div className="mx-auto max-w-[1000px] rounded-[15px] bg-white p-[30px] shadow-[0_10px_25px_rgba(0,0,0,0.1)]">
        <h1 className="mb-6 text-center text-3xl font-bold text-[#6F4E37]">☕ Kopi Jaya Management</h1>

        <div className="mb-[30px] flex justify-center gap-2.5 border-b-2 border-[#ECB176] pb-2.5">
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
            onClick={() => setActiveTab("inventory")}
          >
            Daftar Stok
          </button>
          <button
            className={`cursor-pointer px-5 py-2.5 text-lg font-bold transition-all duration-300 ${activeTab === "pos" ? "border-b-4 border-[#6F4E37] text-[#6F4E37]" : "text-[#A67B5B]"
              }`}
            onClick={() => setActiveTab("pos")}
          >
            Transaksi POS
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
                className="w-full rounded bg-[#6F4E37] p-3 text-lg text-white transition-colors hover:bg-[#3C2A21]"
                onClick={handleSimpanMenu}
              >
                Simpan Menu
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
                      <td colSpan={4} className="p-3 text-center text-gray-500 italic">Belum ada menu.</td>
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
                  value={posSelection.index}
                  onChange={(e) => setPosSelection({ ...posSelection, index: e.target.value })}
                >
                  <option value="">-- Pilih Menu --</option>
                  {menuData.map((item, index) => (
                    <option key={item.id} value={index}>
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
                className="w-full rounded bg-[#6F4E37] p-3 text-lg text-white transition-colors hover:bg-[#3C2A21]"
                onClick={handleProsesTransaksi}
              >
                Proses Transaksi
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
      </div>
    </div>
  );
}
