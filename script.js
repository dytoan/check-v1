// Cấu hình Supabase
const SUPABASE_URL = 'https://frpudnqjlbqlhuwcioju.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3U4y_wScZi6dY_BHrvyrXA_rdGq_BSP';

// Khởi tạo Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Hàm lấy thông tin IP từ API dự phòng
async function getIPInfo() {
    // API chính
    try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
            const data = await res.json();
            if (data && data.ip) return data;
        }
    } catch (e) {}

    // API dự phòng 1
    try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
            const data = await res.json();
            if (data && data.ip) {
                return {
                    ip: data.ip,
                    city: data.city,
                    country_name: data.country
                };
            }
        }
    } catch (e) {}

    // API dự phòng 2
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) {
            const data = await res.json();
            return { ip: data.ip, city: '-', country_name: '-' };
        }
    } catch (e) {}

    return { ip: 'Không xác định', city: '-', country_name: '-' };
}

// Hàm phân tích thiết bị từ User Agent
function parseDevice() {
    const ua = navigator.userAgent;
    let device = 'Máy tính';
    let os = 'Không xác định';
    let browser = 'Không xác định';

    // Phát hiện loại thiết bị
    if (/mobile/i.test(ua) && !/ipad/i.test(ua)) device = 'Điện thoại';
    if (/tablet|ipad/i.test(ua)) device = 'Máy tính bảng';

    // Phát hiện hệ điều hành
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac os/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    // Phát hiện trình duyệt
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/opr|opera/i.test(ua)) browser = 'Opera';
    else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';

    return { device, os, browser };
}

// Hàm lưu dữ liệu lên Supabase
async function saveToSupabase(payload) {
    try {
        const { data, error } = await supabaseClient
            .from('device_logs')
            .insert([payload])
            .select();
        if (error) {
            return { ok: false, msg: 'LỖI: ' + error.message };
        }
        return { ok: true, msg: 'ĐÃ LƯU THÀNH CÔNG (ID: ' + data[0].id + ')' };
    } catch (e) {
        return { ok: false, msg: 'LỖI KẾT NỐI: ' + e.message };
    }
}

// Hàm khởi tạo chính
async function init() {
    try {
        const ipInfo = await getIPInfo();
        const { device, os, browser } = parseDevice();

        // Tạo payload dữ liệu
        const payload = {
            ip: ipInfo.ip || 'Không xác định',
            city: ipInfo.city || '-',
            country: ipInfo.country_name || '-',
            device: device,
            os: os,
            browser: browser,
            screen: window.screen.width + 'x' + window.screen.height,
            language: navigator.language,
            user_agent: navigator.userAgent,
            created_at: new Date().toISOString()
        };

        // Hiển thị kết quả
        document.getElementById('ip').textContent = payload.ip;
        document.getElementById('location').textContent =
            payload.city + ', ' + payload.country;
        document.getElementById('device').textContent = payload.device;
        document.getElementById('browser').textContent = payload.browser;
        document.getElementById('os').textContent = payload.os;
        document.getElementById('screen').textContent = payload.screen;
        document.getElementById('language').textContent = payload.language;
        document.getElementById('time').textContent =
            new Date().toLocaleString('vi-VN');

        document.getElementById('loading').classList.add('hidden');
        document.getElementById('result').classList.remove('hidden');

        // Ghi log Supabase
        const result = await saveToSupabase(payload);
        document.getElementById('status').textContent = result.msg;
    } catch (e) {
        document.getElementById('loading').textContent =
            'LỖI: ' + e.message;
    }
}

// Chạy khi tải trang
window.addEventListener('load', init);