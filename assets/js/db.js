// Pastikan halaman sudah termuat sempurna
document.addEventListener("DOMContentLoaded", () => {
    const formTransaksi = document.getElementById('formTransaksi');
    if (formTransaksi) {
        formTransaksi.addEventListener('submit', tambahTransaksi);
    }
    // Langsung tarik data saat halaman dibuka
    ambilDataTransaksi();
});

// Fungsi untuk SIMPAN data (INSERT)
async function tambahTransaksi(e) {
    e.preventDefault(); // Mencegah reload halaman

    // Ambil nilai dari inputan form
    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;

    // Cek siapa user yang sedang login
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert("Sesi habis, silakan login ulang!");
        window.location.href = 'login.html';
        return;
    }

    // Tembak data ke tabel Supabase
    const { data, error } = await supabaseClient
        .from('transaksi_keuangan')
        .insert([
            { 
                user_id: user.id, 
                tipe: tipe, 
                keterangan: keterangan, 
                nominal: parseInt(nominal) 
            }
        ]);

    if (error) {
        console.error("Gagal simpan:", error);
        alert("Gagal nyimpen data Bro: " + error.message);
    } else {
        // Kalau sukses, kosongkan form dan tarik data terbaru
        document.getElementById('formTransaksi').reset();
        ambilDataTransaksi();
    }
}

// Fungsi untuk TARIK data (SELECT)
async function ambilDataTransaksi() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Tarik data khusus milik user ini, urutkan dari yang terbaru
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

// Fungsi untuk NAMPILIN data ke tabel HTML
function renderTabel(data) {
    const tbody = document.getElementById('tabelData');
    if (!tbody) return;

    tbody.innerHTML = ''; // Bersihkan isi tabel lama

    data.forEach((item) => {
        // Format tanggal biar rapi
        const tgl = new Date(item.created_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        // Format angka jadi Rupiah
        const rupiah = new Intl.NumberFormat('id-ID', { 
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(item.nominal);

        // Bikin warna hijau buat masuk, merah buat keluar
        const warna = item.tipe === 'masuk' ? 'text-success' : 'text-danger';
        const simbol = item.tipe === 'masuk' ? '+' : '-';

        // Masukkan baris ke tabel
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
