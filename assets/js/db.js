let dataTransaksi = [];
let isMasked = false;

document.addEventListener("DOMContentLoaded", () => {
    console.log("DB.js: Inisialisasi Sistem Pamungkas...");

    // 1. Setup Nilai Default UI
    const skrg = new Date();
    const elBulan = document.getElementById('filterBulan');
    const elTahun = document.getElementById('filterTahun');
    if (elBulan) elBulan.value = String(skrg.getMonth() + 1).padStart(2, '0');
    if (elTahun) elTahun.value = skrg.getFullYear();
    
    const elLimit = document.getElementById('inputLimit');
    if (elLimit) elLimit.value = localStorage.getItem('budgetLimit') || 0;

    // 2. Pasang Event Listener (Anti-Bentrok)
    const form = document.getElementById('formTransaksi');
    if (form) form.addEventListener('submit', window.tambahTransaksi);

    const btnMask = document.getElementById('btnToggleMask');
    if (btnMask) btnMask.addEventListener('click', window.toggleMask);

    if (elLimit) elLimit.addEventListener('input', window.setLimit);
    if (elBulan) elBulan.addEventListener('change', window.ambilDataTransaksi);
    if (elTahun) elTahun.addEventListener('change', window.ambilDataTransaksi);

    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportExcel) btnExportExcel.addEventListener('click', window.exportExcel);

    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) btnExportPDF.addEventListener('click', window.exportPDF);

    // Pastikan tombol modal update bersih dari atribut lama
    const btnUpdate = document.getElementById('btnUpdateTransaksi');
    if (btnUpdate) {
        btnUpdate.removeAttribute('onclick'); 
        btnUpdate.addEventListener('click', window.updateTransaksi);
    }

    // 3. Tarik Data Awal
    setTimeout(() => { window.ambilDataTransaksi(); }, 500);
});


// --- FUNGSI CORE SUPABASE --- //

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
        window.updateSummary(data);
        window.renderTabel(data);
    } catch (err) {
        console.error("Gagal Ambil Data:", err.message);
    }
};

window.tambahTransaksi = async function(e) {
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
    } catch (err) { alert("Gagal Simpan: " + err.message); }
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

        const modalEl = document.getElementById('modalEdit');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        window.ambilDataTransaksi();
    } catch (err) { alert("Gagal Update: " + err.message); }
};

// Fungsi ini sekarang menerima objek utuh, lebih aman!
window.bukaModalEdit = function(item) {
    document.getElementById('editId').value = item.id;
    document.getElementById('editTipe').value = item.tipe;
    document.getElementById('editKeterangan').value = item.keterangan;
    document.getElementById('editNominal').value = item.nominal;
    
    const modalEl = document.getElementById('modalEdit');
    const instansiModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    instansiModal.show();
};

window.hapusData = async function(id) {
    if (confirm("Yakin mau hapus transaksi ini, Bro?")) {
        try {
            const { error } = await supabaseClient.from('transaksi_keuangan').delete().eq('id', id);
            if (error) throw error;
            window.ambilDataTransaksi();
        } catch (err) { alert("Gagal Hapus: " + err.message); }
    }
};


// --- UI LOGIC (SENJATA PAMUNGKAS) --- //

window.renderTabel = function(data) {
    const tbody = document.getElementById('tabelData');
    if (!tbody) return;
    tbody.innerHTML = ''; 
    
    data.forEach(item => {
        // Buat baris baru
        const tr = document.createElement('tr');
        
        // 1. Kolom Tanggal
        const tdTgl = document.createElement('td');
        tdTgl.className = 'ps-3 text-secondary';
        tdTgl.innerText = new Date(item.created_at).getDate();
        tr.appendChild(tdTgl);

        // 2. Kolom Keterangan
        const tdKet = document.createElement('td');
        tdKet.className = 'fw-bold';
        tdKet.innerText = item.keterangan;
        tr.appendChild(tdKet);

        // 3. Kolom Nominal
        const tdNominal = document.createElement('td');
        tdNominal.className = item.tipe === 'masuk' ? 'text-success fw-bold' : 'text-danger fw-bold';
        tdNominal.innerText = isMasked ? "Rp •••" : `Rp ${item.nominal.toLocaleString('id-ID')}`;
        tr.appendChild(tdNominal);

        // 4. Kolom Aksi (Tombol diciptakan via JS)
        const tdAksi = document.createElement('td');
        tdAksi.className = 'text-center';
        
        const divGroup = document.createElement('div');
        divGroup.className = 'btn-group';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-sm btn-outline-primary py-0 px-2';
        btnEdit.innerText = 'Edit';
        // Fungsi disuntikkan langsung tanpa teks HTML
        btnEdit.addEventListener('click', () => { window.bukaModalEdit(item); });

        const btnHapus = document.createElement('button');
        btnHapus.className = 'btn btn-sm btn-outline-danger py-0 px-2';
        btnHapus.innerText = 'Hapus';
        // Fungsi disuntikkan langsung tanpa teks HTML
        btnHapus.addEventListener('click', () => { window.hapusData(item.id); });

        // Susun elemennya
        divGroup.appendChild(btnEdit);
        divGroup.appendChild(btnHapus);
        tdAksi.appendChild(divGroup);
        tr.appendChild(tdAksi);

        // Masukkan baris ke dalam tabel
        tbody.appendChild(tr);
    });
};

window.updateSummary = function(data) {
    let keluar = 0, total = 0;
    data.forEach(i => {
        if(i.tipe === 'keluar') keluar += i.nominal;
        total += (i.tipe === 'masuk' ? i.nominal : -i.nominal);
    });

    const format = (num) => isMasked ? "Rp •••" : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    document.getElementById('totalSaldo').innerText = format(total);

    const limit = parseInt(localStorage.getItem('budgetLimit')) || 0;
    const bar = document.getElementById('budgetBar');
    if (limit > 0 && bar) {
        const persen = Math.min((keluar / limit) * 100, 100);
        bar.style.width = persen + '%';
        bar.className = "progress-bar progress-bar-striped progress-bar-animated " + (persen < 60 ? "bg-success" : persen < 90 ? "bg-warning" : "bg-danger");
        document.getElementById('labelPersen').innerText = Math.round(persen) + '%';
        document.getElementById('labelSisa').innerText = `Sisa: ${format(limit - keluar)}`;
    } else if (bar) {
        bar.style.width = '0%';
        document.getElementById('labelPersen').innerText = '0%';
        document.getElementById('labelSisa').innerText = 'Sisa: Rp 0';
    }
};

window.setLimit = function() {
    const val = document.getElementById('inputLimit').value;
    localStorage.setItem('budgetLimit', val);
    window.updateSummary(dataTransaksi);
};

window.toggleMask = function() {
    isMasked = !isMasked;
    const btnMask = document.getElementById('btnToggleMask');
    if(btnMask) btnMask.innerText = isMasked ? '🙈 Tampilkan' : '👁️ Sensor';
    
    window.updateSummary(dataTransaksi);
    window.renderTabel(dataTransaksi);
};

// --- EXPORT LOGIC --- //

window.exportExcel = function(e) {
    if(e) e.preventDefault();
    if (dataTransaksi.length === 0) return alert("Belum ada data!");
    const ws = XLSX.utils.json_to_sheet(dataTransaksi.map(i => ({ Tanggal: new Date(i.created_at).toLocaleDateString(), Keterangan: i.keterangan, Tipe: i.tipe.toUpperCase(), Nominal: i.nominal })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Keuangan");
    XLSX.writeFile(wb, "Laporan_Keuangan_Ivan.xlsx");
};

window.exportPDF = function(e) {
    if(e) e.preventDefault();
    if (dataTransaksi.length === 0) return alert("Belum ada data!");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Laporan Keuangan", 14, 15);
    const rows = dataTransaksi.map(i => [new Date(i.created_at).toLocaleDateString(), i.keterangan, i.tipe.toUpperCase(), `Rp ${i.nominal.toLocaleString('id-ID')}`]);
    doc.autoTable({ head: [['Tanggal', 'Keterangan', 'Tipe', 'Nominal']], body: rows, startY: 20 });
    doc.save("Laporan_Keuangan_Ivan.pdf");
};
