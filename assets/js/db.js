let dataTransaksi = [];
let isMasked = false;

// 1. CEK APAKAH KUNCI SUPABASE SUDAH TERDETEKSI
function cekKoneksi() {
    if (typeof supabaseClient === 'undefined') {
        alert("🚨 ERROR KRITIKAL: db.js tidak bisa menemukan supabaseClient! Cek urutan script di HTML.");
        return false;
    }
    console.log("✅ db.js: Koneksi Supabase terdeteksi.");
    return true;
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("db.js: DOM Ready.");
    
    // Tunggu 1 detik supaya auth.js selesai inisialisasi
    setTimeout(() => {
        if(cekKoneksi()) {
            ambilDataTransaksi();
        }
    }, 1000);

    const form = document.getElementById('formTransaksi');
    if (form) {
        form.addEventListener('submit', tambahTransaksi);
        console.log("db.js: Event listener dipasang ke form.");
    }
});

// 2. FUNGSI SIMPAN (DENGAN LOG DETAIL)
async function tambahTransaksi(e) {
    e.preventDefault();
    console.log("db.js: Tombol Simpan diklik.");

    const tipe = document.getElementById('tipe').value;
    const keterangan = document.getElementById('keterangan').value;
    const nominal = document.getElementById('nominal').value;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert("Sesi habis, silakan login ulang!");
            return;
        }

        console.log("db.js: Mengirim data untuk user:", user.id);

        const { data, error } = await supabaseClient
            .from('transaksi_keuangan')
            .insert([{ 
                user_id: user.id, 
                tipe: tipe, 
                keterangan: keterangan, 
                nominal: parseInt(nominal) 
            }])
            .select();

        if (error) throw error;

        console.log("db.js: BERHASIL SIMPAN!", data);
        document.getElementById('formTransaksi').reset();
        ambilDataTransaksi(); 
        
    } catch (err) {
        console.error("db.js: GAGAL SIMPAN!", err.message);
        alert("Gagal simpan: " + err.message);
    }
}

// 3. FUNGSI AMBIL DATA
async function ambilDataTransaksi() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data, error } = await supabaseClient
            .from('transaksi_keuangan')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        dataTransaksi = data;
        updateSummary(data);
        renderTabel(data);
    } catch (err) {
        console.error("db.js: Gagal ambil data.", err.message);
    }
}

// 4. FUNGSI UI (SENSOR & TABLE)
window.toggleMask = function() {
    isMasked = !isMasked;
    const icon = document.getElementById('maskIcon');
    const text = document.getElementById('maskText');
    if(icon) icon.innerText = isMasked ? '🙈' : '👁️';
    if(text) text.innerText = isMasked ? 'Tampilkan' : 'Sembunyikan';
    updateSummary(dataTransaksi);
    renderTabel(dataTransaksi);
};

function updateSummary(data) {
    let masuk = 0, keluar = 0;
    data.forEach(item => {
        if (item.tipe === 'masuk') masuk += item.nominal;
        else keluar += item.nominal;
    });

    const format = (num) => isMasked ? "Rp •••••" : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    const elTotal = document.getElementById('totalSaldo');
    if(elTotal) elTotal.innerText = format(masuk - keluar);
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
