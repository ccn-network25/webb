let dataTransaksi = [];
let isMasked = false;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Set Filter ke Bulan & Tahun Sekarang
    const skrg = new Date();
    document.getElementById('filterBulan').value = String(skrg.getMonth() + 1).padStart(2, '0');
    document.getElementById('filterTahun').value = skrg.getFullYear();
    
    // 2. Ambil Limit Anggaran dari Memory Browser
    const savedLimit = localStorage.getItem('budgetLimit') || 0;
    document.getElementById('inputLimit').value = savedLimit;

    // 3. Pasang Event Form
    const form = document.getElementById('formTransaksi');
    if (form) form.addEventListener('submit', tambahTransaksi);
    
    // 4. Jalankan Security Timer & Ambil Data
    startSessionTimer(15);
    ambilDataTransaksi();
});

// --- LOGIKA BUDGET (KONTROL PENGELUARAN) ---
window.setLimit = function() {
    const limit = document.getElementById('inputLimit').value;
    localStorage.setItem('budgetLimit', limit);
    updateSummary(dataTransaksi); // Refresh bar
};

// --- CORE: AMBIL DATA DENGAN FILTER RENTANG WAKTU ---
async function ambilDataTransaksi() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const bulan = document.getElementById('filterBulan').value;
    const tahun = document.getElementById('filterTahun').value;
    
    // Hitung range awal dan akhir bulan
    const start = `${tahun}-${bulan}-01T00:00:00`;
    const end = `${tahun}-${bulan}-31T23:59:59`;

    const { data, error } = await supabaseClient
        .from('transaksi_keuangan')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

    if (!error) {
        dataTransaksi = data;
        updateSummary(data);
        renderTabel(data);
    }
}

// --- LOGIKA SIMPAN & HAPUS ---
async function tambahTransaksi(e) {
    e.preventDefault();
    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;

    const { data: { user } } = await supabaseClient.auth.getUser();
    const { error } = await supabaseClient
        .from('transaksi_keuangan')
        .insert([{ user_id: user.id, tipe, keterangan, nominal: parseInt(nominal) }]);

    if (error) alert(error.message);
    else {
        document.getElementById('formTransaksi').reset();
        ambilDataTransaksi();
    }
}

window.hapusData = async function(id) {
    if (confirm("Hapus data ini secara permanen?")) {
        const { error } = await supabaseClient.from('transaksi_keuangan').delete().eq('id', id);
        if (!error) ambilDataTransaksi();
    }
};

// --- UPDATE UI (SUMMARY & BUDGET BAR) ---
function updateSummary(data) {
    let masuk = 0, keluar = 0;
    data.forEach(item => {
        if (item.tipe === 'masuk') masuk += item.nominal;
        else keluar += item.nominal;
    });

    const format = (num) => isMasked ? "Rp •••" : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    document.getElementById('totalSaldo').innerText = format(masuk - keluar);

    // Hitung Progress Bar Budget
    const limit = parseInt(localStorage.getItem('budgetLimit')) || 0;
    const bar = document.getElementById('budgetBar');
    const labelPersen = document.getElementById('labelPersen');
    const labelSisa = document.getElementById('labelSisa');

    if (limit > 0) {
        const persen = Math.min((keluar / limit) * 100, 100);
        bar.style.width = persen + '%';
        labelPersen.innerText = Math.round(persen) + '% Terpakai';
        labelSisa.innerText = `Sisa: ${format(limit - keluar)}`;

        // Ganti warna bar (Hijau -> Kuning -> Merah)
        bar.className = "progress-bar progress-bar-striped progress-bar-animated ";
        if (persen < 60) bar.classList.add("bg-success");
        else if (persen < 90) bar.classList.add("bg-warning");
        else bar.classList.add("bg-danger");
    } else {
        bar.style.width = '0%';
        labelPersen.innerText = 'Limit Belum Diatur';
        labelSisa.innerText = '-';
    }
}

function renderTabel(data) {
    const tbody = document.getElementById('tabelData');
    tbody.innerHTML = '';
    data.forEach(item => {
        const tgl = new Date(item.created_at).getDate();
        const nominal = isMasked ? "Rp •••" : `Rp ${item.nominal.toLocaleString('id-ID')}`;
        const warna = item.tipe === 'masuk' ? 'text-success' : 'text-danger';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-3 text-secondary">${tgl}</td>
            <td>${item.keterangan}</td>
            <td class="${warna} fw-bold">${nominal}</td>
            <td class="text-center">
                <button class="btn btn-sm text-danger" onclick="hapusData(${item.id})">×</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- SECURITY & EXPORT ---
function startSessionTimer(minutes) {
    let seconds = minutes * 60;
    const timerEl = document.getElementById('sessionTimer');
    setInterval(() => {
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        if(timerEl) timerEl.innerText = `Sesi: ${m}:${s < 10 ? '0' : ''}${s}`;
        if (seconds <= 0) logout();
        seconds--;
    }, 1000);
}

window.toggleMask = function() {
    isMasked = !isMasked;
    ambilDataTransaksi();
};

window.exportExcel = function() {
    const ws = XLSX.utils.json_to_sheet(dataTransaksi.map(i => ({ Tanggal: i.created_at, Ket: i.keterangan, Tipe: i.tipe, Nominal: i.nominal })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, "Keuangan_Ivan.xlsx");
};

window.exportPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Laporan Keuangan", 14, 15);
    const rows = dataTransaksi.map(i => [new Date(i.created_at).toLocaleDateString(), i.keterangan, i.tipe, i.nominal]);
    doc.autoTable({ head: [['Tgl', 'Ket', 'Tipe', 'Nominal']], body: rows, startY: 20 });
    doc.save("Keuangan_Ivan.pdf");
};
