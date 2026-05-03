window.dataTransaksi = [];
window.isMasked = false;

// --- 1. INISIALISASI & EVENT ---
document.addEventListener("DOMContentLoaded", () => {
    const skrg = new Date();
    
    // Set default tanggal input form ke hari ini secara lokal
    const tglLokal = new Date(skrg.getTime() - (skrg.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const elTanggal = document.getElementById('tanggal');
    if (elTanggal) elTanggal.value = tglLokal;

    const fBulan = document.getElementById('filterBulan');
    const fTahun = document.getElementById('filterTahun');
    if (fBulan) fBulan.value = String(skrg.getMonth() + 1).padStart(2, '0');
    if (fTahun) fTahun.value = skrg.getFullYear();

    const iLim = document.getElementById('inputLimit');
    if (iLim) {
        iLim.value = localStorage.getItem('budgetLimit') || 0;
        iLim.addEventListener('input', window.setLimit);
    }

    const form = document.getElementById('formTransaksi');
    if (form) form.addEventListener('submit', window.tambahTransaksi);

    if (fBulan) fBulan.addEventListener('change', window.ambilDataTransaksi);
    if (fTahun) fTahun.addEventListener('change', window.ambilDataTransaksi);

    const btnUpdate = document.getElementById('btnUpdateTransaksi');
    if (btnUpdate) btnUpdate.addEventListener('click', window.updateTransaksi);

    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportExcel) btnExportExcel.addEventListener('click', window.exportExcel);

    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) btnExportPDF.addEventListener('click', window.exportPDF);

    // Event Delegation untuk tombol di dalam tabel
    const tbody = document.getElementById('tabelData');
    if (tbody) {
        tbody.addEventListener('click', function(e) {
            const btnEdit = e.target.closest('.btn-edit');
            const btnHapus = e.target.closest('.btn-hapus');
            if (btnEdit) window.bukaModalEdit(btnEdit.getAttribute('data-id'));
            if (btnHapus) window.hapusData(btnHapus.getAttribute('data-id'));
        });
    }

    setTimeout(() => { window.ambilDataTransaksi(); }, 500);
});


// --- 2. FUNGSI DATABASE (SUPABASE) ---
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
        
        window.dataTransaksi = data;
        window.updateSummary(data);
        window.renderTabel(data);
    } catch (err) {
        console.error("Gagal Ambil Data:", err.message);
    }
};

window.tambahTransaksi = async function(e) {
    if(e) e.preventDefault();
    const tanggalInput = document.getElementById('tanggal').value;
    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;

    // Paksa format waktu ke jam 12 siang supaya aman dari pergeseran zona waktu
    const createdAt = `${tanggalInput}T12:00:00.000Z`;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        // PUSH KE SUPABASE DENGAN TANGGAL MANUAL
        const { error } = await supabaseClient
            .from('transaksi_keuangan')
            .insert([{ 
                user_id: user.id, 
                tipe: tipe, 
                keterangan: keterangan, 
                nominal: parseInt(nominal),
                created_at: createdAt
            }]);

        if (error) throw error;
        
        document.getElementById('formTransaksi').reset();
        // Setel ulang input tanggal ke hari ini setelah di-reset
        const skrg = new Date();
        document.getElementById('tanggal').value = new Date(skrg.getTime() - (skrg.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        window.ambilDataTransaksi();
    } catch (err) { alert("Gagal Simpan: " + err.message); }
};

window.updateTransaksi = async function() {
    const id = document.getElementById('editId').value;
    const tanggalInput = document.getElementById('editTanggal').value;
    const tipe = document.getElementById('editTipe').value;
    const keterangan = document.getElementById('editKeterangan').value;
    const nominal = document.getElementById('editNominal').value;

    const createdAt = `${tanggalInput}T12:00:00.000Z`;

    try {
        const { error } = await supabaseClient
            .from('transaksi_keuangan')
            .update({ 
                tipe: tipe, 
                keterangan: keterangan, 
                nominal: parseInt(nominal),
                created_at: createdAt
            })
            .eq('id', id);

        if (error) throw error;

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


// --- 3. FUNGSI UI & INTERAKSI ---
window.bukaModalEdit = function(id) {
    const item = window.dataTransaksi.find(i => i.id == id);
    if (item) {
        document.getElementById('editId').value = item.id;
        document.getElementById('editTipe').value = item.tipe;
        document.getElementById('editKeterangan').value = item.keterangan;
        document.getElementById('editNominal').value = item.nominal;
        
        // Memasukkan tanggal lama ke dalam form edit
        const tgl = new Date(item.created_at).toISOString().split('T')[0];
        document.getElementById('editTanggal').value = tgl;
        
        const modalEl = document.getElementById('modalEdit');
        const instansiModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        instansiModal.show();
    }
};

window.renderTabel = function(data) {
    const tbody = document.getElementById('tabelData');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const tgl = new Date(item.created_at).getDate();
        const nominalStr = window.isMasked ? "Rp •••" : `Rp ${item.nominal.toLocaleString('id-ID')}`;
        const warna = item.tipe === 'masuk' ? 'text-success' : 'text-danger';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-3 text-secondary">${tgl}</td>
            <td class="fw-bold">${item.keterangan}</td>
            <td class="${warna} fw-bold">${nominalStr}</td>
            <td class="text-center">
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary py-0 px-2 btn-edit" data-id="${item.id}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2 btn-hapus" data-id="${item.id}">Hapus</button>
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

    const format = (num) => window.isMasked ? "Rp •••" : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    const elTotal = document.getElementById('totalSaldo');
    if(elTotal) elTotal.innerText = format(total);

    const limit = parseInt(localStorage.getItem('budgetLimit')) || 0;
    const bar = document.getElementById('budgetBar');
    const labelP = document.getElementById('labelPersen');
    const labelS = document.getElementById('labelSisa');

    if (limit > 0 && bar) {
        const persen = Math.min((keluar / limit) * 100, 100);
        bar.style.width = persen + '%';
        bar.className = "progress-bar progress-bar-striped progress-bar-animated " + (persen < 60 ? "bg-success" : persen < 90 ? "bg-warning" : "bg-danger");
        if(labelP) labelP.innerText = Math.round(persen) + '%';
        if(labelS) labelS.innerText = `Sisa: ${format(limit - keluar)}`;
    } else if (bar) {
        bar.style.width = '0%';
        if(labelP) labelP.innerText = '0%';
        if(labelS) labelS.innerText = 'Sisa: Rp 0';
    }
};

window.setLimit = function() {
    const val = document.getElementById('inputLimit').value;
    localStorage.setItem('budgetLimit', val);
    window.updateSummary(window.dataTransaksi);
};

window.toggleMask = function() {
    window.isMasked = !window.isMasked;
    window.updateSummary(window.dataTransaksi);
    window.renderTabel(window.dataTransaksi);
};


// --- 4. FUNGSI EXPORT ---
window.exportExcel = function(e) {
    if(e) e.preventDefault();
    if (window.dataTransaksi.length === 0) return alert("Belum ada data, Bro!");
    const ws = XLSX.utils.json_to_sheet(window.dataTransaksi.map(i => ({ Tanggal: new Date(i.created_at).toLocaleDateString(), Keterangan: i.keterangan, Tipe: i.tipe.toUpperCase(), Nominal: i.nominal })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Keuangan");
    XLSX.writeFile(wb, "Laporan_Keuangan.xlsx");
};

window.exportPDF = function(e) {
    if(e) e.preventDefault();
    if (window.dataTransaksi.length === 0) return alert("Belum ada data, Bro!");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Laporan Keuangan", 14, 15);
    const rows = window.dataTransaksi.map(i => [new Date(i.created_at).toLocaleDateString(), i.keterangan, i.tipe.toUpperCase(), `Rp ${i.nominal.toLocaleString('id-ID')}`]);
    doc.autoTable({ head: [['Tanggal', 'Keterangan', 'Tipe', 'Nominal']], body: rows, startY: 20 });
    doc.save("Laporan_Keuangan.pdf");
};
