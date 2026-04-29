let dataTransaksi = [];
let isMasked = false;

// --- 1. INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DB.js: Memulai sistem...");
    
    // Set filter tanggal ke hari ini
    const skrg = new Date();
    document.getElementById('filterBulan').value = String(skrg.getMonth() + 1).padStart(2, '0');
    document.getElementById('filterTahun').value = skrg.getFullYear();
    
    const savedLimit = localStorage.getItem('budgetLimit') || 0;
    document.getElementById('inputLimit').value = savedLimit;

    const form = document.getElementById('formTransaksi');
    if (form) {
        form.addEventListener('submit', tambahTransaksi);
        console.log("DB.js: Form terdeteksi dan siap digunakan.");
    } else {
        console.error("DB.js: Form tidak ditemukan! Cek ID 'formTransaksi' di HTML.");
    }
    
    startSessionTimer(15);
    ambilDataTransaksi();
});

// --- 2. FUNGSI SIMPAN DATA (PROTECTED) ---
async function tambahTransaksi(e) {
    e.preventDefault();
    console.log("DB.js: Mencoba menyimpan transaksi baru...");

    try {
        const tipe = document.getElementById('tipe').value;
        const keterangan = document.getElementById('keterangan').value;
        const nominal = document.getElementById('nominal').value;

        // Cek Sesi User
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        
        if (userError || !user) {
            console.error("DB.js: Gagal mendapatkan user session.", userError);
            alert("Sesi kamu tidak valid. Coba logout dan login lagi, Bro!");
            return;
        }

        console.log("DB.js: User ID terdeteksi:", user.id);

        // Eksekusi Insert ke Supabase
        const { data, error } = await supabaseClient
            .from('transaksi_keuangan') // PASTIKAN NAMA TABEL DI SUPABASE SAMA PERSIS
            .insert([
                { 
                    user_id: user.id, 
                    tipe: tipe, 
                    keterangan: keterangan, 
                    nominal: parseInt(nominal) 
                }
            ])
            .select();

        if (error) {
            console.error("DB.js ERROR SUPABASE:", error.message, error.details);
            alert("Database Error: " + error.message);
        } else {
            console.log("DB.js SUCCESS: Data tersimpan!", data);
            document.getElementById('formTransaksi').reset();
            ambilDataTransaksi(); // Refresh tabel otomatis
        }
    } catch (err) {
        console.error("DB.js CRITICAL ERROR:", err);
        alert("Ada kesalahan sistem, cek Console!");
    }
}

// --- 3. AMBIL DATA DENGAN FILTER ---
async function ambilDataTransaksi() {
    console.log("DB.js: Mengambil riwayat transaksi...");
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const bulan = document.getElementById('filterBulan').value;
    const tahun = document.getElementById('filterTahun').value;
    
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
    } else {
        console.error("DB.js: Gagal menarik data.", error.message);
    }
}

// --- 4. LOGIKA UI (BUDGET & TABLE) ---
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
    const labelPersen = document.getElementById('labelPersen');
    const labelSisa = document.getElementById('labelSisa');

    if (limit > 0) {
        const persen = Math.min((keluar / limit) * 100, 100);
        if (bar) bar.style.width = persen + '%';
        if (labelPersen) labelPersen.innerText = Math.round(persen) + '% Terpakai';
        if (labelSisa) labelSisa.innerText = `Sisa: ${format(limit - keluar)}`;

        if (bar) {
            bar.className = "progress-bar progress-bar-striped progress-bar-animated ";
            if (persen < 60) bar.classList.add("bg-success");
            else if (persen < 90) bar.classList.add("bg-warning");
            else bar.classList.add("bg-danger");
        }
    }
}

function renderTabel(data) {
    const tbody = document.getElementById('tabelData');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach(item => {
        const tgl = new Date(item.created_at).getDate();
        const nominal = isMasked ? "Rp •••" : `Rp ${item.nominal.toLocaleString('id-ID')}`;
        const warna = item.tipe === 'masuk' ? 'text-success' : 'text-danger';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-3 text-secondary">${tgl}</td>
            <td class="fw-bold">${item.keterangan}</td>
            <td class="${warna} fw-bold">${nominal}</td>
            <td class="text-center">
                <button class="btn btn-sm text-danger" onclick="hapusData(${item.id})">×</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- 5. UTILS (SECURITY & EXPORT) ---
window.hapusData = async function(id) {
    if (confirm("Hapus data ini, Bro?")) {
        const { error } = await supabaseClient.from('transaksi_keuangan').delete().eq('id', id);
        if (!error) ambilDataTransaksi();
    }
};

window.setLimit = function() {
    const limit = document.getElementById('inputLimit').value;
    localStorage.setItem('budgetLimit', limit);
    updateSummary(dataTransaksi);
};

window.toggleMask = function() {
    isMasked = !isMasked;
    ambilDataTransaksi();
};

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

// Fungsi Export Excel & PDF (Pastikan Library ada di HTML)
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
