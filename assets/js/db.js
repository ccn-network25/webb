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
