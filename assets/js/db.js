let dataTransaksi = [];
let isMasked = false;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inisialisasi Filter Waktu
    const skrg = new Date();
    document.getElementById('filterBulan').value = String(skrg.getMonth() + 1).padStart(2, '0');
    document.getElementById('filterTahun').value = skrg.getFullYear();
    
    // 2. Load Budget Limit
    document.getElementById('inputLimit').value = localStorage.getItem('budgetLimit') || 0;

    // 3. Event Form
    const form = document.getElementById('formTransaksi');
    if (form) form.addEventListener('submit', tambahTransaksi);
    
    // 4. Load Data Awal
    setTimeout(() => {
        window.ambilDataTransaksi();
    }, 500);
});

// --- FUNGSI CORE (GLOBAL) ---

window.ambilDataTransaksi = async function() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const bulan = document.getElementById('filterBulan').value;
        const tahun = document.getElementById('filterTahun').value;
        
        // Logika Filter Bulan (gte & lte ISO String)
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
    } catch (err) {
        console.error("Gagal ambil data:", err.message);
    }
};

async function tambahTransaksi(e) {
    e.preventDefault();
    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { error } = await supabaseClient
            .from('transaksi_keuangan')
            .insert([{ user_id: user.id, tipe, keterangan, nominal: parseInt(nominal) }]);

        if (error) throw error;
        document.getElementById('formTransaksi').reset();
        window.ambilDataTransaksi();
    } catch (err) {
        alert("Gagal simpan: " + err.message);
    }
}

window.hapusData = async function(id) {
    if (confirm("Hapus data ini secara permanen?")) {
        const { error } = await supabaseClient.from('transaksi_keuangan').delete().eq('id', id);
        if (!error) window.ambilDataTransaksi();
    }
};

// --- UI LOGIC ---

function updateSummary(data) {
    let masuk = 0, keluar = 0;
    data.forEach(item => {
        if (item.tipe === 'masuk') masuk += item.nominal;
        else keluar += item.nominal;
    });

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
                <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="window.hapusData(${item.id})">
                    Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- UTILS & EXPORT ---

window.setLimit = function() {
    localStorage.setItem('budgetLimit', document.getElementById('inputLimit').value);
    updateSummary(dataTransaksi);
};

window.toggleMask = function() {
    isMasked = !isMasked;
    window.ambilDataTransaksi();
};

window.exportExcel = function() {
    if (dataTransaksi.length === 0) return alert("Data kosong!");
    const ws = XLSX.utils.json_to_sheet(dataTransaksi.map(i => ({ Tanggal: i.created_at, Keterangan: i.keterangan, Tipe: i.tipe, Nominal: i.nominal })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Keuangan");
    XLSX.writeFile(wb, "Laporan_Ivan.xlsx");
};

window.exportPDF = function() {
    if (dataTransaksi.length === 0) return alert("Data kosong!");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const rows = dataTransaksi.map(i => [new Date(i.created_at).toLocaleDateString(), i.keterangan, i.tipe, i.nominal]);
    doc.autoTable({ head: [['Tgl', 'Ket', 'Tipe', 'Nominal']], body: rows });
    doc.save("Laporan_Ivan.pdf");
};
