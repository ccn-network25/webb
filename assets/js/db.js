let dataTransaksi = [];
let isMasked = false;

document.addEventListener("DOMContentLoaded", () => {
    const skrg = new Date();
    const fBul = document.getElementById('filterBulan');
    const fTah = document.getElementById('filterTahun');
    if(fBul) fBul.value = String(skrg.getMonth() + 1).padStart(2, '0');
    if(fTah) fTah.value = skrg.getFullYear();
    
    const iLim = document.getElementById('inputLimit');
    if(iLim) iLim.value = localStorage.getItem('budgetLimit') || 0;

    const form = document.getElementById('formTransaksi');
    if (form) form.addEventListener('submit', tambahTransaksi);
    
    setTimeout(() => { window.ambilDataTransaksi(); }, 500);
});

// --- FUNGSI AMBIL DATA ---
window.ambilDataTransaksi = async function() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        const bulan = document.getElementById('filterBulan').value;
        const tahun = document.getElementById('filterTahun').value;
        const start = `${tahun}-${bulan}-01T00:00:00.000Z`;
        const lastDay = new Date(tahun, bulan, 0).getDate();
        const end = `${tahun}-${bulan}-${lastDay}T23:59:59.999Z`;

        const { data, error } = await supabaseClient
            .from('transaksi_keuangan')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', start)
            .lte('created_at', end)
            .order('created_at', { ascending: false });

        if (error) throw error;
        dataTransaksi = data;
        updateSummary(data);
        renderTabel(data);
    } catch (err) { console.error("Fetch Error:", err.message); }
};

// --- FUNGSI EDIT (DENGAN PENGECEKAN BOOTSTRAP) ---
window.bukaModalEdit = function(id) {
    console.log("Mencoba edit ID:", id);
    const item = dataTransaksi.find(i => i.id === id);
    
    if (item) {
        document.getElementById('editId').value = item.id;
        document.getElementById('editTipe').value = item.tipe;
        document.getElementById('editKeterangan').value = item.keterangan;
        document.getElementById('editNominal').value = item.nominal;
        
        // Memanggil modal menggunakan library Bootstrap yang sudah di-load
        const modalEl = document.getElementById('modalEdit');
        const modalInstance = new bootstrap.Modal(modalEl);
        modalInstance.show();
    } else {
        console.error("Data tidak ditemukan di array local!");
    }
};

window.updateTransaksi = async function() {
    const id = document.getElementById('editId').value;
    const tipe = document.getElementById('editTipe').value;
    const keterangan = document.getElementById('editKeterangan').value;
    const nominal = document.getElementById('editNominal').value;

    try {
        const { error } = await supabaseClient
            .from('transaksi_keuangan')
            .update({ tipe, keterangan, nominal: parseInt(nominal) })
            .eq('id', id);

        if (error) throw error;

        // Menutup modal setelah sukses
        const modalEl = document.getElementById('modalEdit');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        window.ambilDataTransaksi();
    } catch (err) { 
        alert("Gagal update: " + err.message); 
    }
};

// --- FUNGSI TAMBAH & HAPUS ---
async function tambahTransaksi(e) {
    e.preventDefault();
    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        await supabaseClient.from('transaksi_keuangan').insert([{ user_id: user.id, tipe, keterangan, nominal: parseInt(nominal) }]);
        document.getElementById('formTransaksi').reset();
        window.ambilDataTransaksi();
    } catch (err) { alert(err.message); }
}

window.hapusData = async function(id) {
    if (confirm("Hapus data secara permanen?")) {
        await supabaseClient.from('transaksi_keuangan').delete().eq('id', id);
        window.ambilDataTransaksi();
    }
};

// --- RENDER & SUMMARY ---
function renderTabel(data) {
    const tbody = document.getElementById('tabelData');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach(item => {
        const tgl = new Date(item.created_at).getDate();
        const nominal = isMasked ? "Rp •••" : `Rp ${item.nominal.toLocaleString('id-ID')}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-3 text-secondary">${tgl}</td>
            <td class="fw-bold">${item.keterangan}</td>
            <td class="${item.tipe === 'masuk' ? 'text-success' : 'text-danger'} fw-bold">${nominal}</td>
            <td class="text-center">
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="window.bukaModalEdit(${item.id})">Edit</button>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="window.hapusData(${item.id})">Hapus</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateSummary(data) {
    let masuk = 0, keluar = 0;
    data.forEach(item => { item.tipe === 'masuk' ? masuk += item.nominal : keluar += item.nominal; });
    const format = (num) => isMasked ? "Rp •••" : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    document.getElementById('totalSaldo').innerText = format(masuk - keluar);
    const limit = parseInt(localStorage.getItem('budgetLimit')) || 0;
    const bar = document.getElementById('budgetBar');
    if (limit > 0 && bar) {
        const persen = Math.min((keluar / limit) * 100, 100);
        bar.style.width = persen + '%';
        bar.className = "progress-bar progress-bar-striped progress-bar-animated " + (persen < 60 ? "bg-success" : persen < 90 ? "bg-warning" : "bg-danger");
        document.getElementById('labelPersen').innerText = Math.round(persen) + '%';
        document.getElementById('labelSisa').innerText = `Sisa: ${format(limit - keluar)}`;
    }
}

// --- UTILS ---
window.setLimit = function() { localStorage.setItem('budgetLimit', document.getElementById('inputLimit').value); updateSummary(dataTransaksi); };
window.toggleMask = function() { isMasked = !isMasked; window.ambilDataTransaksi(); };

// --- EXPORT ---
window.exportExcel = function() {
    const ws = XLSX.utils.json_to_sheet(dataTransaksi.map(i => ({ Tanggal: i.created_at, Ket: i.keterangan, Tipe: i.tipe, Nom: i.nominal })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Keuangan"); XLSX.writeFile(wb, "Laporan_Ivan.xlsx");
};
window.exportPDF = function() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    const rows = dataTransaksi.map(i => [new Date(i.created_at).toLocaleDateString(), i.keterangan, i.tipe, i.nominal]);
    doc.autoTable({ head: [['Tgl', 'Ket', 'Tipe', 'Nominal']], body: rows }); doc.save("Laporan_Ivan.pdf");
};
