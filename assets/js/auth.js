// Ganti nilainya dengan yang kamu copy dari Supabase
const supabaseUrl = 'https://rlycxvfwipwrkgmsvgre.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWN4dmZ3aXB3cmtnbXN2Z3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzY0MzUsImV4cCI6MjA5MzAxMjQzNX0.TUazqPjJDUdPT_vyAGF6B9w4p9OnMaCd3emGxUqsAoM'; // Paste Anon Key kamu di sini

// Membuka jalur koneksi ke backend
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- WHITELIST EMAIL ---
// (MASUKKAN EMAIL GITHUB KAMU DI SINI)
// --- WHITELIST EMAIL ---
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

// ==========================================
// --- LOGIKA KEAMANAN: IDLE TIMER SESI ---
// ==========================================
let waktuSisa = 15 * 60; // 15 menit dikonversi jadi 900 detik

function mulaiTimerSesi() {
    // Fungsi berjalan setiap 1 detik (1000 milidetik)
    setInterval(() => {
        const display = document.getElementById('sessionTimer');
        if (!display) return; // Hanya jalan kalau ada tulisan "Sesi: 15:00" di layar

        waktuSisa--; // Kurangi 1 detik
        
        // Kalkulasi sisa menit dan detik
        let m = Math.floor(waktuSisa / 60);
        let s = waktuSisa % 60;
        
        // Tampilkan ke layar dengan format 00:00
        display.innerText = `Sesi: ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        
        // Ubah warna jadi merah kalau sisa waktu tinggal 1 menit (60 detik)
        if (waktuSisa <= 60) {
            display.className = "small text-danger fw-bold";
        } else {
            display.className = "small text-warning fw-bold";
        }

        // Kalau waktu habis
        if (waktuSisa <= 0) {
            waktuSisa = 9999; // Set ke angka tinggi biar alert gak muncul berkali-kali
            alert("Waktu sesi habis karena tidak ada aktivitas, Bro! Sistem melakukan auto-logout demi keamanan.");
            logout();
        }
    }, 1000);
}

// Fungsi ringan untuk mengembalikan waktu ke 15 menit
function resetWaktuSesi() {
    waktuSisa = 15 * 60;
}
// ==========================================


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
    }
    // ---------------------------------

    const btnLogout = document.getElementById('logoutBtn');
    if (btnLogout) btnLogout.addEventListener('click', logout);
    
    // --- JALANKAN TIMER ---
    mulaiTimerSesi();
    
    // Reset timer setiap kali ada klik mouse atau ketikan di keyboard
    window.addEventListener('click', resetWaktuSesi);
    window.addEventListener('keypress', resetWaktuSesi);
});
