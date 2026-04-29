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
}
