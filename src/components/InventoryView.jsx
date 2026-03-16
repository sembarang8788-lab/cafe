function InventoryView({ menuItems, onDelete, onEdit, onOpenAddModal }) {
    return (
        <section id="view-inventory" className="flex-1 p-10 overflow-y-auto custom-scroll">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Stock Inventory</h2>
                        <p className="text-gray-400 font-medium">Manage your menu offerings and stock levels</p>
                    </div>
                    <button
                        onClick={onOpenAddModal}
                        className="bg-[#4A3728] text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-amber-950/20 hover:bg-black transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Item
                    </button>
                </div>

                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Menu Details</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Category</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Unit Price</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {menuItems.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                                                {item.image_url ? (
                                                    <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center opacity-20 text-xl">☕</div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900">{item.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {String(item.id).slice(0, 8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${(item.category || 'makanan') === 'minuman'
                                                ? 'bg-blue-50 text-blue-600'
                                                : 'bg-amber-50 text-amber-700'
                                            }`}>
                                            {(item.category || 'makanan') === 'minuman' ? '☕ Minuman' : '🍔 Makanan'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 text-right font-black text-[#4A3728] text-lg">Rp {Number(item.price).toLocaleString()}</td>
                                    <td className="px-6 py-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${item.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                            {item.stock} Unit In Stock
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onEdit(item)}
                                                className="p-2 hover:bg-blue-50 text-gray-300 hover:text-blue-500 rounded-xl transition-all"
                                                title="Edit"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => onDelete(item.id)}
                                                className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                                                title="Delete"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
    );
}

export default InventoryView;

