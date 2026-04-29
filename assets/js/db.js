let dataTransaksi = [];
let isMasked = false;
let myChart = null;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('formTransaksi');
    if (form) form.addEventListener('submit', tambahTransaksi);
    
    // Inisialisasi Security Data
    document.getElementById('lastLoginTime').innerText = new Date().toLocaleString('id-ID');
    fetch('https://api.ipify.org?format=json').then(res => res.json()).then(data => {
        document.getElementById('userIP').innerText = data.ip;
    });

    startSessionTimer(15); // Sesi 15 menit
});

// --- SESSION TIMER (Security UX) ---
function startSessionTimer(minutes) {
    let seconds = minutes * 60;
    const timerEl = document.getElementById('sessionTimer');
    const interval = setInterval(() => {
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        timerEl.innerText = `Sesi: ${m}:${s < 10 ? '0' : ''}${s}`;
        if (seconds <= 0) {
            clearInterval(interval);
            alert("Sesi berakhir demi keamanan!");
            logout();
        }
        seconds--;
    }, 1000);
}

// --- DATA MASKING (Anti-Shoulder Surfing) ---
window.toggleMask = function() {
    isMasked = !isMasked;
    const icon = document.getElementById('maskIcon');
    const text = document.getElementById('maskText');
    
    icon.innerText = isMasked ? '🙈' : '👁️';
    text.innerText = isMasked ? 'Tampilkan Saldo' : 'Sembunyikan Saldo';
    
    ambilDataTransaksi(); // Re-render dengan mask
};

// --- CORE FUNCTIONS ---
async function ambilDataTransaksi() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from('transaksi_keuangan')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (!error) {
        dataTransaksi = data;
        updateSummary(data);
        renderTabel(data);
        updateChart(data);
    }
}

function updateSummary(data) {
    let masuk = 0, keluar = 0;
    data.forEach(item => {
        if (item.tipe === 'masuk') masuk += item.nominal;
        else keluar += item.nominal;
    });

    const format = (num) => {
        if (isMasked) return "Rp ••••••";
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    };

    document.getElementById('totalSaldo').innerText = format(masuk - keluar);
    document.getElementById('totalMasuk').innerText = format(masuk);
    document.getElementById('totalKeluar').innerText = format(keluar);
}

function renderTabel(data) {
    const tbody = document.getElementById('tabelData');
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const tgl = new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        const nominal = isMasked ? "Rp ••••" : `Rp ${item.nominal.toLocaleString('id-ID')}`;
        const warna = item.tipe === 'masuk' ? 'text-success' : 'text-danger';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-3 small text-secondary">${tgl}</td>
            <td class="fw-bold">${item.keterangan}</td>
            <td><span class="badge ${item.tipe === 'masuk' ? 'bg-success' : 'bg-danger'} text-uppercase" style="font-size:0.6rem">${item.tipe}</span></td>
            <td class="${warna} fw-bold">${nominal}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-link text-danger p-0" onclick="hapusData(${item.id})">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- VISUALIZATION (Chart.js) ---
function updateChart(data) {
    const ctx = document.getElementById('cashFlowChart').getContext('2d');
    let masuk = data.filter(i => i.tipe === 'masuk').reduce((a, b) => a + b.nominal, 0);
    let keluar = data.filter(i => i.tipe === 'keluar').reduce((a, b) => a + b.nominal, 0);

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pemasukan', 'Pengeluaran'],
            datasets: [{
                data: [masuk, keluar],
                backgroundColor: ['#198754', '#dc3545'],
                borderWidth: 0
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// --- SEARCH & FILTER ---
window.filterTabel = function() {
    const keyword = document.getElementById('searchData').value.toLowerCase();
    const filtered = dataTransaksi.filter(item => 
        item.keterangan.toLowerCase().includes(keyword)
    );
    renderTabel(filtered);
};

// ... (Fungsi hapusData, exportExcel, exportPDF tetap sama seperti sebelumnya) ...

let dataTransaksi = []; // Data global untuk kebutuhan export

document.addEventListener("DOMContentLoaded", () => {
    console.log("DB.js: DOM Ready");
    const form = document.getElementById('formTransaksi');
    if (form) {
        form.addEventListener('submit', tambahTransaksi);
    }
});

async function tambahTransaksi(e) {
    e.preventDefault();
    console.log("DB.js: Mencoba simpan transaksi...");
    
    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return alert("Sesi habis!");

    const { error } = await supabaseClient
        .from('transaksi_keuangan')
        .insert([{ user_id: user.id, tipe, keterangan, nominal: parseInt(nominal) }]);

    if (error) {
        console.error("Gagal simpan:", error);
        alert(error.message);
    } else {
        document.getElementById('formTransaksi').reset();
        ambilDataTransaksi();
    }
}

async function ambilDataTransaksi() {
    console.log("DB.js: Mengambil data dari Supabase...");
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from('transaksi_keuangan')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Gagal tarik data:", error);
    } else {
        console.log("Data berhasil ditarik:", data.length, "item");
        dataTransaksi = data; 
        updateSummary(data);
        renderTabel(data);
    }
}

function updateSummary(data) {
    let masuk = 0, keluar = 0;
    data.forEach(item => {
        if (item.tipe === 'masuk') masuk += item.nominal;
        else keluar += item.nominal;
    });

    const format = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    document.getElementById('totalSaldo').innerText = format(masuk - keluar);
    document.getElementById('totalMasuk').innerText = format(masuk);
    document.getElementById('totalKeluar').innerText = format(keluar);
}

function renderTabel(data) {
    const tbody = document.getElementById('tabelData');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const tgl = new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        const formatNominal = new Intl.NumberFormat('id-ID').format(item.nominal);
        const warna = item.tipe === 'masuk' ? 'text-success' : 'text-danger';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-3">${tgl}</td>
            <td>${item.keterangan}</td>
            <td class="text-uppercase fw-bold ${warna}">${item.tipe}</td>
            <td class="${warna} fw-bold">Rp ${formatNominal}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-danger" onclick="hapusData(${item.id})">
                    Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function hapusData(id) {
    if (confirm("Hapus data ini, Bro?")) {
        console.log("DB.js: Menghapus ID", id);
        const { error } = await supabaseClient.from('transaksi_keuangan').delete().eq('id', id);
        if (!error) ambilDataTransaksi();
        else alert(error.message);
    }
}

// --- FUNGSI EXPORT (Gunakan window. agar bisa dipanggil dari HTML) ---
window.exportExcel = function() {
    console.log("Export: Excel process started");
    if (dataTransaksi.length === 0) return alert("Belum ada data untuk di-export, Bro!");
    
    const dataFormatted = dataTransaksi.map(item => ({
        Tanggal: new Date(item.created_at).toLocaleDateString('id-ID'),
        Keterangan: item.keterangan,
        Tipe: item.tipe.toUpperCase(),
        Nominal: item.nominal
    }));

    const ws = XLSX.utils.json_to_sheet(dataFormatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Keuangan");
    XLSX.writeFile(wb, "Laporan_Keuangan_Ivan.xlsx");
};

window.exportPDF = function() {
    console.log("Export: PDF process started");
    if (dataTransaksi.length === 0) return alert("Belum ada data untuk di-export, Bro!");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Laporan Keuangan Ivan #am", 14, 15);
    
    const rows = dataTransaksi.map(item => [
        new Date(item.created_at).toLocaleDateString('id-ID'),
        item.keterangan,
        item.tipe.toUpperCase(),
        `Rp ${item.nominal.toLocaleString('id-ID')}`
    ]);

    doc.autoTable({
        head: [['Tanggal', 'Keterangan', 'Tipe', 'Nominal']],
        body: rows,
        startY: 20
    });
    doc.save("Laporan_Keuangan_Ivan.pdf");
};

window.exportCSV = function() {
    console.log("Export: CSV process started");
    if (dataTransaksi.length === 0) return alert("Belum ada data untuk di-export, Bro!");
    
    const ws = XLSX.utils.json_to_sheet(dataTransaksi);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Laporan_Keuangan_Ivan.csv";
    link.click();
};
