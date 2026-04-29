document.addEventListener("DOMContentLoaded", () => {
    const formTransaksi = document.getElementById('formTransaksi');
    if (formTransaksi) {
        formTransaksi.addEventListener('submit', tambahTransaksi);
    }
    // HAPUS baris ambilDataTransaksi(); dari sini! Biarkan kosong.
});

// Fungsi untuk SIMPAN data (INSERT) - (Tetap sama seperti sebelumnya)
async function tambahTransaksi(e) {
    e.preventDefault(); 
    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert("Sesi habis, silakan login ulang!");
        window.location.href = 'login.html';
        return;
    }

    const { error } = await supabaseClient
        .from('transaksi_keuangan')
        .insert([{ user_id: user.id, tipe: tipe, keterangan: keterangan, nominal: parseInt(nominal) }]);

    if (error) {
        console.error("Gagal simpan:", error);
        alert("Gagal nyimpen data Bro: " + error.message);
    } else {
        document.getElementById('formTransaksi').reset();
        ambilDataTransaksi(); // Tarik ulang data setelah sukses input
    }
}

// Fungsi untuk TARIK data (SELECT) - (Ubah sedikit untuk keamanan)
async function ambilDataTransaksi() {
    // Pastikan tabel kosong sebelum mulai narik
    const tbody = document.getElementById('tabelData');
    if (tbody) tbody.innerHTML = ''; 

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from('transaksi_keuangan')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Gagal tarik data:", error);
        return;
    }
    renderTabel(data);
}

// Fungsi untuk NAMPILIN data ke tabel HTML - (Tetap sama)
function renderTabel(data) {
    const tbody = document.getElementById('tabelData');
    if (!tbody) return;
    tbody.innerHTML = ''; 
    data.forEach((item) => {
        const tgl = new Date(item.created_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
        const rupiah = new Intl.NumberFormat('id-ID', { 
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(item.nominal);
        const warna = item.tipe === 'masuk' ? 'text-success' : 'text-danger';
        const simbol = item.tipe === 'masuk' ? '+' : '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${tgl}</td>
            <td>${item.keterangan}</td>
            <td class="${warna} fw-bold text-uppercase">${item.tipe}</td>
            <td class="${warna} fw-bold">${simbol} ${rupiah}</td>
        `;
        tbody.appendChild(tr);
    });
    // Data global untuk export
let dataTransaksi = [];

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('formTransaksi');
    if (form) form.addEventListener('submit', tambahTransaksi);
});

async function tambahTransaksi(e) {
    e.preventDefault();
    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return alert("Sesi habis!");

    const { error } = await supabaseClient
        .from('transaksi_keuangan')
        .insert([{ user_id: user.id, tipe, keterangan, nominal: parseInt(nominal) }]);

    if (error) alert(error.message);
    else {
        document.getElementById('formTransaksi').reset();
        ambilDataTransaksi();
    }
}

async function ambilDataTransaksi() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from('transaksi_keuangan')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (!error) {
        dataTransaksi = data; // Simpan ke global
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
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const tgl = new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        const formatNominal = new Intl.NumberFormat('id-ID').format(item.nominal);
        const warna = item.tipe === 'masuk' ? 'text-success' : 'text-danger';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-3">${tgl}</td>
            <td>${item.keterangan}</td>
            <td class="text-uppercase fw-bold ${warna}" style="font-size: 0.75rem;">${item.tipe}</td>
            <td class="${warna} fw-bold text-nowrap">Rp ${formatNominal}</td>
            <td class="text-center">
                <button class="btn btn-outline-danger btn-sm" onclick="hapusData(${item.id})">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function hapusData(id) {
    if (confirm("Hapus transaksi ini, Bro?")) {
        const { error } = await supabaseClient.from('transaksi_keuangan').delete().eq('id', id);
        if (!error) ambilDataTransaksi();
        else alert(error.message);
    }
}

// --- LOGIKA EXPORT ---
function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(dataTransaksi.map(({created_at, keterangan, tipe, nominal}) => ({
        Tanggal: new Date(created_at).toLocaleDateString('id-ID'),
        Keterangan: keterangan,
        Tipe: tipe,
        Nominal: nominal
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Keuangan");
    XLSX.writeFile(wb, "Laporan_Keuangan_Ivan.xlsx");
}

function exportCSV() {
    const ws = XLSX.utils.json_to_sheet(dataTransaksi);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Laporan_Keuangan_Ivan.csv";
    link.click();
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Laporan Transaksi Keuangan #am", 14, 15);
    
    const rows = dataTransaksi.map(item => [
        new Date(item.created_at).toLocaleDateString('id-ID'),
        item.keterangan,
        item.tipe.toUpperCase(),
        `Rp ${item.nominal.toLocaleString('id-ID')}`
    ]);

    doc.autoTable({
        head: [['Tanggal', 'Keterangan', 'Tipe', 'Nominal']],
        body: rows,
        startY: 20,
        theme: 'grid'
    });
    doc.save("Laporan_Keuangan_Ivan.pdf");
}
}
