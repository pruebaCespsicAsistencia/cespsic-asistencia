// ========== CESPSIC - SISTEMA DE ASISTENCIAS CON AUTENTICACIÓN HÍBRIDA ==========
// Versión: 3.1 Híbrido
// ✅ Android/Chrome: Firebase Auth (popup)
// 🔄 Safari/iOS: Google OAuth (redirect via backend)
// 📊 Firebase Firestore para datos
// 📁 Google Drive para evidencias
// ========================================================================================================

// ========== IMPORTS DE FIREBASE ==========
import { 
  db, 
  auth, 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  firebaseSignOut,
  setPersistence,
  browserSessionPersistence,
  inMemoryPersistence
} from './firebase-config.js';

// ========== IMPORTS DE SISTEMA DE LOGS ==========
import { 
  guardarAsistenciaConLogs,
  verificarDuplicado,
  registrarIntentoRecibido,
  registrarIntentoFallido,
  registrarAuditoria,
  obtenerEstadisticasLogs
} from './firebase-logger.js';

console.log('📊 Sistema de logs Firebase: CARGADO');

// ========== CONFIGURACIÓN ==========
import { CONFIG, AMBIENTE_ACTUAL } from './config.js';

const GOOGLE_SCRIPT_URL = CONFIG.GOOGLE_SCRIPT_URL;

console.log('='.repeat(70));
console.log('🔧 CONFIGURACIÓN FRONTEND CARGADA');
console.log('='.repeat(70));
console.log('🎯 Ambiente Activo:', AMBIENTE_ACTUAL);
console.log('📍 Google Script URL:', GOOGLE_SCRIPT_URL.substring(0, 50) + '...');
console.log('🔥 Firebase Project:', CONFIG.FIREBASE_CONFIG.projectId);
console.log('='.repeat(70));

// ========== DETECCIÓN DE DISPOSITIVO Y NAVEGADOR ==========
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isFirefox = /firefox/i.test(navigator.userAgent);
const isChrome = /chrome/i.test(navigator.userAgent) && !/edge/i.test(navigator.userAgent);
const isAndroid = /android/i.test(navigator.userAgent);

// 🎯 DETERMINAR MÉTODO DE AUTENTICACIÓN
const usarOAuthBackend = isSafari || isIOS; // Safari/iOS usa OAuth del backend
const usarFirebasePopup = !usarOAuthBackend; // Resto usa Firebase popup

function detectDesktop() {
    const ua = navigator.userAgent.toLowerCase();
    const isWindows = /windows nt/.test(ua);
    const isMacOS = /macintosh|mac os x/.test(ua) && navigator.maxTouchPoints <= 1;
    const isLinux = /linux/.test(ua) && !/android/.test(ua);
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    return (isWindows || isMacOS || isLinux) && !isMobile;
}

function getDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return 'Android';
    if (/iphone|ipod/.test(ua)) return 'iPhone';
    if (/ipad/.test(ua)) return 'iPad';
    if (/windows phone/.test(ua)) return 'Windows Phone';
    if (/windows nt/.test(ua)) return 'Windows Desktop';
    if (/macintosh|mac os x/.test(ua) && navigator.maxTouchPoints <= 1) return 'macOS Desktop';
    if (/linux/.test(ua) && !/android/.test(ua)) return 'Linux Desktop';
    if (navigator.maxTouchPoints > 0) return 'Tablet/Touch Device';
    return 'Desktop/Laptop';
}

const isDesktop = detectDesktop();
const deviceType = getDeviceType();

// ========== VARIABLES GLOBALES ==========
let currentLocation = null;
let currentUser = null;
let isAuthenticated = false;
let locationValid = false;
let locationAttempts = 0;
let selectedFiles = [];
let authInProgress = false;

const REQUIRED_ACCURACY = isDesktop ? 1000 : 50;
const REQUIRED_ACCURACY_OPTIMAL = isDesktop ? 300 : 30;
const MAX_LOCATION_ATTEMPTS = 3;
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ubicacionesUAS = [
    { name: "CESPSIC - Centro de Servicios Psicológicos", lat: 24.8278, lng: -107.3812, radius: 50 },
    { name: "Facultad de Psicología UAS", lat: 24.7993, lng: -107.3950, radius: 100 },
    { name: "Universidad Autónoma de Sinaloa - Campus Central", lat: 24.7990, lng: -107.3950, radius: 200 }
];

console.log(`📱 Dispositivo: ${deviceType}`);
console.log(`💻 Es Desktop: ${isDesktop ? 'Sí' : 'No'}`);
console.log(`📱 Es iOS: ${isIOS ? 'Sí' : 'No'}`);
console.log(`🌐 Navegador: ${isSafari ? 'Safari' : isChrome ? 'Chrome' : isFirefox ? 'Firefox' : 'Otro'}`);
console.log(`🔐 Método de Auth: ${usarOAuthBackend ? 'OAuth Backend (Safari/iOS)' : 'Firebase Popup (Chrome/Android)'}`);
console.log(`🔥 Firebase: Conectado`);

// ========================================================================================================
// 🆕 FUNCIÓN: Mostrar información del método de autenticación
// ========================================================================================================
function mostrarInfoMetodoAuth() {
    const authSection = document.getElementById('auth-section');
    let authMethodInfo = document.getElementById('auth-method-info');
    
    if (!authMethodInfo) {
        authMethodInfo = document.createElement('div');
        authMethodInfo.id = 'auth-method-info';
        authMethodInfo.style.cssText = `
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            border: 2px solid #2196f3;
            border-radius: 10px;
            padding: 15px;
            margin-top: 15px;
            color: #1565c0;
            font-size: 14px;
            line-height: 1.6;
        `;
        
        if (usarOAuthBackend) {
            authMethodInfo.innerHTML = `
                <strong>🍎 Usuario de Safari/iOS Detectado</strong><br><br>
                <strong>ℹ️ Método de autenticación adaptado:</strong><br>
                Para garantizar la mejor experiencia en Safari/iOS, utilizamos un método de autenticación especial que:<br>
                • ✅ No requiere desactivar seguimiento entre sitios<br>
                • ✅ No requiere limpiar caché constantemente<br>
                • ✅ Funciona de manera confiable en Safari<br><br>
                <strong>📱 Al hacer clic en "Iniciar Sesión":</strong><br>
                Se abrirá una nueva pestaña para autenticarse con Google de forma segura.
            `;
        } else {
            authMethodInfo.innerHTML = `
                <strong>🤖 Usuario de Chrome/Android Detectado</strong><br><br>
                <strong>✅ Método de autenticación:</strong><br>
                Su navegador usa autenticación rápida mediante ventana emergente (popup).<br>
                Este método es el más rápido y confiable para Chrome y Android.
            `;
        }
        
        const authTitle = document.getElementById('auth-title');
        authTitle.insertAdjacentElement('afterend', authMethodInfo);
    }
}

// ========================================================================================================
// 🔐 FUNCIONES DE AUTENTICACIÓN HÍBRIDA
// ========================================================================================================

async function requestAuthentication() {
    if (authInProgress) {
        console.log('⏳ Autenticación ya en progreso...');
        return;
    }
    
    authInProgress = true;
    updateSignInButton('Autenticando...', true);
    
    try {
        if (usarOAuthBackend) {
            await autenticarConOAuthBackend();
        } else {
            await autenticarConFirebasePopup();
        }
    } catch (error) {
        console.error('❌ Error en autenticación:', error);
        mostrarErrorAutenticacion(error);
        authInProgress = false;
        updateSignInButton('Iniciar Sesión con Google', false);
    }
}

async function autenticarConFirebasePopup() {
    try {
        console.log('🔥 Iniciando autenticación Firebase (popup)...');
        
        await setPersistence(auth, browserSessionPersistence);
        
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        console.log('✅ Autenticación Firebase exitosa');
        await procesarUsuarioAutenticado({
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            picture: user.photoURL || '',
            uid: user.uid,
            id: user.uid
        });
        
    } catch (error) {
        console.error('❌ Error en autenticación Firebase:', error);
        
        if (error.code === 'auth/popup-blocked') {
            throw new Error('POPUP_BLOCKED');
        } else if (error.code === 'auth/popup-closed-by-user') {
            throw new Error('POPUP_CLOSED');
        } else if (error.code === 'auth/cancelled-popup-request') {
            throw new Error('POPUP_CANCELLED');
        } else {
            throw error;
        }
    }
}

async function autenticarConOAuthBackend() {
    try {
        console.log('🔐 Iniciando autenticación OAuth (redirect)...');
        
        const authUrl = `${GOOGLE_SCRIPT_URL}?action=auth`;
        
        try {
            localStorage.setItem('cespsic_auth_return', window.location.href);
            localStorage.setItem('cespsic_auth_timestamp', new Date().toISOString());
        } catch (e) {
            console.warn('⚠️ No se pudo guardar estado en localStorage:', e);
        }
        
        console.log('🌐 Abriendo ventana de autenticación...');
        const authWindow = window.open(authUrl, 'oauth_window', 'width=600,height=700,scrollbars=yes');
        
        if (!authWindow) {
            throw new Error('POPUP_BLOCKED');
        }
        
        const checkWindowClosed = setInterval(async () => {
            if (authWindow.closed) {
                clearInterval(checkWindowClosed);
                console.log('🔄 Ventana de autenticación cerrada, verificando...');
                
                setTimeout(async () => {
                    await verificarAutenticacionOAuth();
                }, 1000);
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Error en autenticación OAuth:', error);
        throw error;
    }
}

async function verificarAutenticacionOAuth() {
    try {
        console.log('🔍 Verificando autenticación OAuth...');
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getUserInfo`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success && data.authenticated && data.user) {
            console.log('✅ Autenticación OAuth exitosa');
            await procesarUsuarioAutenticado(data.user);
        } else {
            console.log('⚠️ No se pudo verificar la autenticación');
            throw new Error('AUTH_VERIFICATION_FAILED');
        }
        
    } catch (error) {
        console.error('❌ Error verificando autenticación OAuth:', error);
        authInProgress = false;
        updateSignInButton('Iniciar Sesión con Google', false);
        mostrarErrorAutenticacion(error);
    }
}

async function procesarUsuarioAutenticado(userData) {
    try {
        currentUser = userData;
        isAuthenticated = true;
        authInProgress = false;
        
        await registrarAuditoria({
            tipo: 'autenticacion_exitosa',
            email: userData.email,
            metodo: usarOAuthBackend ? 'oauth_backend' : 'firebase_popup',
            navegador: isSafari ? 'Safari' : isChrome ? 'Chrome' : 'Otro',
            dispositivo: deviceType
        });
        
        document.getElementById('email').value = userData.email;
        document.getElementById('google_user_id').value = userData.id || userData.uid || '';
        
        mostrarUsuarioAutenticado();
        habilitarFormulario();
        
        setTimeout(() => {
            getCurrentLocation();
        }, 500);
        
        console.log('✅ Usuario procesado correctamente:', userData.email);
        
    } catch (error) {
        console.error('❌ Error procesando usuario:', error);
        throw error;
    }
}

function mostrarErrorAutenticacion(error) {
    let titulo = '❌ Error de Autenticación';
    let mensaje = '';
    let instrucciones = '';
    
    const errorType = error.message || error.toString();
    
    if (errorType.includes('POPUP_BLOCKED')) {
        titulo = '🚫 Ventana Bloqueada';
        mensaje = 'Su navegador bloqueó la ventana de autenticación.';
        
        if (usarOAuthBackend) {
            instrucciones = `
                <strong>📱 Instrucciones para Safari/iOS:</strong><br>
                1. Toque el icono de ajustes (AA) en la barra de direcciones<br>
                2. Seleccione "Permitir ventanas emergentes"<br>
                3. Vuelva a intentar la autenticación<br><br>
                <strong>💡 Alternativa:</strong> Use Chrome o Firefox en su lugar.
            `;
        } else {
            instrucciones = `
                <strong>🤖 Instrucciones para Chrome/Android:</strong><br>
                1. Toque el icono de bloqueo 🔒 en la barra de direcciones<br>
                2. Busque "Ventanas emergentes" y permítalas<br>
                3. Vuelva a intentar la autenticación
            `;
        }
        
    } else if (errorType.includes('POPUP_CLOSED')) {
        titulo = '⚠️ Autenticación Cancelada';
        mensaje = 'Cerró la ventana de autenticación antes de completar el proceso.';
        instrucciones = `
            <strong>🔄 Para continuar:</strong><br>
            Haga clic nuevamente en "Iniciar Sesión con Google" y complete el proceso de autenticación.
        `;
        
    } else if (errorType.includes('AUTH_VERIFICATION_FAILED')) {
        titulo = '⚠️ No se Pudo Verificar la Autenticación';
        mensaje = 'La autenticación pudo haber sido exitosa pero no pudimos verificarla.';
        instrucciones = `
            <strong>🔄 Soluciones:</strong><br>
            1. Recargue la página e intente nuevamente<br>
            2. Asegúrese de tener conexión a internet<br>
            3. Si el problema persiste, limpie la caché del navegador<br><br>
            <strong>📱 Safari/iOS:</strong> Ajustes → Safari → Borrar historial y datos<br>
            <strong>🤖 Chrome:</strong> Menú → Historial → Borrar datos de navegación
        `;
        
    } else if (errorType.includes('network')) {
        titulo = '🌐 Error de Conexión';
        mensaje = 'No se pudo conectar al servidor de autenticación.';
        instrucciones = `
            <strong>🔄 Verifique:</strong><br>
            1. Que tenga conexión a internet (WiFi o datos móviles)<br>
            2. Que el servidor no esté en mantenimiento<br>
            3. Intente nuevamente en unos momentos
        `;
        
    } else {
        mensaje = 'Ocurrió un error inesperado durante la autenticación.';
        instrucciones = `
            <strong>🔄 Soluciones generales:</strong><br>
            1. Verifique su conexión a internet<br>
            2. Recargue la página (F5 o ⌘+R)<br>
            3. Intente con otro navegador<br>
            4. Limpie la caché y cookies<br><br>
            <strong>📞 Si el problema persiste:</strong><br>
            Contacte a la coordinación con el siguiente código de error:<br>
            <code style="background: #f5f5f5; padding: 5px; border-radius: 5px; display: block; margin-top: 5px;">
            ${errorType}
            </code>
        `;
    }
    
    mostrarModalError(titulo, mensaje, instrucciones);
    
    registrarAuditoria({
        tipo: 'autenticacion_fallida',
        error: errorType,
        metodo: usarOAuthBackend ? 'oauth_backend' : 'firebase_popup',
        navegador: isSafari ? 'Safari' : isChrome ? 'Chrome' : 'Otro',
        dispositivo: deviceType
    });
}

function mostrarModalError(titulo, mensaje, instrucciones) {
    let overlay = document.getElementById('error-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'error-modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        ">
            <h2 style="color: #f5576c; margin-top: 0; font-size: 24px;">
                ${titulo}
            </h2>
            <p style="color: #555; line-height: 1.6; font-size: 16px;">
                ${mensaje}
            </p>
            <div style="
                background: #fff3cd;
                border: 2px solid #ff9800;
                border-radius: 10px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
                line-height: 1.8;
                font-size: 14px;
            ">
                ${instrucciones}
            </div>
            <button onclick="cerrarModalError()" style="
                background: linear-gradient(45deg, #667eea, #764ba2);
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
                width: 100%;
                margin-top: 10px;
            ">
                Entendido
            </button>
        </div>
    `;
    
    overlay.style.display = 'flex';
}

window.cerrarModalError = function() {
    const overlay = document.getElementById('error-modal-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// ========================================================================================================
// 🎨 FUNCIONES DE UI
// ========================================================================================================

function updateSignInButton(text, disabled) {
    const btn = document.getElementById('main-signin-btn');
    const textElement = document.getElementById('signin-btn-text');
    if (btn && textElement) {
        textElement.textContent = text;
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.6' : '1';
        btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    }
}

function mostrarUsuarioAutenticado() {
    document.getElementById('signin-button-container').style.display = 'none';
    
    const userInfo = document.getElementById('user-info');
    userInfo.style.display = 'flex';
    
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('user-name').textContent = currentUser.name || currentUser.email.split('@')[0];
    
    if (currentUser.picture) {
        document.getElementById('user-avatar').src = currentUser.picture;
    } else {
        document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || currentUser.email)}&background=667eea&color=fff&size=80`;
    }
    
    const authMethodInfo = document.getElementById('auth-method-info');
    if (authMethodInfo) {
        authMethodInfo.style.display = 'none';
    }
    
    showStatus('✅ Autenticado como: ' + currentUser.email, 'success');
}

function habilitarFormulario() {
    const formContainer = document.getElementById('form-container');
    formContainer.classList.remove('form-overlay');
    
    const submitBtn = document.getElementById('submit_btn');
    submitBtn.textContent = '⏳ Obteniendo ubicación GPS...';
    submitBtn.disabled = true;
}

async function signOut() {
    try {
        if (usarFirebasePopup) {
            await firebaseSignOut(auth);
        }
        
        currentUser = null;
        isAuthenticated = false;
        locationValid = false;
        currentLocation = null;
        
        try {
            localStorage.removeItem('cespsic_auth_return');
            localStorage.removeItem('cespsic_auth_timestamp');
        } catch (e) {
            console.warn('⚠️ Error limpiando localStorage:', e);
        }
        
        document.getElementById('user-info').style.display = 'none';
        document.getElementById('signin-button-container').style.display = 'block';
        document.getElementById('form-container').classList.add('form-overlay');
        
        const submitBtn = document.getElementById('submit_btn');
        submitBtn.textContent = '🔒 Autentíquese primero para continuar';
        submitBtn.disabled = true;
        
        resetLocationFields();
        showStatus('Sesión cerrada', 'success');
        
        console.log('✅ Sesión cerrada correctamente');
        
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
        showStatus('Error al cerrar sesión', 'error');
    }
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
}

function hideStatus() {
    const statusDiv = document.getElementById('status');
    statusDiv.style.display = 'none';
}

// ========================================================================================================
// 📍 FUNCIONES DE GEOLOCALIZACIÓN
// ========================================================================================================

function getCurrentLocation() {
    if (!isAuthenticated) {
        showStatus('Debe autenticarse primero', 'error');
        return;
    }
    
    if (locationAttempts >= MAX_LOCATION_ATTEMPTS) {
        showStatus('Se alcanzó el número máximo de intentos de ubicación', 'error');
        document.getElementById('retry_location_btn').style.display = 'block';
        return;
    }
    
    locationAttempts++;
    updateLocationStatus('loading', `Obteniendo ubicación GPS (intento ${locationAttempts}/${MAX_LOCATION_ATTEMPTS})...`, '');
    
    const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        handleLocationError,
        options
    );
}

function handleLocationSuccess(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    
    currentLocation = {
        latitude: lat,
        longitude: lng,
        accuracy: accuracy,
        timestamp: new Date().toISOString()
    };
    
    document.getElementById('latitude').value = lat;
    document.getElementById('longitude').value = lng;
    document.getElementById('precision_gps').value = `${Math.round(accuracy)}m`;
    
    const ubicacionDetectada = detectarUbicacionEspecifica(lat, lng);
    
    if (ubicacionDetectada.encontrada) {
        document.getElementById('ubicacion_detectada').value = ubicacionDetectada.nombre;
        document.getElementById('ubicacion_detectada').className = 'location-field success';
    } else {
        document.getElementById('ubicacion_detectada').value = "Ubicación externa a UAS";
        document.getElementById('ubicacion_detectada').className = 'location-field warning';
    }
    
    obtenerDireccionCompleta(lat, lng, ubicacionDetectada);
    
    const precisionField = document.getElementById('precision_gps');
    
    if (accuracy <= REQUIRED_ACCURACY_OPTIMAL) {
        precisionField.className = 'location-field success';
        locationValid = true;
        updateLocationStatus('success', '✅ Ubicación GPS obtenida con precisión óptima', 
            `Precisión: ${Math.round(accuracy)}m (Óptimo: ≤${REQUIRED_ACCURACY_OPTIMAL}m)`);
    } else if (accuracy <= REQUIRED_ACCURACY) {
        precisionField.className = 'location-field warning';
        locationValid = true;
        updateLocationStatus('success', '✅ Ubicación GPS obtenida con precisión aceptable', 
            `Precisión: ${Math.round(accuracy)}m (Requerido: ≤${REQUIRED_ACCURACY}m)`);
    } else {
        precisionField.className = 'location-field error';
        locationValid = false;
        updateLocationStatus('error', '❌ Precisión GPS insuficiente', 
            `Precisión actual: ${Math.round(accuracy)}m | Requerido: ≤${REQUIRED_ACCURACY}m${isDesktop ? ' (Desktop)' : ' (Móvil)'}`);
        document.getElementById('retry_location_btn').style.display = 'block';
    }
    
    updateSubmitButton();
}

function handleLocationError(error) {
    let errorMsg = '';
    let suggestion = '';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMsg = "Permiso de ubicación denegado";
            suggestion = "Active los permisos de ubicación en la configuración de su navegador";
            break;
        case error.POSITION_UNAVAILABLE:
            errorMsg = "Información de ubicación no disponible";
            suggestion = "Verifique que el GPS esté activado en su dispositivo";
            break;
        case error.TIMEOUT:
            errorMsg = "Tiempo de espera agotado";
            suggestion = "Intente nuevamente en un lugar con mejor señal GPS";
            break;
        default:
            errorMsg = "Error desconocido al obtener ubicación";
            suggestion = "Intente nuevamente o contacte al administrador";
    }
    
    updateLocationStatus('error', `❌ ${errorMsg}`, suggestion);
    document.getElementById('retry_location_btn').style.display = 'block';
}

function updateLocationStatus(type, message, details) {
    const statusDiv = document.getElementById('location_status');
    statusDiv.className = `location-status ${type}`;
    statusDiv.innerHTML = `
        <div class="status-message">${message}</div>
        ${details ? `<div class="status-details">${details}</div>` : ''}
    `;
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submit_btn');
    
    if (isAuthenticated && locationValid) {
        submitBtn.disabled = false;
        submitBtn.textContent = '📋 Registrar Asistencia';
        submitBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
    } else if (isAuthenticated && !locationValid) {
        submitBtn.disabled = true;
        submitBtn.textContent = '❌ Ubicación GPS insuficiente';
        submitBtn.style.background = '#ccc';
    } else {
        submitBtn.disabled = true;
        submitBtn.textContent = '🔒 Autentíquese primero para continuar';
        submitBtn.style.background = '#ccc';
    }
}

function detectarUbicacionEspecifica(lat, lng) {
    for (let ubicacion of ubicacionesUAS.sort((a, b) => a.radius - b.radius)) {
        const distancia = calcularDistancia(lat, lng, ubicacion.lat, ubicacion.lng);
        
        if (distancia <= ubicacion.radius) {
            return {
                encontrada: true,
                esUAS: true,
                nombre: ubicacion.name,
                distancia: Math.round(distancia)
            };
        }
    }
    
    return { encontrada: false, esUAS: false, nombre: "Ubicación externa" };
}

async function obtenerDireccionCompleta(lat, lng, ubicacionDetectada) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es&zoom=18`);
        const data = await response.json();
        
        const direccionField = document.getElementById('direccion_completa');
        
        if (data && data.display_name) {
            direccionField.value = data.display_name;
            direccionField.className = 'location-field';
            
            if (!ubicacionDetectada.esUAS) {
                actualizarUbicacionEspecifica(data);
            }
        } else {
            direccionField.value = 'Dirección no disponible';
            direccionField.className = 'location-field warning';
        }
    } catch (error) {
        const direccionField = document.getElementById('direccion_completa');
        direccionField.value = 'Error al obtener dirección';
        direccionField.className = 'location-field warning';
    }
}

function actualizarUbicacionEspecifica(direccionData) {
    const campoUbicacion = document.getElementById('ubicacion_detectada');
    const address = direccionData.address || {};
    
    let ubicacionEspecifica = '';
    
    if (address.house_number && address.road) {
        ubicacionEspecifica = `${address.road} ${address.house_number}`;
    } else if (address.road) {
        ubicacionEspecifica = address.road;
    } else if (address.neighbourhood || address.suburb) {
        ubicacionEspecifica = address.neighbourhood || address.suburb;
    } else if (address.city || address.town) {
        ubicacionEspecifica = address.city || address.town;
    } else {
        ubicacionEspecifica = "Ubicación no especificada";
    }
    
    campoUbicacion.value = ubicacionEspecifica;
}

function calcularDistancia(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

function resetLocationFields() {
    ['ubicacion_detectada', 'direccion_completa', 'precision_gps'].forEach(id => {
        document.getElementById(id).value = 'Se requiere ubicación GPS';
        document.getElementById(id).className = 'location-field';
    });
    document.getElementById('retry_location_btn').style.display = 'none';
    updateLocationStatus('loading', 'Autenticándose para obtener ubicación GPS', '');
}

// ========================================================================================================
// 📝 ENVÍO DE FORMULARIO Y GUARDADO
// ========================================================================================================

async function handleSubmit(event) {
    event.preventDefault();
    
    console.log('\n' + '='.repeat(70));
    console.log('🔥 GUARDANDO EN FIREBASE FIRESTORE');
    console.log('='.repeat(70));
    
    if (!isAuthenticated || !currentUser) {
        showStatus('❌ Debe autenticarse con Google', 'error');
        return;
    }
    
    if (!locationValid || !currentLocation) {
        showStatus('❌ Ubicación GPS requerida', 'error');
        return;
    }
    
    if (currentLocation.accuracy > REQUIRED_ACCURACY) {
        showStatus(`❌ Precisión GPS insuficiente: ${Math.round(currentLocation.accuracy)}m`, 'error');
        return;
    }
    
    if (!validateConditionalFields()) {
        return;
    }
    
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.textContent = '⏳ Guardando, espere...';
    
    try {
        console.log('📸 Procesando evidencias...');
        submitBtn.textContent = '📤 Subiendo evidencias a Drive...';
        const evidenciasUrls = await uploadEvidenciasToGoogleDrive();
        
        const registroID = generateRegistroID();
        const formData = new FormData(event.target);
        
        const asistenciaData = {
            registro_id: registroID,
            timestamp: serverTimestamp(),
            fecha_creacion: new Date().toLocaleString('es-MX', { 
                timeZone: 'America/Mazatlan',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }),
            fecha_creacion_iso: new Date().toISOString(), // Mantener ISO para compatibilidad
            
            email: currentUser.email,
            google_user_id: currentUser.id || currentUser.uid,
            authenticated_user_name: currentUser.name,
            
            nombre: formData.get('nombre'),
            apellido_paterno: formData.get('apellido_paterno'),
            apellido_materno: formData.get('apellido_materno'),
            nombre_completo: `${formData.get('nombre')} ${formData.get('apellido_paterno')} ${formData.get('apellido_materno')}`,
            
            tipo_estudiante: formData.get('tipo_estudiante'),
            modalidad: formData.get('modalidad'),
            
            fecha: formData.get('fecha'),
            hora: formData.get('hora'),
            tipo_registro: formData.get('tipo_registro'),
            permiso_detalle: formData.get('permiso_detalle') || '',
            otro_detalle: formData.get('otro_detalle') || '',
            
            ubicacion: {
                lat: currentLocation.latitude,
                lng: currentLocation.longitude,
                accuracy: currentLocation.accuracy,
                direccion: formData.get('direccion_completa'),
                lugar: formData.get('ubicacion_detectada'),
                precision_metros: Math.round(currentLocation.accuracy)
            },
            
            evidencias: evidenciasUrls,
            total_evidencias: evidenciasUrls.filter(e => e.uploadStatus === 'SUCCESS').length,
            carpeta_evidencias: generateStudentFolderName(),
            
            intervenciones_psicologicas: parseInt(formData.get('intervenciones_psicologicas')) || 0,
            grupos_edad: {
                ninos_ninas: parseInt(formData.get('ninos_ninas')) || 0,
                adolescentes: parseInt(formData.get('adolescentes')) || 0,
                adultos: parseInt(formData.get('adultos')) || 0,
                mayores_60: parseInt(formData.get('mayores_60')) || 0,
                familia: parseInt(formData.get('familia')) || 0
            },
            actividades: formData.getAll('actividades[]') || [],
            actividades_varias_texto: formData.get('actividades_varias_texto') || '',
            pruebas_psicologicas_texto: formData.get('pruebas_psicologicas_texto') || '',
            comentarios_adicionales: formData.get('comentarios_adicionales') || '',
            
            device_type: deviceType,
            is_desktop: isDesktop,
            gps_method: isDesktop ? 'IP/WiFi' : 'GPS',
            required_accuracy: REQUIRED_ACCURACY,
            device_info: getDeviceInfo(),
            version: '3.1 Híbrido'
        };
        
        console.log('📊 Datos preparados:', asistenciaData);
        
        submitBtn.textContent = '🔥 Guardando en Firebase...';
        console.log('🔥 Guardando en Firestore con logs y validaciones...');
        const resultado = await guardarAsistenciaConLogs(asistenciaData);
        
        console.log('✅✅✅ GUARDADO EXITOSO - Firestore ID:', resultado.docId);
        
        const hora = new Date().toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'});
        
        showStatus(`✅✅✅ ASISTENCIA REGISTRADA

Registro ID: ${registroID}
Usuario: ${currentUser.name}
Modalidad: ${asistenciaData.modalidad}
Ubicación: ${asistenciaData.ubicacion.lugar}
Hora: ${hora}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Guardado instantáneo en Firebase
📊 Firestore Document ID: ${resultado.docId}
⚡ Sin necesidad de verificación adicional
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'success');
        
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.textContent = originalText;
        
        setTimeout(() => {
            if (confirm(`✅ ASISTENCIA REGISTRADA CORRECTAMENTE\n\nRegistro ID: ${registroID}\nUsuario: ${currentUser.name}\nHora: ${hora}\n\n¿Desea registrar otra asistencia?`)) {
                resetFormOnly();
                getCurrentLocation();
                hideStatus();
            } else {
                hideStatus();
                signOut();
            }
        }, 5000);
        
    } catch (error) {
        console.error('❌ Error guardando en Firebase:', error);
        
        const esDuplicado = error.message.includes('DUPLICADO');
        
        let mensajeError = '';
        
        if (esDuplicado) {
            mensajeError = `⚠️ REGISTRO DUPLICADO
    
    ${error.message}
    
    Este registro ya fue guardado anteriormente.
    No es necesario volver a registrarlo.`;
        } else {
            mensajeError = `❌ ERROR: No se pudo guardar
    
    Error: ${error.message}
    
    Por favor:
    1. Verifique su conexión a Internet
    2. Verifique que todos los campos estén llenos correctamente
    3. Intente nuevamente
    
    Si el problema persiste, contacte al administrador.`;
        }
        
        showStatus(mensajeError, 'error');
        
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.textContent = originalText;
    }
}

function generateRegistroID() {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `REG_${timestamp}_${random}`;
}

function generateStudentFolderName() {
    const apellidoPaterno = document.getElementById('apellido_paterno').value || 'Sin_Apellido';
    const apellidoMaterno = document.getElementById('apellido_materno').value || 'Sin_Apellido';
    const nombre = document.getElementById('nombre').value || 'Sin_Nombre';
    
    return `${apellidoPaterno}_${apellidoMaterno}_${nombre}`.replace(/[^a-zA-Z0-9_]/g, '');
}

// ========================================================================================================
// 📸 FUNCIONES DE EVIDENCIAS
// ========================================================================================================

async function uploadEvidenciasToGoogleDrive() {
    const evidenciasInfo = [];
    
    if (selectedFiles.length === 0) {
        console.log('ℹ️ No hay evidencias para subir');
        return evidenciasInfo;
    }
    
    console.log(`\n📤 SUBIENDO ${selectedFiles.length} EVIDENCIAS A GOOGLE DRIVE`);
    
    const tipoRegistro = document.getElementById('tipo_registro').value;
    const erroresDetallados = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fullFileName = generateEvidenciaFileName(tipoRegistro, i);
        
        console.log(`\n📤 Subiendo evidencia ${i + 1}/${selectedFiles.length}: ${file.name}`);
        console.log(`   Tamaño: ${(file.size / 1024).toFixed(1)} KB`);
        console.log(`   Tipo: ${file.type}`);
        
        try {
            const base64Data = await fileToBase64(file);
            
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'action': 'uploadEvidencia',
                    'fileName': fullFileName,
                    'fileData': `data:${file.type};base64,${base64Data}`,
                    'mimeType': file.type,
                    'fileSize': file.size.toString(),
                    'userEmail': currentUser.email,
                    'studentFolder': generateStudentFolderName()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`   ✅ Subida exitosa: ${result.data.web_view_link}`);
                
                evidenciasInfo.push({
                    fileName: fullFileName,
                    originalName: file.name,
                    size: file.size,
                    fileId: result.data.file_id,
                    webViewLink: result.data.web_view_link,
                    webContentLink: result.data.web_content_link,
                    uploadTime: new Date().toISOString(),
                    uploadDuration: result.data.upload_duration,
                    uploadStatus: 'SUCCESS',
                    storage: 'Google Drive',
                    folder: result.data.folder
                });
                
                showEvidenciasStatus(`✅ ${i + 1}/${selectedFiles.length} evidencias subidas`, 'success');
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
            
        } catch (error) {
            console.error(`❌ Error subiendo ${file.name}:`, error);
            
            let errorDetalle = error.message || 'Error no especificado';
            
            if (error.message && error.message.includes('Failed to fetch')) {
                errorDetalle = 'Error de conexión: No se pudo conectar con Google Drive.';
            } else if (error.message && error.message.includes('NetworkError')) {
                errorDetalle = 'Error de red: Problema de conectividad.';
            } else if (error.message && error.message.includes('Timeout')) {
                errorDetalle = 'Tiempo de espera agotado: El servidor tardó demasiado en responder.';
            }
            
            evidenciasInfo.push({
                fileName: fullFileName,
                originalName: file.name,
                size: file.size,
                uploadTime: new Date().toISOString(),
                uploadStatus: 'FAILED',
                error: errorDetalle,
                errorType: error.name || 'Error',
                storage: 'Google Drive'
            });
            
            erroresDetallados.push(`${file.name}: ${errorDetalle}`);
            
            showEvidenciasStatus(`⚠️ Error en ${file.name}: ${errorDetalle}`, 'warning');
            
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        if (i < selectedFiles.length - 1) {
            console.log(`⏳ Esperando 2 segundos antes del siguiente archivo...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    const successCount = evidenciasInfo.filter(e => e.uploadStatus === 'SUCCESS').length;
    const failCount = evidenciasInfo.filter(e => e.uploadStatus === 'FAILED').length;
    
    console.log(`\n📊 RESUMEN DE SUBIDA:`);
    console.log(`   ✅ Exitosas: ${successCount}`);
    console.log(`   ❌ Fallidas: ${failCount}`);
    console.log(`   📁 Total: ${evidenciasInfo.length}`);
    
    if (failCount > 0) {
        const mensajeError = `❌ ERROR CRÍTICO: ${failCount} de ${evidenciasInfo.length} evidencias NO se pudieron subir:\n\n${erroresDetallados.join('\n')}\n\n⚠️ Debe corregir estos errores antes de guardar.`;
        showEvidenciasStatus(mensajeError, 'error');
        throw new Error(mensajeError);
    }
    
    if (successCount > 0) {
        showEvidenciasStatus(`✅ ${successCount} evidencia(s) subida(s) exitosamente`, 'success');
    }
    
    return evidenciasInfo;
}

function generateEvidenciaFileName(tipoRegistro, index) {
    const apellidoPaterno = document.getElementById('apellido_paterno').value || 'Sin_Apellido';
    const apellidoMaterno = document.getElementById('apellido_materno').value || 'Sin_Apellido';
    const nombre = document.getElementById('nombre').value || 'Sin_Nombre';
    const fecha = new Date();
    
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const año = fecha.getFullYear();
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minuto = String(fecha.getMinutes()).padStart(2, '0');
    const segundo = String(fecha.getSeconds()).padStart(2, '0');
    const consecutivo = String(index + 1).padStart(3, '0');
    
    const nombreLimpio = `${apellidoPaterno}_${apellidoMaterno}_${nombre}`.replace(/[^a-zA-Z0-9_]/g, '');
    const fechaFormateada = `${dia}_${mes}_${año}`;
    const horaFormateada = `${hora}_${minuto}_${segundo}`;
    
    return `${nombreLimpio}_${fechaFormateada}_${horaFormateada}_${tipoRegistro}_${consecutivo}`;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Archivo no válido'));
            return;
        }
        
        if (!file.type) {
            reject(new Error('Archivo sin tipo MIME'));
            return;
        }
        
        if (file.size === 0) {
            reject(new Error('Archivo vacío (0 bytes)'));
            return;
        }
        
        if (file.size > MAX_FILE_SIZE) {
            reject(new Error(`Archivo muy grande: ${(file.size/1024/1024).toFixed(1)}MB`));
            return;
        }
        
        console.log(`📄 Convirtiendo ${file.name} a Base64...`);
        
        const reader = new FileReader();
        
        reader.onload = () => {
            try {
                const result = reader.result;
                if (!result || typeof result !== 'string') {
                    reject(new Error('Error: resultado de lectura inválido'));
                    return;
                }
                
                const base64 = result.split(',')[1];
                if (!base64 || base64.length === 0) {
                    reject(new Error('Error: conversión Base64 falló'));
                    return;
                }
                
                console.log(`✅ Base64 generado: ${(base64.length/1024).toFixed(1)}KB`);
                resolve(base64);
            } catch (error) {
                console.error('❌ Error procesando Base64:', error);
                reject(new Error(`Error al procesar: ${error.message}`));
            }
        };
        
        reader.onerror = (error) => {
            console.error('❌ Error leyendo archivo:', error);
            reject(new Error(`Error al leer archivo: ${file.name}`));
        };
        
        reader.onabort = () => {
            console.error('❌ Lectura abortada');
            reject(new Error('Lectura de archivo abortada'));
        };
        
        try {
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('❌ Error iniciando lectura:', error);
            reject(new Error(`No se pudo leer el archivo: ${error.message}`));
        }
    });
}

function setupEvidenciasHandlers() {
    const evidenciasInput = document.getElementById('evidencias');
    
    evidenciasInput.addEventListener('change', function(e) {
        if (isIOS) {
            handleFileSelectionIOS(e.target.files);
        } else {
            handleFileSelection(e.target.files);
        }
    });
}

function handleFileSelection(files) {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];
    
    fileArray.forEach(file => {
        if (!file.type || !ALLOWED_FILE_TYPES.includes(file.type)) {
            errors.push(`${file.name}: Formato no válido`);
            return;
        }
        
        if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(1);
            errors.push(`${file.name}: ${sizeMB}MB (máx. 10MB)`);
            return;
        }
        
        validFiles.push(file);
    });
    
    if (selectedFiles.length + validFiles.length > MAX_FILES) {
        errors.push(`Máximo ${MAX_FILES} imágenes (ya tiene ${selectedFiles.length})`);
        showEvidenciasStatus(errors.join('<br>'), 'error');
        return;
    }
    
    if (errors.length > 0) {
        showEvidenciasStatus(errors.join('<br>'), 'error');
    }
    
    validFiles.forEach(file => {
        selectedFiles.push(file);
        addFilePreview(file, selectedFiles.length - 1);
    });
    
    if (!isIOS) {
        updateFileInput();
    }
    
    if (validFiles.length > 0) {
        showEvidenciasStatus(`${validFiles.length} imagen(es) agregada(s) correctamente.`, 'success');
    }
}

function handleFileSelectionIOS(files) {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];
    
    fileArray.forEach(file => {
        if (!file.type || !ALLOWED_FILE_TYPES.includes(file.type)) {
            errors.push(`${file.name}: Solo JPG, PNG, WEBP`);
            return;
        }
        
        if (file.size > MAX_FILE_SIZE) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(1);
            errors.push(`${file.name}: ${sizeMB}MB (máx. 10MB)`);
            return;
        }
        
        validFiles.push(file);
    });
    
    if (selectedFiles.length + validFiles.length > MAX_FILES) {
        errors.push(`Máximo ${MAX_FILES} imágenes (ya tiene ${selectedFiles.length})`);
        showEvidenciasStatus(errors.join('<br>'), 'error');
        return;
    }
    
    if (errors.length > 0) {
        showEvidenciasStatus(errors.join('<br>'), 'error');
    }
    
    validFiles.forEach(file => {
        selectedFiles.push(file);
        addFilePreview(file, selectedFiles.length - 1);
    });
    
    if (validFiles.length > 0) {
        showEvidenciasStatus(`${validFiles.length} imagen(es) agregada(s).`, 'success');
    }
}

function addFilePreview(file, index) {
    const preview = document.getElementById('evidencias-preview');
    const fileItem = document.createElement('div');
    fileItem.className = 'evidencia-item';
    fileItem.dataset.index = index;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        fileItem.innerHTML = `
            <img src="${e.target.result}" alt="Evidencia ${index + 1}">
            <div class="evidencia-info">
                ${file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}<br>
                <small>${(file.size / 1024).toFixed(1)} KB</small>
            </div>
            <button type="button" class="evidencia-remove" onclick="window.removeFile(${index})">×</button>
        `;
    };
    reader.readAsDataURL(file);
    preview.appendChild(fileItem);
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updatePreview();
    if (!isIOS) {
        updateFileInput();
    }
    showEvidenciasStatus(`Imagen removida. Total: ${selectedFiles.length}/${MAX_FILES}`, 'success');
}

window.removeFile = removeFile;

function updatePreview() {
    const preview = document.getElementById('evidencias-preview');
    preview.innerHTML = '';
    selectedFiles.forEach((file, index) => addFilePreview(file, index));
}

function updateFileInput() {
    if (isIOS) return;
    
    try {
        const input = document.getElementById('evidencias');
        const dt = new DataTransfer();
        selectedFiles.forEach(file => dt.items.add(file));
        input.files = dt.files;
    } catch (error) {
        console.warn('⚠️ Error actualizando input.files:', error);
    }
}

function showEvidenciasStatus(message, type) {
    const status = document.getElementById('evidencias-status');
    status.innerHTML = message;
    status.className = `evidencias-status ${type}`;
    if (type === 'success') {
        setTimeout(() => status.style.display = 'none', 5000);
    }
}

function resetEvidenciasSection() {
    selectedFiles = [];
    const input = document.getElementById('evidencias');
    input.value = '';
    document.getElementById('evidencias-preview').innerHTML = '';
    document.getElementById('evidencias-status').style.display = 'none';
}

// ========================================================================================================
// ✅ VALIDACIONES
// ========================================================================================================

function validateConditionalFields() {
    const tipoRegistro = document.getElementById('tipo_registro');
    const permisoDetalle = document.getElementById('permiso_detalle');
    const otroDetalle = document.getElementById('otro_detalle');
    
    if (tipoRegistro.value === 'permiso' && !permisoDetalle.value.trim()) {
        showStatus('Especifique el motivo del permiso.', 'error');
        permisoDetalle.focus();
        return false;
    }
    
    if (tipoRegistro.value === 'otro' && !otroDetalle.value.trim()) {
        showStatus('Especifique el tipo de registro.', 'error');
        otroDetalle.focus();
        return false;
    }
    
    const actividadesVarias = document.getElementById('actividades_varias');
    const actividadesVariasTexto = document.getElementById('actividades_varias_texto');
    
    if (actividadesVarias && actividadesVarias.checked && !actividadesVariasTexto.value.trim()) {
        showStatus('Describa las actividades varias realizadas.', 'error');
        actividadesVariasTexto.focus();
        return false;
    }
    
    const pruebasPsicologicas = document.getElementById('pruebas_psicologicas');
    const pruebasPsicologicasTexto = document.getElementById('pruebas_psicologicas_texto');
    
    if (pruebasPsicologicas && pruebasPsicologicas.checked && !pruebasPsicologicasTexto.value.trim()) {
        showStatus('Especifique qué pruebas psicológicas aplicó.', 'error');
        pruebasPsicologicasTexto.focus();
        return false;
    }
    
    const intervenciones = parseInt(document.getElementById('intervenciones_psicologicas').value) || 0;
    
    if (intervenciones > 0) {
        const ninos = parseInt(document.getElementById('ninos_ninas').value) || 0;
        const adolescentes = parseInt(document.getElementById('adolescentes').value) || 0;
        const adultos = parseInt(document.getElementById('adultos').value) || 0;
        const mayores = parseInt(document.getElementById('mayores_60').value) || 0;
        const familia = parseInt(document.getElementById('familia').value) || 0;
        
        const sumaGrupos = ninos + adolescentes + adultos + mayores + familia;
        
        if (sumaGrupos !== intervenciones) {
            showStatus(`Error: Total intervenciones (${intervenciones}) ≠ suma grupos (${sumaGrupos})`, 'error');
            return false;
        }
    }
    
    return true;
}

function resetFormOnly() {
    document.getElementById('attendanceForm').reset();
    initializeForm();
    
    document.querySelectorAll('.conditional-field').forEach(field => {
        field.classList.remove('show');
    });
    
    document.getElementById('evidencias_section').style.display = 'none';
    resetEvidenciasSection();
    
    document.getElementById('ubicacion_detectada').value = 'Obteniendo ubicación...';
    document.getElementById('direccion_completa').value = 'Consultando dirección...';
    document.getElementById('precision_gps').value = 'Calculando...';
    
    ['ubicacion_detectada', 'direccion_completa', 'precision_gps'].forEach(id => {
        document.getElementById(id).className = 'location-field';
    });
}

// ========================================================================================================
// 🎬 INICIALIZACIÓN Y EVENT LISTENERS
// ========================================================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM cargado, inicializando...');
    
    mostrarInfoMetodoAuth();
    
    initializeForm();
    setupEventListeners();
    setupEvidenciasHandlers();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    console.log('✅ Sistema inicializado correctamente');
});

// ========== FUNCIÓN PARA OBTENER FECHA/HORA CON TIMEZONE MAZATLÁN ==========
function getFechaMazatlan() {
    // Crear fecha actual en timezone America/Mazatlan
    const opciones = {
        timeZone: 'America/Mazatlan',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    
    const formatter = new Intl.DateTimeFormat('es-MX', opciones);
    const partes = formatter.formatToParts(new Date());
    
    const valores = {};
    partes.forEach(parte => {
        valores[parte.type] = parte.value;
    });
    
    return {
        year: valores.year,
        month: valores.month,
        day: valores.day,
        hour: valores.hour,
        minute: valores.minute
    };
}

function initializeForm() {
    // Obtener fecha/hora actual en timezone Mazatlán
    const fechaMazatlan = getFechaMazatlan();
    
    // Establecer fecha en formato yyyy-mm-dd para el input tipo date
    document.getElementById('fecha').value = `${fechaMazatlan.year}-${fechaMazatlan.month}-${fechaMazatlan.day}`;
    
    // Establecer hora en formato HH:mm para el input tipo time
    document.getElementById('hora').value = `${fechaMazatlan.hour}:${fechaMazatlan.minute}`;
    
    console.log('📅 Formulario inicializado con fecha/hora de Mazatlán:', 
        `${fechaMazatlan.day}/${fechaMazatlan.month}/${fechaMazatlan.year} ${fechaMazatlan.hour}:${fechaMazatlan.minute}`);
}

function updateCurrentTime() {
    // Mantener función legacy para compatibilidad
    const fechaMazatlan = getFechaMazatlan();
    document.getElementById('hora').value = `${fechaMazatlan.hour}:${fechaMazatlan.minute}`;
}

// Actualizar la hora cada minuto (opcional, puede comentarse si no se desea)
setInterval(() => {
    const fechaMazatlan = getFechaMazatlan();
    const horaActual = document.getElementById('hora').value;
    
    // Solo actualizar si el usuario no ha modificado manualmente la hora
    // (comparamos con la hora del sistema)
    if (!document.getElementById('hora').dataset.userModified) {
        document.getElementById('hora').value = `${fechaMazatlan.hour}:${fechaMazatlan.minute}`;
    }
}, 60000); // Actualizar cada minuto

// Marcar cuando el usuario modifica manualmente la hora
document.addEventListener('DOMContentLoaded', function() {
    const horaInput = document.getElementById('hora');
    const fechaInput = document.getElementById('fecha');
    
    if (horaInput) {
        horaInput.addEventListener('change', function() {
            this.dataset.userModified = 'true';
        });
    }
    
    if (fechaInput) {
        fechaInput.addEventListener('change', function() {
            this.dataset.userModified = 'true';
        });
    }
});

function setupEventListeners() {
    document.getElementById('tipo_registro').addEventListener('change', function() {
        const salidaSection = document.getElementById('salida_section');
        const evidenciasSection = document.getElementById('evidencias_section');
        const permisoSection = document.getElementById('permiso_detalle_section');
        const otroSection = document.getElementById('otro_detalle_section');
        const permisoTextarea = document.getElementById('permiso_detalle');
        const otroTextarea = document.getElementById('otro_detalle');
        
        salidaSection.classList.remove('show');
        evidenciasSection.style.display = 'none';
        permisoSection.classList.remove('show');
        otroSection.classList.remove('show');
        permisoTextarea.required = false;
        otroTextarea.required = false;
        permisoTextarea.value = '';
        otroTextarea.value = '';
        
        if (this.value !== 'salida') {
            resetEvidenciasSection();
        }
        
        if (this.value === 'salida') {
            salidaSection.classList.add('show');
            evidenciasSection.style.display = 'block';
        } else if (this.value === 'permiso' || this.value === 'noabrioclinica' || this.value === 'festivo') {
            permisoSection.classList.add('show');
            permisoTextarea.required = true;
        } else if (this.value === 'otro') {
            otroSection.classList.add('show');
            otroTextarea.required = true;
        }
    });

    document.getElementById('intervenciones_psicologicas').addEventListener('input', function() {
        const gruposSection = document.getElementById('grupos_edad_section');
        if (parseInt(this.value) > 0) {
            gruposSection.classList.add('show');
        } else {
            gruposSection.classList.remove('show');
        }
    });

    document.getElementById('actividades_varias').addEventListener('change', function() {
        const detalle = document.getElementById('actividades_varias_detalle');
        const textarea = document.getElementById('actividades_varias_texto');
        if (this.checked) {
            detalle.classList.add('show');
            textarea.required = true;
        } else {
            detalle.classList.remove('show');
            textarea.required = false;
            textarea.value = '';
        }
    });

    document.getElementById('pruebas_psicologicas').addEventListener('change', function() {
        const detalle = document.getElementById('pruebas_psicologicas_detalle');
        const textarea = document.getElementById('pruebas_psicologicas_texto');
        if (this.checked) {
            detalle.classList.add('show');
            textarea.required = true;
        } else {
            detalle.classList.remove('show');
            textarea.required = false;
            textarea.value = '';
        }
    });

    document.getElementById('retry_location_btn').addEventListener('click', function() {
        if (!isAuthenticated) {
            showStatus('Autentíquese primero.', 'error');
            return;
        }
        locationAttempts = 0;
        getCurrentLocation();
    });

    document.getElementById('attendanceForm').addEventListener('submit', handleSubmit);
}

function getDeviceInfo() {
    return {
        type: deviceType,
        isDesktop: isDesktop,
        isMobile: !isDesktop,
        isIOS: isIOS,
        isSafari: isSafari,
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        touchPoints: navigator.maxTouchPoints || 0,
        requiredAccuracy: REQUIRED_ACCURACY,
        optimalAccuracy: REQUIRED_ACCURACY_OPTIMAL,
        authMethod: usarOAuthBackend ? 'oauth_backend' : 'firebase_popup'
    };
}

// ========== EXPORTAR FUNCIONES GLOBALES ==========
window.requestAuthentication = requestAuthentication;
window.signOut = signOut;

// ========== LOG FINAL ==========
console.log('✅ Script de autenticación híbrida cargado completamente');
console.log('🔥 Firebase Firestore: Conectado');
console.log('📍 Google Drive: Para evidencias');
console.log('🔐 Método Auth:', usarOAuthBackend ? 'OAuth Backend' : 'Firebase Popup');
console.log('🎯 Versión: 3.1 Híbrido');
console.log('📋 Funciones disponibles:');
console.log('   - requestAuthentication()');
console.log('   - signOut()');
console.log('='.repeat(70));

// Actualizar botón periódicamente
setInterval(() => {
    if (isAuthenticated && locationValid) {
        const submitBtn = document.getElementById('submit_btn');
        if (submitBtn && submitBtn.disabled) {
            console.log('🔧 Auto-fix: Habilitando botón...');
            submitBtn.disabled = false;
            submitBtn.textContent = '📋 Registrar Asistencia';
            submitBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
        }
    }
}, 1000);
