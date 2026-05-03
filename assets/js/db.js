let dataTransaksi = [];
let isMasked = false;

document.addEventListener("DOMContentLoaded", () => {
    console.log("DB.js: Sistem Siap. Menyiapkan Fungsi Global...");

    // 1. Set Filter Waktu Default
    const skrg = new Date();
    document.getElementById('filterBulan').value = String(skrg.getMonth() + 1).padStart(2, '0');
    document.getElementById('filterTahun').value = skrg.getFullYear();
    
    // 2. Load Budget Limit dari Local Storage
    const savedLimit = localStorage.getItem('budgetLimit') || 0;
    document.getElementById('inputLimit').value = savedLimit;

    // 3. Pasang Event Listener Element Statis
    const form = document.getElementById('formTransaksi');
    if (form) form.addEventListener('submit', window.tambahTransaksi);

    const btnMask = document.getElementById('btnToggleMask');
    if (btnMask) btnMask.addEventListener('click', window.toggleMask);

    const inputLim = document.getElementById('inputLimit');
    if (inputLim) inputLim.addEventListener('input', window.setLimit);

    const filterBulan = document.getElementById('filterBulan');
    if (filterBulan) filterBulan.addEventListener('change', window.ambilDataTransaksi);

    const filterTahun = document.getElementById('filterTahun');
    if (filterTahun) filterTahun.addEventListener('change', window.ambilDataTransaksi);

    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportExcel) btnExportExcel.addEventListener('click', window.exportExcel);

    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) btnExportPDF.addEventListener('click', window.exportPDF);

    const btnUpdate = document.getElementById('btnUpdateTransaksi');
    if (btnUpdate) btnUpdate.addEventListener('click', window.updateTransaksi);

    // Load Data Awal
    setTimeout(() => { window.ambilDataTransaksi(); }, 500);
});

// --- CORE FUNCTIONS SUPABASE ---

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

        // Tutup Modal
        const modalEl = document.getElementById('modalEdit');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        window.ambilDataTransaksi();
    } catch (err) { alert("Gagal Update: " + err.message); }
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

window.bukaModalEdit = function(id) {
    const item = dataTransaksi.find(i => i.id == id);
    if (item) {
        document.getElementById('editId').value = item.id;
        document.getElementById('editTipe').value = item.tipe;
        document.getElementById('editKeterangan').value = item.keterangan;
        document.getElementById('editNominal').value = item.nominal;
        
        const modalEl = document.getElementById('modalEdit');
        // Fitur anti-freeze Bootstrap
        const instansiModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        instansiModal.show();
    }
};

// --- UI LOGIC ---

window.renderTabel = function(data) {
    const tbody = document.getElementById('tabelData');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const tgl = new Date(item.created_at).getDate();
        const nominalStr = isMasked ? "Rp •••" : `Rp ${item.nominal.toLocaleString('id-ID')}`;
        const warna = item.tipe === 'masuk' ? 'text-success' : 'text-danger';
        
        const tr = document.createElement('tr');
        // Menggunakan onclick eksplisit dengan pemanggilan object window
        tr.innerHTML = `
            <td class="ps-3 text-secondary">${tgl}</td>
            <td class="fw-bold">${item.keterangan}</td>
            <td class="${warna} fw-bold">${nominalStr}</td>
            <td class="text-center">
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="window.bukaModalEdit('${item.id}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="window.hapusData('${item.id}')">Hapus</button>
                </div>
            </td>
        `;
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

// --- EXPORT LOGIC ---

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
