// Ganti nilainya dengan yang kamu copy dari Supabase
const supabaseUrl = 'https://rlycxvfwipwrkgmsvgre.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWN4dmZ3aXB3cmtnbXN2Z3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzY0MzUsImV4cCI6MjA5MzAxMjQzNX0.TUazqPjJDUdPT_vyAGF6B9w4p9OnMaCd3emGxUqsAoM'; // Paste Anon Key kamu di sini

// Membuka jalur koneksi ke backend
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- WHITELIST EMAIL ---
// (MASUKKAN EMAIL GITHUB KAMU DI SINI)
const emailAdmin = "ccn.start@gmail.com";

async function loginWithGithub() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: window.location.origin + '/beranda.html' 
        }
    });
    if (error) alert("Gagal login Bro: " + error.message);
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html'; 
}

async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentPath = window.location.pathname;
    
    const isLoginPage = currentPath === '/' || currentPath.endsWith('index.html');

    if (!session) {
        if (!isLoginPage) {
            window.location.href = 'index.html'; 
        } else {
            document.body.style.display = 'block'; 
        }
        return;
    }

    if (session) {
        const userEmail = session.user.email;
        
        if (userEmail.toLowerCase().trim() !== emailAdmin.toLowerCase().trim()) {
            if (!isLoginPage) {
                alert("Akses Ditolak! Anda bukan admin.");
            }
            await supabaseClient.auth.signOut();
            
            if (!isLoginPage) {
                window.location.href = 'index.html';
            } else {
                document.body.style.display = 'block';
            }
            return; 
        } 

        if (isLoginPage) {
            window.location.href = 'beranda.html';
        } else {
            document.body.style.display = 'block';
            if (typeof ambilDataTransaksi === "function" && currentPath.includes('keuangan.html')) {
                ambilDataTransaksi();
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkSession(); 

    // --- ALAT SADAP TOMBOL LOGIN ---
    const btnLogin = document.getElementById('btnLoginGithub');
    
    if (btnLogin) {
        console.log("STATUS: Tombol login berhasil dideteksi oleh JavaScript!"); 
        
        btnLogin.addEventListener('click', (e) => {
            e.preventDefault(); 
            console.log("STATUS: Tombol diklik! Menjalankan perintah login..."); 
            loginWithGithub(); 
        });
    } else {
        console.error("STATUS ERROR: JavaScript TIDAK BISA menemukan tombol login di HTML. Cek ID-nya!");
    }
    // ---------------------------------

    const btnLogout = document.getElementById('logoutBtn');
    if (btnLogout) btnLogout.addEventListener('click', logout);
}); // <--- PASTIKAN BARIS INI IKUT TERSALIN DAN BERADA PALING BAWAH
