// Ganti nilainya dengan yang kamu copy dari Supabase
const supabaseUrl = 'https://rlycxvfwipwrkgmsvgre.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWN4dmZ3aXB3cmtnbXN2Z3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzY0MzUsImV4cCI6MjA5MzAxMjQzNX0.TUazqPjJDUdPT_vyAGF6B9w4p9OnMaCd3emGxUqsAoM'; // Paste Anon Key kamu di sini

// Membuka jalur koneksi ke backend
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- WHITELIST EMAIL ---
// (MASUKKAN EMAIL GITHUB KAMU DI SINI)
const emailAdmin = "ccn.start@gmail.com";

// 1. Fungsi Login (Arahkan ke beranda setelah sukses)
async function loginWithGithub() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: window.location.origin + '/beranda.html' 
        }
    });
    if (error) alert("Gagal login Bro: " + error.message);
}

// 2. Fungsi Logout
async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html'; 
}

// 3. SATPAM GLOBAL (Middleware)
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentPath = window.location.pathname;
    
    // Cek apakah user sedang di pintu depan (Login Page)
    const isLoginPage = currentPath === '/' || currentPath.endsWith('index.html');

    // KONDISI A: BELUM LOGIN
    if (!session) {
        if (!isLoginPage) {
            // Jika coba akses halaman lain (beranda/portofolio/dll) tanpa login
            window.location.href = 'index.html'; 
        } else {
            // Jika di halaman login, tampilkan formnya
            document.body.style.display = 'block'; 
        }
        return;
    }

    // KONDISI B: SUDAH LOGIN
    if (session) {
        const userEmail = session.user.email;
        
        // Validasi Whitelist Email
        if (userEmail.toLowerCase().trim() !== emailAdmin.toLowerCase().trim()) {
            
            // HANYA munculkan alert 1x kalau posisinya di halaman dalam
            if (!isLoginPage) {
                alert("Akses Ditolak! Anda bukan admin.");
            }
            
            // Sapu bersih sisa sesi
            await supabaseClient.auth.signOut();
            
            // Tentukan arah setelah disapu bersih
            if (!isLoginPage) {
                window.location.href = 'index.html'; // Tendang ke depan
            } else {
                document.body.style.display = 'block'; // Tetap di depan, tampilkan form
            }
            return; 
        } 

        // JIKA ADMIN VALID
        if (isLoginPage) {
            window.location.href = 'beranda.html';
        } else {
            document.body.style.display = 'block';
            if (typeof ambilDataTransaksi === "function" && currentPath.includes('keuangan.html')) {
                ambilDataTransaksi();
            }
        }
    }

// Pemicu otomatis saat halaman selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
    checkSession(); 

    // Binding tombol
    const btnLogin = document.getElementById('btnLoginGithub');
    if (btnLogin) btnLogin.addEventListener('click', loginWithGithub);

    const btnLogout = document.getElementById('logoutBtn');
    if (btnLogout) btnLogout.addEventListener('click', logout);
});
