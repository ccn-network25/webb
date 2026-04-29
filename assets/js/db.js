let dataTransaksi = [];
let isMasked = false;
let myChart = null;

// --- 1. INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DB.js: System initialized.");
    
    const form = document.getElementById('formTransaksi');
    if (form) {
        form.addEventListener('submit', tambahTransaksi);
    }
    
    // Inisialisasi Security Data & Timer
    document.getElementById('lastLoginTime').innerText = new Date().toLocaleString('id-ID');
    fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => { 
            document.getElementById('userIP').innerText = data.ip; 
        })
        .catch(() => { 
            document.getElementById('userIP').innerText = "Hidden/VPN"; 
        });

    startSessionTimer(15); // Auto-logout dalam 15 menit
});

// --- 2. CORE FUNCTIONS (CRUD) ---

// FUNGSI SIMPAN DATA (Amankan Transaksi)
async function tambahTransaksi(e) {
    e.preventDefault();
    console.log("DB.js: Mencoba mengamankan transaksi...");

    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return alert("Sesi habis, silakan login ulang!");

    // Validasi input sederhana
    if (!keterangan || !nominal) return alert("Isi semua data dulu, Bro!");

    const { error } = await supabaseClient
        .from('transaksi_keuangan')
        .insert([{ 
            user_id: user.id, 
            tipe: tipe, 
            keterangan: keterangan, 
            nominal: parseInt(nominal) 
        }]);

    if (error) {
        console.error("Gagal simpan:", error.message);
        alert("Gagal simpan data: " + error.message);
    } else {
        console.log("Transaksi berhasil diamankan ke database.");
        document.getElementById('formTransaksi').reset();
        ambilDataTransaksi(); // Tarik data terbaru untuk update tabel & chart
    }
}

// FUNGSI TARIK DATA DARI SUPABASE
async function ambilDataTransaksi() {
    console.log("DB.js: Menarik data ledger...");
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from('transaksi_keuangan')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fetch error:", error);
    } else {
        dataTransaksi = data;
        updateSummary(data);
        renderTabel(data);
        updateChart(data);
    }
}

// FUNGSI HAPUS DATA
window.hapusData = async function(id) {
    if (confirm("Hapus catatan transaksi ini secara permanen dari database?")) {
        const { error } = await supabaseClient
            .from('transaksi_keuangan')
            .delete()
            .eq('id', id);
            
        if (!error) {
            console.log("Data ID " + id + " berhasil dihapus.");
            ambilDataTransaksi();
        } else {
            alert("Gagal hapus: " + error.message);
        }
    }
};

// --- 3. UI & VISUALIZATION ---

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
    if (!tbody) return;
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const tgl = new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        const nominal = isMasked ? "Rp ••••" : `Rp ${item.nominal.toLocaleString('id-ID')}`;
        const warna = item.tipe === 'masuk' ? 'text-success' : 'text-danger';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-3 small text-secondary text-nowrap">${tgl}</td>
            <td class="fw-bold">${item.keterangan}</td>
            <td><span class="badge ${item.tipe === 'masuk' ? 'bg-success' : 'bg-danger'} text-uppercase" style="font-size:0.6rem">${item.tipe}</span></td>
            <td class="${warna} fw-bold text-nowrap">${nominal}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-link text-danger p-0" onclick="hapusData(${item.id})">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateChart(data) {
    const canvas = document.getElementById('cashFlowChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let masuk = data.filter(i => i.tipe === 'masuk').reduce((a, b) => a + b.nominal, 0);
    let keluar = data.filter(i => i.tipe === 'keluar').reduce((a, b) => a + b.nominal, 0);

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Masuk', 'Keluar'],
            datasets: [{
                data: [masuk, keluar],
                backgroundColor: ['#198754', '#dc3545'],
                hoverOffset: 4,
                borderWidth: 0
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { color: '#adb5bd', font: { size: 10 } } 
                }
            }
        }
    });
}

// --- 4. SECURITY & UTILS ---

function startSessionTimer(minutes) {
    let seconds = minutes * 60;
    const timerEl = document.getElementById('sessionTimer');
    const interval = setInterval(() => {
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        if(timerEl) timerEl.innerText = `Sesi: ${m}:${s < 10 ? '0' : ''}${s}`;
        if (seconds <= 0) {
            clearInterval(interval);
            logout(); // Fungsi logout ada di auth.js
        }
        seconds--;
    }, 1000);
}

window.toggleMask = function() {
    isMasked = !isMasked;
    const icon = document.getElementById('maskIcon');
    const text = document.getElementById('maskText');
    if(icon) icon.innerText = isMasked ? '🙈' : '👁️';
    if(text) text.innerText = isMasked ? 'Tampilkan' : 'Sembunyikan';
    ambilDataTransaksi(); // Re-render tabel & summary dengan masking
};

window.filterTabel = function() {
    const keyword = document.getElementById('searchData').value.toLowerCase();
    const filtered = dataTransaksi.filter(item => 
        item.keterangan.toLowerCase().includes(keyword)
    );
    renderTabel(filtered);
};

// --- 5. EXPORT LOGIC ---

window.exportExcel = function() {
    if (dataTransaksi.length === 0) return alert("Data masih kosong, Bro!");
    const ws = XLSX.utils.json_to_sheet(dataTransaksi.map(i => ({
        Tanggal: new Date(i.created_at).toLocaleString('id-ID'),
        Keterangan: i.keterangan,
        Tipe: i.tipe.toUpperCase(),
        Nominal: i.nominal
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Keuangan");
    XLSX.writeFile(wb, "Arsip_Keuangan_Ivan.xlsx");
};

window.exportPDF = function() {
    if (dataTransaksi.length === 0) return alert("Data masih kosong, Bro!");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Arsip Keuangan #am", 14, 15);
    const rows = dataTransaksi.map(i => [
        new Date(i.created_at).toLocaleDateString('id-ID'),
        i.keterangan,
        i.tipe.toUpperCase(),
        `Rp ${i.nominal.toLocaleString('id-ID')}`
    ]);
    doc.autoTable({ 
        head: [['Tanggal', 'Keterangan', 'Tipe', 'Nominal']], 
        body: rows, 
        startY: 20,
        theme: 'grid'
    });
    doc.save("Laporan_Keuangan_Ivan.pdf");
};
