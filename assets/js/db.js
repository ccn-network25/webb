// Ganti nilainya dengan yang kamu copy dari Supabase
const supabaseUrl = 'https://rlycxvfwipwrkgmsvgre.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWN4dmZ3aXB3cmtnbXN2Z3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzY0MzUsImV4cCI6MjA5MzAxMjQzNX0.TUazqPjJDUdPT_vyAGF6B9w4p9OnMaCd3emGxUqsAoM'; // Paste Anon Key kamu di sini

// Membuka jalur koneksi ke backend
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);