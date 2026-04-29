// Ganti nilainya dengan yang kamu copy dari Supabase
const supabaseUrl = 'https://rlycxvfwipwrkgmsvgre.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWN4dmZ3aXB3cmtnbXN2Z3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzY0MzUsImV4cCI6MjA5MzAxMjQzNX0.TUazqPjJDUdPT_vyAGF6B9w4p9OnMaCd3emGxUqsAoM'; // Paste Anon Key kamu di sini

// Membuka jalur koneksi ke backend
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- WHITELIST EMAIL ---
// (MASUKKAN EMAIL GITHUB KAMU DI SINI)
const emailAdmin = "email_github_kamu@gmail.com";

// 2. Fungsi Login pakai GitHub (Ini yang tadi kemungkinan hilang)
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

// 3. Fungsi Logout
async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html'; 
}

// 4. Fungsi Gatekeeper (Satpam Pengecek Sesi & Whitelist Email)
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentPage = window.location.pathname;

    // Proteksi jika paksa masuk tanpa login
    if (!session && currentPage.includes('keuangan.html')) {
        window.location.href = 'login.html';
        return;
    } 

    if (session) {
        const userEmail = session.user.email;
        
        if (userEmail !== emailAdmin) {
            // Jika penyusup, usir SEBELUM data sempat ditarik
            alert("Akses Ditolak! Sistem mengenali penyusup.");
            await supabaseClient.auth.signOut();
            
            if (!currentPage.includes('login.html')) {
                window.location.href = 'login.html';
            }
            return; 
        } else {
            // JIKA EMAIL COCOK (Admin Asli)
            if (currentPage.includes('keuangan.html')) {
                document.body.style.display = 'block'; // Tampilkan layar dashboard
                // Tarik data db
                if (typeof ambilDataTransaksi === "function") {
                    ambilDataTransaksi(); 
                }
            } else if (currentPage.includes('login.html')) {
                // Kalau admin buka halaman login padahal udah masuk, lempar ke dashboard
                window.location.href = 'keuangan.html';
            }
        }
    }
}

// 5. Pasang "Kabel" ke Tombol HTML saat web dimuat
document.addEventListener("DOMContentLoaded", () => {
    // Tombol Login
    const btnLogin = document.getElementById('btnLoginGithub');
    if (btnLogin) {
        btnLogin.addEventListener('click', (e) => {
            e.preventDefault(); 
            loginWithGithub(); // Jalankan fungsi login
        });
    }

    // Tombol Logout
    const btnLogout = document.getElementById('logoutBtn');
    if (btnLogout) {
        btnLogout.addEventListener('click', logout); // Jalankan fungsi logout
    }
});
