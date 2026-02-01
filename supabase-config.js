// ============================================
// SUPABASE CONFIGURATION & SHARED HELPERS
// ============================================

// 1. Supabase Configuration
const SUPABASE_URL = 'https://xwqitpteemdvrycpcxgo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cWl0cHRlZW1kdnJ5Y3BjeGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDAzMDgsImV4cCI6MjA4NTI3NjMwOH0.ZEn9riWkZn-WW0wtH01AiujJH5EJmfps90oHVsRVeBI';

// Initialize Supabase Client
let supabase;
if (typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// 2. Global Constants
const ADMIN_EMAIL = "admin@pixel.com";
const ADMIN_PASS = "admin123";
const UPI_ID = "99logo@okaxis"; // Centralized UPI ID
const WORK_START_HOUR = 10; // 10 AM
const WORK_END_HOUR = 18;   // 6 PM
const TAT_HOURS_STANDARD = 48;
const TAT_HOURS_EXPRESS = 5;

// 3. Working Hours Helpers
function isWorkingHour(date) {
    const day = date.getDay(); // 0 = Sunday, 1-6 = Mon-Sat
    const hour = date.getHours();
    // Monday to Saturday, 10 AM to 6 PM
    return day >= 1 && day <= 6 && hour >= 10 && hour < 18;
}

function getNextWorkingHourStart(timestamp) {
    const date = new Date(timestamp);
    if (isWorkingHour(date)) return date;

    const day = date.getDay();
    const hour = date.getHours();

    if (day === 0) { // Sunday
        date.setDate(date.getDate() + 1);
        date.setHours(WORK_START_HOUR, 0, 0, 0);
    } else if (hour < WORK_START_HOUR) {
        date.setHours(WORK_START_HOUR, 0, 0, 0);
    } else if (hour >= WORK_END_HOUR) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() === 0) date.setDate(date.getDate() + 1);
        date.setHours(WORK_START_HOUR, 0, 0, 0);
    }
    return date;
}

function calculateWorkingHoursRemaining(startTimestamp, totalWorkingHours) {
    const adjustedStart = getNextWorkingHourStart(startTimestamp);
    const now = new Date();
    let workingHoursElapsed = 0;
    let currentTime = new Date(adjustedStart);

    while (currentTime < now) {
        if (isWorkingHour(currentTime)) {
            workingHoursElapsed += 1;
        }
        currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000);
    }

    const remaining = Math.max(0, totalWorkingHours - workingHoursElapsed);
    return { remaining, elapsed: workingHoursElapsed };
}

function formatTimeRemaining(hours) {
    const days = Math.floor(hours / (WORK_END_HOUR - WORK_START_HOUR));
    const remainingHours = Math.floor(hours % (WORK_END_HOUR - WORK_START_HOUR));
    const minutes = Math.floor((hours % 1) * 60);

    if (days > 0) return `${days}d ${remainingHours}h ${minutes}m`;
    return `${remainingHours}h ${minutes}m`;
}

// 4. Database Helper Functions
async function saveOrderToSupabase(orderData) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .insert([orderData])
            .select();
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error saving order:', error);
        return { success: false, error: error.message };
    }
}

async function saveUserToSupabase(userData) {
    try {
        const { data, error } = await supabase
            .from('users')
            .upsert([userData], { onConflict: 'email' })
            .select();
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error saving user:', error);
        return { success: false, error: error.message };
    }
}

async function getAllPortfolioItems() {
    try {
        const { data, error } = await supabase
            .from('portfolio')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return { success: false, error: error.message, data: [] };
    }
}

async function verifyUserLogin(email, password) {
    try {
        // 1. Check admin credentials
        if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
            return {
                success: true,
                data: { email: email, role: 'admin', name: 'Agency Admin' }
            };
        }
        
        // 2. Check database
        if (!supabase) throw new Error('Supabase not initialized');

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();
        
        if (error || !data) return { success: false, error: 'Invalid credentials' };
        return { success: true, data };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}
