// Data Global
let dataTransaksi = [];
let isMasked = false;

document.addEventListener("DOMContentLoaded", () => {
    console.log("DB.js: Sistem dimulai...");
    
    // Set filter default
    const skrg = new Date();
    const fBul = document.getElementById('filterBulan');
    const fTah = document.getElementById('filterTahun');
    if(fBul) fBul.value = String(skrg.getMonth() + 1).padStart(2, '0');
    if(fTah) fTah.value = skrg.getFullYear();
    
    // Load limit
    const savedLimit = localStorage.getItem('budgetLimit') || 0;
    const iLim = document.getElementById('inputLimit');
    if(iLim) iLim.value = savedLimit;

    // Pasang Event Form
    const form = document.getElementById('formTransaksi');
    if (form) {
        form.addEventListener('submit', tambahTransaksi);
    }
    
    // Jalankan pengecekan sesi & ambil data
    setTimeout(() => {
        ambilDataTransaksi();
    }, 500); // Kasih jeda dikit biar auth.js siap duluan
});

// --- FUNGSI SENSOR (MASKING) ---
window.toggleMask = function() {
    console.log("DB.js: Toggle Sensor diklik");
    isMasked = !isMasked;
    
    const icon = document.getElementById('maskIcon');
    const text = document.getElementById('maskText');
    if(icon) icon.innerText = isMasked ? '🙈' : '👁️';
    if(text) text.innerText = isMasked ? 'Tampilkan' : 'Sembunyikan';
    
    // Langsung update tampilan tanpa narik data lagi
    updateSummary(dataTransaksi);
    renderTabel(dataTransaksi);
};

// --- FUNGSI SIMPAN DATA ---
async function tambahTransaksi(e) {
    e.preventDefault();
    console.log("DB.js: Mencoba simpan transaksi...");

    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("User tidak login!");

        const { error } = await supabaseClient
            .from('transaksi_keuangan')
            .insert([{ 
                user_id: user.id, 
                tipe: tipe, 
                keterangan: keterangan, 
                nominal: parseInt(nominal) 
            }]);

        if (error) throw error;

        console.log("DB.js: Berhasil simpan!");
        document.getElementById('formTransaksi').reset();
        ambilDataTransaksi();
    } catch (err) {
        console.error("DB.js Error Simpan:", err.message);
        alert("Gagal simpan: " + err.message);
    }
}

// --- FUNGSI AMBIL DATA ---
async function ambilDataTransaksi() {
    try {
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

        if (error) throw error;

        dataTransaksi = data;
        updateSummary(data);
        renderTabel(data);
    } catch (err) {
        console.error("DB.js Error Ambil Data:", err.message);
    }
}

// --- FUNGSI UI ---
function updateSummary(data) {
    let masuk = 0, keluar = 0;
    data.forEach(item => {
        if (item.tipe === 'masuk') masuk += item.nominal;
        else keluar += item.nominal;
    });

    const format = (num) => isMasked ? "Rp •••••" : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    const elTotal = document.getElementById('totalSaldo');
    if(elTotal) elTotal.innerText = format(masuk - keluar);

    const limit = parseInt(localStorage.getItem('budgetLimit')) || 0;
    const bar = document.getElementById('budgetBar');
    if (limit > 0 && bar) {
        const persen = Math.min((keluar / limit) * 100, 100);
        bar.style.width = persen + '%';
        bar.className = "progress-bar progress-bar-striped progress-bar-animated " + (persen < 60 ? "bg-success" : persen < 90 ? "bg-warning" : "bg-danger");
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
            <td>${item.keterangan}</td>
            <td class="${item.tipe === 'masuk' ? 'text-success' : 'text-danger'} fw-bold">${nominal}</td>
            <td class="text-center"><button class="btn btn-sm text-danger" onclick="hapusData(${item.id})">×</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- UTILS ---
window.hapusData = async function(id) {
    if (confirm("Hapus?")) {
        await supabaseClient.from('transaksi_keuangan').delete().eq('id', id);
        ambilDataTransaksi();
    }
};

window.setLimit = function() {
    const limit = document.getElementById('inputLimit').value;
    localStorage.setItem('budgetLimit', limit);
    updateSummary(dataTransaksi);
};
