// assets/js/db.js
window.dataTransaksi = [];
window.isMasked = false;

// --- 1. REGISTRASI FUNGSI GLOBAL ---
window.toggleMask = function() {
    window.isMasked = !window.isMasked;
    window.ambilDataTransaksi();
};

window.bukaModalEdit = function(id) {
    console.log("Membuka Modal untuk ID:", id);
    const item = window.dataTransaksi.find(i => i.id == id);
    if (item) {
        document.getElementById('editId').value = item.id;
        document.getElementById('editTipe').value = item.tipe;
        document.getElementById('editKeterangan').value = item.keterangan;
        document.getElementById('editNominal').value = item.nominal;
        
        const modalEl = document.getElementById('modalEdit');
        const instansiModal = new bootstrap.Modal(modalEl);
        instansiModal.show();
    }
};

window.hapusData = async function(id) {
    if (confirm("Hapus transaksi ini secara permanen?")) {
        const { error } = await supabaseClient.from('transaksi_keuangan').delete().eq('id', id);
        if (error) alert("Gagal hapus: " + error.message);
        window.ambilDataTransaksi();
    }
};

window.updateTransaksi = async function() {
    const id = document.getElementById('editId').value;
    const tipe = document.getElementById('editTipe').value;
    const keterangan = document.getElementById('editKeterangan').value;
    const nominal = document.getElementById('editNominal').value;

    const { error } = await supabaseClient
        .from('transaksi_keuangan')
        .update({ tipe, keterangan, nominal: parseInt(nominal) })
        .eq('id', id);

    if (error) {
        alert("Gagal update: " + error.message);
    } else {
        const modalEl = document.getElementById('modalEdit');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
        window.ambilDataTransaksi();
    }
};

// --- 2. LOGIKA UTAMA ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("db.js: Sistem Siap.");
    const form = document.getElementById('formTransaksi');
    if (form) form.addEventListener('submit', tambahTransaksi);
    
    // Set default filter
    const skrg = new Date();
    document.getElementById('filterBulan').value = String(skrg.getMonth() + 1).padStart(2, '0');
    document.getElementById('filterTahun').value = skrg.getFullYear();

    setTimeout(() => { window.ambilDataTransaksi(); }, 1000);
});

window.ambilDataTransaksi = async function() {
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

    if (!error) {
        window.dataTransaksi = data;
        updateSummary(data);
        renderTabel(data);
    }
};

async function tambahTransaksi(e) {
    e.preventDefault();
    const { data: { user } } = await supabaseClient.auth.getUser();
    const payload = {
        user_id: user.id,
        tipe: document.getElementById('tipe').value,
        keterangan: document.getElementById('keterangan').value,
        nominal: parseInt(document.getElementById('nominal').value)
    };

    const { error } = await supabaseClient.from('transaksi_keuangan').insert([payload]);
    if (error) alert(error.message);
    else {
        document.getElementById('formTransaksi').reset();
        window.ambilDataTransaksi();
    }
}

// --- 3. UI RENDERING ---
function renderTabel(data) {
    const tbody = document.getElementById('tabelData');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const tgl = new Date(item.created_at).getDate();
        const nominalStr = window.isMasked ? "Rp •••" : `Rp ${item.nominal.toLocaleString('id-ID')}`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-3 text-secondary">${tgl}</td>
            <td class="fw-bold">${item.keterangan}</td>
            <td class="${item.tipe === 'masuk' ? 'text-success' : 'text-danger'} fw-bold">${nominalStr}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="window.bukaModalEdit('${item.id}')">Edit</button>
                <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="window.hapusData('${item.id}')">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateSummary(data) {
    let keluar = 0, total = 0;
    data.forEach(i => {
        if(i.tipe === 'keluar') keluar += i.nominal;
        total += (i.tipe === 'masuk' ? i.nominal : -i.nominal);
    });

    const format = (num) => window.isMasked ? "Rp •••" : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    document.getElementById('totalSaldo').innerText = format(total);

    const limit = parseInt(localStorage.getItem('budgetLimit')) || 0;
    const bar = document.getElementById('budgetBar');
    if (limit > 0 && bar) {
        const persen = Math.min((keluar / limit) * 100, 100);
        bar.style.width = persen + '%';
        bar.className = "progress-bar progress-bar-striped progress-bar-animated " + (persen < 60 ? "bg-success" : persen < 90 ? "bg-warning" : "bg-danger");
    }
}
