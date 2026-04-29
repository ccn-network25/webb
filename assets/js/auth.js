// Ganti nilainya dengan yang kamu copy dari Supabase
const supabaseUrl = 'https://rlycxvfwipwrkgmsvgre.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWN4dmZ3aXB3cmtnbXN2Z3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzY0MzUsImV4cCI6MjA5MzAxMjQzNX0.TUazqPjJDUdPT_vyAGF6B9w4p9OnMaCd3emGxUqsAoM'; // Paste Anon Key kamu di sini

// Membuka jalur koneksi ke backend
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- WHITELIST EMAIL ---
// (MASUKKAN EMAIL GITHUB KAMU DI SINI)
const emailAdmin = "ccn.start@gmail.com";

async function loginWithGithub() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: window.location.origin + '/keuangan.html' 
        }
    });
    if (error) {
        console.error("Error saat login:", error.message);
        alert("Gagal login Bro: " + error.message);
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html'; // Sekarang logout kembalinya ke index.html
}

// SATPAM ZERO TRUST
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentPage = window.location.pathname;
    
    // Deteksi apakah user sedang berada di halaman depan (login)
    const isLoginPage = currentPage === '/' || currentPage.endsWith('index.html');

    // 1. JIKA BELUM LOGIN
    if (!session) {
        if (!isLoginPage) {
            // Kalau nyasar ke halaman dalam, tendang ke depan
            window.location.href = 'index.html'; 
        } else {
            // Kalau di depan, silakan tampilkan form loginnya
            document.body.style.display = 'block'; 
        }
        return;
    }

    // 2. JIKA SUDAH LOGIN
    if (session) {
        const userEmail = session.user.email;
        
        // Pengecekan Whitelist Admin
        if (userEmail.toLowerCase().trim() !== emailAdmin.toLowerCase().trim()) {
            alert("Akses Ditolak! Anda bukan admin.");
            await supabaseClient.auth.signOut();
            
            if (!isLoginPage) window.location.href = 'index.html';
            else document.body.style.display = 'block'; 
            
            return; 
        } else {
            // JIKA ADMIN ASLI
            if (isLoginPage) {
                // Udah login kok di halaman login? Otomatis lempar ke dalam!
                window.location.href = 'keuangan.html'; 
            } else {
                // Berada di halaman dalam yang benar, tampilkan halamannya
                document.body.style.display = 'block';
                // Jika halaman punya fungsi tarik data db, jalankan
                if (typeof ambilDataTransaksi === "function") {
                    ambilDataTransaksi();
                }
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btnLogin = document.getElementById('btnLoginGithub');
    if (btnLogin) {
        btnLogin.addEventListener('click', (e) => {
            e.preventDefault(); 
            loginWithGithub(); 
        });
    }

    const btnLogout = document.getElementById('logoutBtn');
    if (btnLogout) {
        btnLogout.addEventListener('click', logout); 
    }
});
