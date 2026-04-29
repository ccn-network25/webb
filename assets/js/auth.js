// Ganti nilainya dengan yang kamu copy dari Supabase
const supabaseUrl = 'https://rlycxvfwipwrkgmsvgre.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWN4dmZ3aXB3cmtnbXN2Z3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzY0MzUsImV4cCI6MjA5MzAxMjQzNX0.TUazqPjJDUdPT_vyAGF6B9w4p9OnMaCd3emGxUqsAoM'; // Paste Anon Key kamu di sini

// Membuka jalur koneksi ke backend
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. Fungsi Login pakai GitHub
async function loginWithGithub() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'github',
        options: {
            // Arahkan langsung ke dashboard setelah sukses login
            redirectTo: window.location.origin + '/keuangan.html' 
        }
    });
    if (error) {
        console.error("Error saat login:", error.message);
        alert("Gagal login Bro: " + error.message);
    }
}

// 3. Fungsi Logout
async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) {
        window.location.href = 'login.html'; // Tendang balik ke halaman login
    }
}

// 4. Fungsi Gatekeeper (Satpam Pengecek Sesi & Whitelist Email)
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentPage = window.location.pathname;

    // --- FITUR WHITELIST AKUN (HANYA KAMU YANG BISA MASUK) ---
    // Ganti email di bawah ini dengan email yang kamu pakai di akun GitHub kamu!
    const emailAdmin = "email_github_kamu@gmail.com"; 

    if (session) {
        const userEmail = session.user.email;
        
        // Cek apakah email yang login cocok dengan email admin
        if (userEmail !== emailAdmin) {
            alert("Akses Ditolak! Sistem mengenali penyusup. Anda akan dikeluarkan otomatis.");
            await supabaseClient.auth.signOut(); // Paksa logout
            window.location.href = 'login.html'; // Tendang ke luar
            return; // Hentikan proses pembacaan web
        }
    }
    // ---------------------------------------------------------

    // Kalau belum login tapi maksa masuk halaman keuangan
    if (!session && currentPage.includes('keuangan.html')) {
        window.location.href = 'login.html';
    } 
    // Kalau sudah login (dan emailnya benar) tapi iseng buka halaman login
    else if (session && currentPage.includes('login.html')) {
        window.location.href = 'keuangan.html';
    }
}

// 5. Sambungkan fungsi ke tombol di HTML saat web dimuat
document.addEventListener("DOMContentLoaded", () => {
    // Tombol Login
    const btnLogin = document.getElementById('btnLoginGithub');
    if (btnLogin) {
        btnLogin.addEventListener('click', (e) => {
            e.preventDefault(); // Mencegah form reload bawaan HTML
            loginWithGithub();
        });
    }

    // Tombol Logout
    const btnLogout = document.getElementById('logoutBtn');
    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }
});
