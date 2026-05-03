window.dataTransaksi = [];
window.isMasked = false;

// --- 1. INISIALISASI & EVENT ---
document.addEventListener("DOMContentLoaded", () => {
    const skrg = new Date();
    const fBulan = document.getElementById('filterBulan');
    const fTahun = document.getElementById('filterTahun');
    if (fBulan) fBulan.value = String(skrg.getMonth() + 1).padStart(2, '0');
    if (fTahun) fTahun.value = skrg.getFullYear();
    // Set default input tanggal ke hari ini
    const elTanggal = document.getElementById('tanggal');
    if (elTanggal) {
        // Format YYYY-MM-DD
        elTanggal.value = skrg.toISOString().split('T')[0]; 
    }

    const iLim = document.getElementById('inputLimit');
    if (iLim) iLim.value = localStorage.getItem('budgetLimit') || 0;

    const form = document.getElementById('formTransaksi');
    if (form) form.addEventListener('submit', window.tambahTransaksi);

    // --- EVENT DELEGATION TABEL (ANTI-BLOKIR CSP) ---
    const tbody = document.getElementById('tabelData');
    if (tbody) {
        tbody.addEventListener('click', function(e) {
            // Cek apakah yang diklik adalah tombol Edit atau Hapus
            const btnEdit = e.target.closest('.btn-edit');
            const btnHapus = e.target.closest('.btn-hapus');

            if (btnEdit) {
                const id = btnEdit.getAttribute('data-id');
                window.bukaModalEdit(id);
            }
            
            if (btnHapus) {
                const id = btnHapus.getAttribute('data-id');
                window.hapusData(id);
            }
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
    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;
    const tanggal = document.getElementById('tanggal').value; // Ambil nilai tanggal

    // Tambahkan jam 12 siang (T12:00:00Z) agar tidak terjadi pergeseran hari karena zona waktu
    const createdAt = `${tanggal}T12:00:00.000Z`;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { error } = await supabaseClient
            .from('transaksi_keuangan')
            .insert([{ 
                user_id: user.id, 
                tipe, 
                keterangan, 
                nominal: parseInt(nominal),
                created_at: createdAt // Timpa waktu otomatis Supabase
            }]);

        if (error) throw error;
        
        document.getElementById('formTransaksi').reset();
        // Kembalikan lagi input tanggal ke hari ini setelah reset
        document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
        window.ambilDataTransaksi();
    } catch (err) { alert("Gagal Simpan: " + err.message); }
};

window.updateTransaksi = async function() {
    const id = document.getElementById('editId').value;
    const tipe = document.getElementById('editTipe').value;
    const keterangan = document.getElementById('editKeterangan').value;
    const nominal = document.getElementById('editNominal').value;
    const tanggal = document.getElementById('editTanggal').value;

    const createdAt = `${tanggal}T12:00:00.000Z`;

    try {
        const { error } = await supabaseClient
            .from('transaksi_keuangan')
            .update({ 
                tipe, 
                keterangan, 
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
        
        // Ekstrak tanggal (YYYY-MM-DD) dari created_at
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
        // onclick DIHAPUS, DIGANTI PAKAI CLASS (btn-edit/btn-hapus) & DATA-ID
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
