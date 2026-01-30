// ============================================
// SUPABASE CONFIGURATION & DATABASE HELPERS
// ============================================
// Add this file to your project and include it in all HTML files
// <script src="supabase-config.js"></script>

// Supabase Configuration
const SUPABASE_URL = 'https://xwqitpteemdvrycpcxgo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cWl0cHRlZW1kdnJ5Y3BjeGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDAzMDgsImV4cCI6MjA4NTI3NjMwOH0.ZEn9riWkZn-WW0wtH01AiujJH5EJmfps90oHVsRVeBI';

// Initialize Supabase Client (Using CDN)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseClient = supabase; // Alias for compatibility

// ============================================
// DATABASE HELPER FUNCTIONS
// ============================================

// 1. SAVE ORDER TO SUPABASE
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

// 2. SAVE USER TO SUPABASE
async function saveUserToSupabase(userData) {
    try {
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', userData.email)
            .single();
        
        if (existingUser) {
            return { success: true, data: existingUser, message: 'User already exists' };
        }
        
        // Insert new user
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select();
        
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error saving user:', error);
        return { success: false, error: error.message };
    }
}

// 3. GET ALL ORDERS
async function getAllOrders() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('timestamp', { ascending: false });
        
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching orders:', error);
        return { success: false, error: error.message, data: [] };
    }
}

// 4. GET ORDERS BY USER EMAIL
async function getOrdersByEmail(email) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_email', email)
            .order('timestamp', { ascending: false });
        
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching user orders:', error);
        return { success: false, error: error.message, data: [] };
    }
}

// 5. UPDATE ORDER STATUS
async function updateOrderStatus(orderId, newStatus) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)
            .select();
        
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error updating order:', error);
        return { success: false, error: error.message };
    }
}

// 6. VERIFY USER LOGIN
async function verifyUserLogin(email, password) {
    try {
        // Check admin credentials first
        if (email === 'admin@pixel.com' && password === 'admin123') {
            return {
                success: true,
                data: {
                    email: email,
                    role: 'admin',
                    name: 'Agency Admin'
                }
            };
        }
        
        // Check in database
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();
        
        if (error || !data) {
            return { success: false, error: 'Invalid credentials' };
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error verifying login:', error);
        return { success: false, error: error.message };
    }
}

// 7. DELETE ALL DATA (HARD RESET)
async function hardResetDatabase() {
    try {
        // Delete all orders
        await supabase.from('orders').delete().neq('id', '');
        
        // Delete all users except admin
        await supabase.from('users').delete().neq('email', 'admin@pixel.com');
        
        return { success: true, message: 'Database reset complete' };
    } catch (error) {
        console.error('Error resetting database:', error);
        return { success: false, error: error.message };
    }
}

// 8. UPDATE ORDER BY ORDER NUMBER
async function updateOrderByOrderNumber(orderNumber, updates) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .update(updates)
            .eq('order_number', orderNumber)
            .select();
        
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error updating order:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// PORTFOLIO MANAGEMENT FUNCTIONS
// ============================================

// 9. ADD PORTFOLIO ITEM TO SUPABASE
async function addPortfolioItemToSupabase(imageUrl) {
    try {
        const { data, error } = await supabase
            .from('portfolio')
            .insert([{ 
                image_url: imageUrl,
                created_at: new Date().toISOString()
            }])
            .select();
        
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error adding portfolio item:', error);
        return { success: false, error: error.message };
    }
}

// 10. GET ALL PORTFOLIO ITEMS
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

// 11. DELETE PORTFOLIO ITEM
async function deletePortfolioItem(itemId) {
    try {
        const { error } = await supabase
            .from('portfolio')
            .delete()
            .eq('id', itemId);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting portfolio item:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// MIGRATION HELPER (OPTIONAL)
// ============================================
// Use this to migrate existing localStorage data to Supabase
async function migrateLocalStorageToSupabase() {
    try {
        // Migrate Orders
        const localOrders = JSON.parse(localStorage.getItem('pixel_orders') || '[]');
        if (localOrders.length > 0) {
            for (const order of localOrders) {
                await saveOrderToSupabase({
                    order_number: order.id,
                    client_name: order.clientName,
                    contact: order.contact,
                    user_email: order.userEmail,
                    brand_name: order.brandName,
                    tagline: order.tagline || '',
                    niche: order.niche,
                    audience: order.audience || '',
                    colors: order.colors || '',
                    vibe: order.vibe,
                    ideas: order.ideas || order.notes || '',
                    package_type: order.packageType,
                    addons: order.addons || '',
                    tx_id: order.txId,
                    status: order.status,
                    date: order.date,
                    timestamp: order.timestamp
                });
            }
            console.log('Orders migrated successfully');
        }
        
        // Migrate Users
        const localUsers = JSON.parse(localStorage.getItem('pixel_users') || '[]');
        if (localUsers.length > 0) {
            for (const user of localUsers) {
                await saveUserToSupabase({
                    email: user.email,
                    password: user.password,
                    name: user.name,
                    role: user.role
                });
            }
            console.log('Users migrated successfully');
        }
        
        // Migrate Portfolio
        const localPortfolio = JSON.parse(localStorage.getItem('pixelPortfolio') || '[]');
        if (localPortfolio.length > 0) {
            for (const url of localPortfolio) {
                await addPortfolioItemToSupabase(url);
            }
            console.log('Portfolio migrated successfully');
        }
        
        return { success: true, message: 'Migration complete' };
    } catch (error) {
        console.error('Migration error:', error);
        return { success: false, error: error.message };
    }
}
