import { useState } from 'react';

function AddMenuModal({ isOpen, onClose, onSave }) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [category, setCategory] = useState('makanan');

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name || !price) return alert('Fill required fields!');
        onSave({
            name,
            price: parseFloat(price),
            stock: parseInt(stock) || 0,
            image_url: imageUrl || null,
            category
        });
        setName('');
        setPrice('');
        setStock('');
        setImageUrl('');
        setCategory('makanan');
    };

    const handleClose = () => {
        setName('');
        setPrice('');
        setStock('');
        setImageUrl('');
        setCategory('makanan');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-[#4A3728]/40 backdrop-blur-md flex items-center justify-center z-[100]">
            <div className="bg-white w-[500px] rounded-[40px] p-10 shadow-2xl">
                <div className="mb-8">
                    <h3 className="text-2xl font-black text-gray-900">New Product</h3>
                    <p className="text-gray-400 font-medium">Enter details for the new menu item</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Title</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Signature Arabica Blend"
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-semibold text-gray-800 placeholder:text-gray-300"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (IDR)</label>
                            <input
                                type="number"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                placeholder="0"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-[#4A3728]"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Stock</label>
                            <input
                                type="number"
                                value={stock}
                                onChange={e => setStock(e.target.value)}
                                placeholder="10"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setCategory('makanan')}
                                className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all ${category === 'makanan'
                                        ? 'bg-[#4A3728] text-white shadow-lg shadow-amber-950/20'
                                        : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                                    }`}
                            >
                                🍔 Makanan
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategory('minuman')}
                                className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all ${category === 'minuman'
                                        ? 'bg-[#4A3728] text-white shadow-lg shadow-amber-950/20'
                                        : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                                    }`}
                            >
                                ☕ Minuman
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Cover Image URL</label>
                        <input
                            type="text"
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-medium text-xs text-gray-500"
                        />
                    </div>
                </div>

                <div className="flex gap-4 mt-10">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-[2] px-10 py-4 bg-[#4A3728] text-white font-bold rounded-2xl shadow-xl shadow-amber-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Add Item
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AddMenuModal;
