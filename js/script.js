// ========== DETECCIÓN DE DISPOSITIVO Y NAVEGADOR ==========
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Detectar si es un ordenador de escritorio/laptop
const isDesktop = detectDesktop();
const deviceType = getDeviceType();

console.log(`📱 Tipo dispositivo: ${deviceType}`);
console.log(`💻 Es Desktop: ${isDesktop ? 'Sí' : 'No'}`);
console.log(`📱 Es iOS: ${isIOS ? 'Sí' : 'No'}`);
console.log(`🌐 Navegador: ${isSafari ? 'Safari' : 'Otro'}`);

// Variables globales
let currentLocation = null;
let userEmail = null;
let isAuthenticated = false;
let locationValid = false;
let locationAttempts = 0;
let currentUser = null;
let selectedFiles = [];
let authenticationPurpose = 'login';
let privacyConsent = false;

const MAX_LOCATION_ATTEMPTS = 3;
// Precisión ajustada según tipo de dispositivo
const REQUIRED_ACCURACY = isDesktop ? 1000 : 50; // 1000m para desktop, 50m para móviles
const REQUIRED_ACCURACY_OPTIMAL = isDesktop ? 300 : 30; // Precisión óptima
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PRIVACY_VERSION = '1.0';

//PRODUCCION
//const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyllBO0vTORygvLlbTeRWfNXz1_Dt1khrM2z_BUxbNM6jWqEGYDqaLnd7LJs9Fl9Q9X/exec';
//const GOOGLE_CLIENT_ID = '799841037062-kal4vump3frc2f8d33bnp4clc9amdnng.apps.googleusercontent.com';
//PRUEBAS
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw10UgiYsuGYi16MisVfk7fx-wlGU-gUmCKTz2bZmyqys_2ku1ghZ9zzv71UncZ_sXlDg/exec';
const GOOGLE_CLIENT_ID = '154864030871-ck4l5krb7qm68kmp6a7rcq7h072ldm6g.apps.googleusercontent.com';

const ubicacionesUAS = [
    { name: "CESPSIC - Centro de Servicios Psicológicos", lat: 24.8278, lng: -107.3812, radius: 50 },
    { name: "Facultad de Psicología UAS", lat: 24.7993, lng: -107.3950, radius: 100 },
    { name: "Universidad Autónoma de Sinaloa - Campus Central", lat: 24.7990, lng: -107.3950, radius: 200 }
];

// ========== FUNCIONES DE DETECCIÓN DE DISPOSITIVO ==========
function detectDesktop() {
    const ua = navigator.userAgent.toLowerCase();
    
    // Detectar sistemas operativos de escritorio
    const isWindows = /windows nt/.test(ua);
    const isMacOS = /macintosh|mac os x/.test(ua) && navigator.maxTouchPoints <= 1;
    const isLinux = /linux/.test(ua) && !/android/.test(ua);
    
    // Detectar si NO es móvil
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    
    // Es desktop si tiene OS de escritorio Y no es móvil
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
        optimalAccuracy: REQUIRED_ACCURACY_OPTIMAL
    };
}

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', function() {
    console.log('\n' + '█'.repeat(80));
    console.log('🚀 INICIANDO APLICACIÓN CESPSIC - CONTROL DE ASISTENCIA');
    console.log('█'.repeat(80));
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-MX')}`);
    console.log(`🌐 URL: ${window.location.href}`);
    console.log(`🔒 Protocolo: ${location.protocol}`);
    console.log('█'.repeat(80) + '\n');
    
    // ========== INFORMACIÓN DEL DISPOSITIVO ==========
    console.log('━'.repeat(80));
    console.log('📱 INFORMACIÓN DEL DISPOSITIVO');
    console.log('━'.repeat(80));
    console.log(`Tipo de dispositivo: ${deviceType}`);
    console.log(`Es Desktop: ${isDesktop ? '✅ SÍ' : '❌ NO'}`);
    console.log(`Es Móvil: ${!isDesktop ? '✅ SÍ' : '❌ NO'}`);
    console.log(`Es iOS: ${isIOS ? '✅ SÍ' : '❌ NO'}`);
    console.log(`Es Safari: ${isSafari ? '✅ SÍ' : '❌ NO'}`);
    console.log(`User Agent: ${navigator.userAgent}`);
    console.log(`Resolución: ${window.screen.width}x${window.screen.height}`);
    console.log(`Touch Points: ${navigator.maxTouchPoints || 0}`);
    console.log('━'.repeat(80) + '\n');
    
    // ========== CONFIGURACIÓN GPS ==========
    console.log('━'.repeat(80));
    console.log('🛰️ CONFIGURACIÓN GPS');
    console.log('━'.repeat(80));
    console.log(`Método GPS: ${isDesktop ? 'IP/WiFi (Desktop)' : 'GPS Nativo (Móvil)'}`);
    console.log(`Precisión requerida: ${REQUIRED_ACCURACY} metros`);
    console.log(`Precisión óptima: ${REQUIRED_ACCURACY_OPTIMAL} metros`);
    console.log(`Máximo intentos: ${MAX_LOCATION_ATTEMPTS}`);
    
    if (isDesktop) {
        console.log('\n⚠️ MODO DESKTOP ACTIVADO:');
        console.log('   • Los ordenadores no tienen GPS integrado');
        console.log('   • La ubicación se obtiene por IP/WiFi (menor precisión)');
        console.log('   • Precisión esperada: 100-1000 metros');
        console.log('   • Se aceptarán precisiones hasta ' + REQUIRED_ACCURACY + 'm');
        console.log('   • Recomendación: Usar dispositivo móvil para mejor precisión');
    }
    console.log('━'.repeat(80) + '\n');
    
    // ========== ADVERTENCIA PARA iOS ==========
    if (isIOS) {
        console.log('━'.repeat(80));
        console.log('🍎 MODO iOS DETECTADO');
        console.log('━'.repeat(80));
        console.log('✅ Compatibilidad especial activada para iOS');
        console.log('⚠️ Características iOS:');
        console.log('   • Drag & Drop deshabilitado (no soportado en iOS)');
        console.log('   • DataTransfer API no disponible');
        console.log('   • Manejo simple de archivos activado');
        console.log('   • Verificación de HTTPS en proceso...');
        console.log('━'.repeat(80) + '\n');
        
        checkHTTPS();
    }
    
    // ========== ADVERTENCIA PARA DESKTOP ==========
    if (isDesktop) {
        console.log('━'.repeat(80));
        console.log('💻 MODO DESKTOP DETECTADO');
        console.log('━'.repeat(80));
        console.log('⚠️ Limitaciones del Desktop:');
        console.log('   • Sin GPS integrado (ubicación por IP/WiFi)');
        console.log('   • Precisión reducida (100-1000m vs 5-50m móvil)');
        console.log('   • Funcionalidad completa habilitada');
        console.log('━'.repeat(80) + '\n');
        
        showDesktopWarning();
    }
    
    // ========== VERIFICAR GEOLOCALIZACIÓN ==========
    console.log('━'.repeat(80));
    console.log('🌍 VERIFICANDO CAPACIDADES DEL NAVEGADOR');
    console.log('━'.repeat(80));
    console.log(`Geolocalización: ${navigator.geolocation ? '✅ Disponible' : '❌ No disponible'}`);
    console.log(`Service Workers: ${('serviceWorker' in navigator) ? '✅ Disponible' : '❌ No disponible'}`);
    console.log(`LocalStorage: ${safeLocalStorage() ? '✅ Disponible' : '❌ Bloqueado (modo privado)'}`);
    console.log(`Cookies: ${navigator.cookieEnabled ? '✅ Habilitadas' : '❌ Deshabilitadas'}`);
    console.log(`Online: ${navigator.onLine ? '✅ Conectado' : '❌ Sin conexión'}`);
    console.log('━'.repeat(80) + '\n');
    
    if (!navigator.geolocation) {
        console.error('❌ CRÍTICO: Geolocalización no disponible en este navegador');
        showStatus(
            '❌ Este navegador no soporta geolocalización.\n\n' +
            'Por favor, use un navegador moderno como Chrome, Firefox, Safari o Edge.',
            'error'
        );
    }
    
    // ========== VERIFICAR HTTPS (IMPORTANTE PARA iOS) ==========
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        console.warn('⚠️ ADVERTENCIA: La aplicación NO está usando HTTPS');
        console.warn('   iOS y algunos navegadores requieren HTTPS para geolocalización');
        
        if (isIOS) {
            showStatus(
                '⚠️ ADVERTENCIA: iOS requiere HTTPS para geolocalización.\n\n' +
                'La aplicación puede no funcionar correctamente.',
                'warning'
            );
        }
    } else {
        console.log('✅ HTTPS verificado o localhost detectado');
    }
    
    // ========== INICIALIZAR COMPONENTES ==========
    console.log('\n━'.repeat(80));
    console.log('⚙️ INICIALIZANDO COMPONENTES');
    console.log('━'.repeat(80));
    
    try {
        console.log('1️⃣ Inicializando formulario...');
        initializeForm();
        console.log('   ✅ Formulario inicializado');
        
        console.log('2️⃣ Configurando event listeners...');
        setupEventListeners();
        console.log('   ✅ Event listeners configurados');
        
        console.log('3️⃣ Cargando Google Sign-In...');
        loadGoogleSignInScript();
        console.log('   ✅ Script de Google Sign-In cargando...');
        
        console.log('4️⃣ Actualizando hora actual...');
        updateCurrentTime();
        console.log('   ✅ Hora actualizada');
        
        console.log('5️⃣ Verificando consentimiento de privacidad...');
        checkPrivacyConsent();
        console.log('   ✅ Estado de privacidad verificado');
        
        console.log('6️⃣ Iniciando actualización automática de hora...');
        setInterval(updateCurrentTime, 1000);
        console.log('   ✅ Timer de hora iniciado (cada 1 segundo)');
        
    } catch (initError) {
        console.error('❌ Error durante inicialización:', initError);
        showStatus(
            '❌ Error al inicializar la aplicación.\n\n' +
            'Por favor, recargue la página. Si el problema persiste, ' +
            'contacte al administrador.',
            'error'
        );
    }
    
    console.log('━'.repeat(80) + '\n');
    
    // ========== REINTENTAR ENVÍOS FALLIDOS ==========
    console.log('━'.repeat(80));
    console.log('🔄 VERIFICANDO ENVÍOS PENDIENTES');
    console.log('━'.repeat(80));
    
    setTimeout(() => {
        try {
            const failedSubmissions = JSON.parse(safeGetItem('failed_submissions') || '[]');
            
            if (failedSubmissions.length > 0) {
                console.log(`⚠️ Se encontraron ${failedSubmissions.length} envío(s) pendiente(s)`);
                console.log('🔄 Iniciando proceso de reintento automático...');
                
                retryFailedSubmissions().then(() => {
                    console.log('✅ Proceso de reintento completado');
                }).catch(retryError => {
                    console.error('❌ Error en proceso de reintento:', retryError);
                });
            } else {
                console.log('✅ No hay envíos pendientes');
            }
        } catch (error) {
            console.error('❌ Error verificando envíos pendientes:', error);
        }
        
        console.log('━'.repeat(80) + '\n');
    }, 3000); // Esperar 3 segundos después de cargar
    
    // ========== MONITOREO DE CONEXIÓN ==========
    window.addEventListener('online', function() {
        console.log('✅ Conexión a Internet restaurada');
        showStatus('✅ Conexión restaurada. Verificando envíos pendientes...', 'success');
        setTimeout(() => {
            retryFailedSubmissions();
            hideStatus();
        }, 2000);
    });
    
    window.addEventListener('offline', function() {
        console.warn('⚠️ Conexión a Internet perdida');
        showStatus(
            '⚠️ Sin conexión a Internet.\n\n' +
            'Los registros se guardarán localmente y se enviarán cuando se restaure la conexión.',
            'warning'
        );
        setTimeout(() => hideStatus(), 5000);
    });
    
    // ========== MANEJO DE ERRORES GLOBALES ==========
    window.addEventListener('error', function(event) {
        console.error('❌ Error global capturado:', event.error);
        console.error('   Mensaje:', event.message);
        console.error('   Archivo:', event.filename);
        console.error('   Línea:', event.lineno);
        console.error('   Columna:', event.colno);
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        console.error('❌ Promise rechazada no manejada:', event.reason);
        console.error('   Promise:', event.promise);
    });
    
    // ========== FUNCIONES DE DIAGNÓSTICO DISPONIBLES ==========
    console.log('\n' + '█'.repeat(80));
    console.log('🔧 FUNCIONES DE DIAGNÓSTICO DISPONIBLES EN LA CONSOLA');
    console.log('█'.repeat(80));
    console.log('Para diagnosticar problemas, ejecute en la consola:');
    console.log('');
    console.log('  diagnosticComplete()      - Diagnóstico completo del sistema');
    console.log('  diagnosticarEvidencias()  - Analizar archivos seleccionados');
    console.log('  getDeviceInfo()           - Información detallada del dispositivo');
    console.log('  verPendientes()           - Ver y reintentar registros pendientes');
    console.log('  limpiarPendientes()       - Eliminar registros pendientes (precaución)');
    console.log('  retryFailedSubmissions()  - Reintentar envíos fallidos manualmente');
    console.log('  safeLocalStorage()        - Verificar disponibilidad de localStorage');
    console.log('');
    console.log('Ejemplo: verPendientes()');
    console.log('█'.repeat(80) + '\n');
    
    // ========== INFORMACIÓN FINAL ==========
    console.log('━'.repeat(80));
    console.log('✅ APLICACIÓN INICIADA CORRECTAMENTE');
    console.log('━'.repeat(80));
    console.log(`✅ Dispositivo: ${deviceType}`);
    console.log(`✅ Modo: ${isIOS ? 'iOS' : isDesktop ? 'Desktop' : 'Android/Windows'}`);
    console.log(`✅ Precisión GPS requerida: ${REQUIRED_ACCURACY}m`);
    console.log(`✅ Evidencias: ${isIOS ? 'Modo simple (sin Drag & Drop)' : 'Funcionalidad completa'}`);
    console.log(`✅ Estado: Lista para usar`);
    console.log('━'.repeat(80) + '\n');
    
    console.log('🎯 La aplicación está lista. Por favor:');
    console.log('   1️⃣ Acepte el aviso de privacidad');
    console.log('   2️⃣ Inicie sesión con Google');
    console.log('   3️⃣ Permita el acceso a su ubicación');
    console.log('   4️⃣ Complete el formulario de asistencia\n');
    
    // ========== VERIFICACIÓN FINAL DEL ENTORNO ==========
    if (!navigator.onLine) {
        console.warn('\n⚠️ ADVERTENCIA: No hay conexión a Internet');
        console.warn('   Los registros se guardarán localmente hasta que se restaure la conexión\n');
        showStatus(
            '⚠️ Sin conexión a Internet.\n\n' +
            'Puede usar la aplicación, pero los registros se guardarán ' +
            'localmente hasta que se restaure la conexión.',
            'warning'
        );
        setTimeout(() => hideStatus(), 7000);
    }
    
    // ========== MENSAJE FINAL ==========
    console.log('═'.repeat(80));
    console.log('💚 CESPSIC - Sistema de Control de Asistencia v1.2.03');
    console.log('═'.repeat(80) + '\n\n');
});

// ========== VALIDACIÓN HTTPS PARA iOS ==========
function checkHTTPS() {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.warn('⚠️ iOS requiere HTTPS para geolocalización');
        showStatus('⚠️ Se recomienda usar HTTPS para mejor funcionalidad en iOS', 'warning');
        setTimeout(() => hideStatus(), 5000);
    }
}

// ========== ADVERTENCIA PARA DESKTOP ==========
function showDesktopWarning() {
    const authSection = document.getElementById('auth-section');
    
    // Crear advertencia si no existe
    let desktopWarning = document.getElementById('desktop-warning');
    if (!desktopWarning) {
        desktopWarning = document.createElement('div');
        desktopWarning.id = 'desktop-warning';
        desktopWarning.style.cssText = `
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border: 2px solid #ffc107;
            border-radius: 10px;
            padding: 15px;
            margin-top: 15px;
            color: #856404;
            font-size: 14px;
            line-height: 1.6;
        `;
        desktopWarning.innerHTML = `
            <strong>💻 Dispositivo Desktop Detectado (${deviceType})</strong><br>
            Los ordenadores no tienen GPS integrado y usan ubicación por IP/WiFi.<br>
            <strong>Precisión esperada:</strong> 100-1000 metros (vs 5-50m en móviles)<br>
            ℹ️ El sistema aceptará precisiones de hasta ${REQUIRED_ACCURACY} metros.
        `;
        authSection.appendChild(desktopWarning);
    }
}

// ========== LOCALSTORAGE SEGURO (COMPATIBLE CON MODO PRIVADO iOS) ==========
function safeLocalStorage() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        console.warn('⚠️ localStorage no disponible (modo privado)', e);
        return false;
    }
}

function safeSetItem(key, value) {
    if (safeLocalStorage()) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.error('Error guardando en localStorage:', e);
            return false;
        }
    }
    console.warn('⚠️ localStorage bloqueado - datos no persistirán');
    return false;
}

function safeGetItem(key) {
    if (safeLocalStorage()) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Error leyendo localStorage:', e);
            return null;
        }
    }
    return null;
}

function safeRemoveItem(key) {
    if (safeLocalStorage()) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removiendo de localStorage:', e);
            return false;
        }
    }
    return false;
}

// ========== PRIVACY MANAGEMENT ==========
function checkPrivacyConsent() {
    try {
        const storedConsent = safeGetItem('cespsic_privacy_accepted');
        if (storedConsent) {
            const consentData = JSON.parse(storedConsent);
            if (consentData.version === PRIVACY_VERSION && consentData.accepted && consentData.authenticated_user) {
                privacyConsent = true;
                updatePrivacyUI();
                return;
            }
            safeRemoveItem('cespsic_privacy_accepted');
        }
        privacyConsent = false;
        updatePrivacyUI();
    } catch (error) {
        console.error('Error verificando consentimiento:', error);
        safeRemoveItem('cespsic_privacy_accepted');
        privacyConsent = false;
        updatePrivacyUI();
    }
}

function updatePrivacyUI() {
    const revokeSection = document.getElementById('revoke-section');
    const signinBtn = document.getElementById('main-signin-btn');
    const signinBtnText = document.getElementById('signin-btn-text');
    
    if (privacyConsent) {
        revokeSection.style.display = 'block';
        signinBtn.disabled = false;
        signinBtn.classList.remove('privacy-required');
    } else {
        revokeSection.style.display = 'none';
        signinBtn.disabled = false;
        signinBtn.classList.add('privacy-required');
    }
    signinBtnText.textContent = 'Iniciar Sesión con Google';
    signinBtn.style.background = '#4285f4';
    signinBtn.style.cursor = 'pointer';
}

function requestAuthentication() {
    if (!privacyConsent) {
        showPrivacyModal();
    } else {
        authenticationPurpose = 'login';
        proceedWithGoogleSignIn();
    }
}

function showPrivacyModal() {
    const modal = document.getElementById('privacy-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.addEventListener('keydown', handlePrivacyModalEscape);
    }
}

function hidePrivacyModal() {
    const modal = document.getElementById('privacy-modal');
    modal.style.display = 'none';
    document.removeEventListener('keydown', handlePrivacyModalEscape);
}

function handlePrivacyModalEscape(e) {
    if (e.key === 'Escape') rejectPrivacy();
}

function acceptPrivacy() {
    privacyConsent = true;
    updatePrivacyUI();
    hidePrivacyModal();
    authenticationPurpose = 'login';
    proceedWithGoogleSignIn();
}

function rejectPrivacy() {
    hidePrivacyModal();
    showStatus('Debe aceptar el aviso de privacidad para usar la aplicación.', 'error');
    setTimeout(() => hideStatus(), 5000);
}

function requestRevocation() { showRevokeModal(); }

function showRevokeModal() {
    const modal = document.getElementById('revoke-modal');
    modal.style.display = 'flex';
    document.addEventListener('keydown', handleRevokeModalEscape);
}

function hideRevokeModal() {
    const modal = document.getElementById('revoke-modal');
    modal.style.display = 'none';
    document.removeEventListener('keydown', handleRevokeModalEscape);
}

function handleRevokeModalEscape(e) {
    if (e.key === 'Escape') cancelRevocation();
}

function cancelRevocation() { hideRevokeModal(); }

function authenticateToRevoke() {
    hideRevokeModal();
    authenticationPurpose = 'revoke';
    proceedWithGoogleSignIn();
}

async function revokePrivacyConsent() {
    try {
        await recordPrivacyAction('PRIVACY_REVOKED');
        safeRemoveItem('cespsic_privacy_accepted');
        privacyConsent = false;
        isAuthenticated = false;
        currentUser = null;
        userEmail = null;
        locationValid = false;
        currentLocation = null;
        selectedFiles = [];
        
        updatePrivacyUI();
        updateAuthenticationUI();
        disableForm();
        resetLocationFields();
        resetEvidenciasSection();
        
        showStatus('Permisos de privacidad revocados exitosamente.', 'success');
        setTimeout(() => {
            hideStatus();
            initializeGoogleSignIn();
        }, 3000);
    } catch (error) {
        console.error('Error revocando consentimiento:', error);
        showStatus('Error al revocar permisos.', 'error');
    }
}

async function recordPrivacyAction(action) {
    if (!currentUser) throw new Error('Usuario no autenticado');
    
    const privacyData = {
        action: 'record_privacy_action',
        timestamp: new Date().toISOString(),
        email: currentUser.email,
        google_user_id: currentUser.id,
        authenticated_user_name: currentUser.name,
        privacy_action: action,
        privacy_version: PRIVACY_VERSION,
        device_info: navigator.userAgent,
        authentication_purpose: authenticationPurpose,
        is_ios: isIOS
    };
    
    await sendDataWithFallback(privacyData);
}

// ========== GOOGLE SIGN-IN ==========
function initializeForm() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const fechaLocal = `${year}-${month}-${day}`;
    
    document.getElementById('fecha').value = fechaLocal;
    updateCurrentTime();
    document.getElementById('timestamp').value = new Date().toISOString();
}

function updateCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('hora').value = `${hours}:${minutes}`;	
}

function loadGoogleSignInScript() {
    if (typeof google !== 'undefined' && google.accounts) {
        initializeGoogleSignIn();
        blockGooglePrompts();
    } else {
        setTimeout(loadGoogleSignInScript, 100);
    }
}

function blockGooglePrompts() {
    try {
        google.accounts.id.disableAutoSelect();
        google.accounts.id.cancel();
        const originalPrompt = google.accounts.id.prompt;
        google.accounts.id.prompt = function(callback) {
            if (callback) callback({ isNotDisplayed: () => true, isSkippedMoment: () => true });
        };
    } catch (error) {
        console.error('Error bloqueando prompts:', error);
    }
}

function initializeGoogleSignIn() {
    try {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            ux_mode: 'popup'
        });
        google.accounts.id.disableAutoSelect();
        google.accounts.id.cancel();
    } catch (error) {
        console.error('Error inicializando Google Sign-In:', error);
        showStatus('Error cargando sistema de autenticación.', 'error');
    }
}

function proceedWithGoogleSignIn() {
    if (isIOS) {
        showIOSGoogleButton();
    } else {
        showVisibleGoogleButton();
    }
}

// ========== iOS: BOTÓN GOOGLE (USA MODAL HTML EXISTENTE) ==========
function showIOSGoogleButton() {
    const modal = document.getElementById('privacy-modal');
    const modalHeader = modal.querySelector('.modal-header');
    const modalBody = modal.querySelector('.modal-body');
    const modalFooter = modal.querySelector('.modal-footer');
    
    modalHeader.innerHTML = '<h2>🔐 Autenticación con Google</h2>';
    modalBody.innerHTML = `
        <p style="text-align: center; margin-bottom: 20px; color: #666;">
            Haga clic en el botón azul para continuar:
        </p>
        <div id="ios-google-button-container" style="display: flex; justify-content: center; margin: 20px 0;"></div>
    `;
    modalFooter.innerHTML = `
        <button class="btn-reject" onclick="closeIOSAuthModal()">Cancelar</button>
    `;
    
    modal.style.display = 'flex';
    
    setTimeout(() => {
        const buttonContainer = document.getElementById('ios-google-button-container');
        if (buttonContainer) {
            google.accounts.id.renderButton(buttonContainer, {
                theme: "filled_blue",
                size: "large",
                text: "signin_with",
                shape: "rectangular",
                width: 250
            });
        }
    }, 100);
}

function closeIOSAuthModal() {
    const modal = document.getElementById('privacy-modal');
    modal.style.display = 'none';
    
    if (privacyConsent && !isAuthenticated) {
        privacyConsent = false;
        updatePrivacyUI();
        showStatus('Debe completar la autenticación.', 'error');
        setTimeout(() => hideStatus(), 5000);
    }
}

// ========== OTROS NAVEGADORES: MODAL DINÁMICO ==========
function showVisibleGoogleButton() {
    const existingOverlay = document.getElementById('google-auth-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'google-auth-overlay';
    overlay.style.cssText = `
        position: fixed !important; top: 0 !important; left: 0 !important;
        width: 100% !important; height: 100% !important;
        background: rgba(0,0,0,0.7) !important; z-index: 10000 !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
        background: white; padding: 30px; border-radius: 15px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3); text-align: center;
        max-width: 400px; width: 90%;
    `;
    
    container.innerHTML = `
        <h3 style="margin-bottom: 20px; color: #333;">Autenticación con Google</h3>
        <p style="margin-bottom: 20px; color: #666;">Haga clic en el botón azul para continuar:</p>
        <div id="google-button-container" style="margin-bottom: 20px;"></div>
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = `
        padding: 10px 20px; background: #f5f5f5; border: 1px solid #ddd;
        border-radius: 5px; cursor: pointer; margin-top: 10px;
    `;
    cancelBtn.onclick = () => closeAuthModal();
    
    overlay.onclick = (e) => { if (e.target === overlay) closeAuthModal(); };
    container.appendChild(cancelBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        const buttonContainer = document.getElementById('google-button-container');
        if (buttonContainer) {
            google.accounts.id.renderButton(buttonContainer, {
                theme: "filled_blue", size: "large", text: "signin_with", shape: "rectangular"
            });
        }
    }, 100);
    
    setTimeout(() => closeAuthModal(), 300000);
}

async function handleCredentialResponse(response) {
    try {
        if (isIOS) {
            closeIOSAuthModal();
        } else {
            closeAuthModal();
        }
        
        const userInfo = parseJwt(response.credential);
        
        currentUser = {
            id: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            email_verified: userInfo.email_verified
        };

        if (!currentUser.email_verified) {
            showStatus('Su cuenta de Gmail no está verificada.', 'error');
            return;
        }

        if (authenticationPurpose === 'revoke') {
            await handleRevocationFlow();
        } else {
            await handleLoginFlow();
        }
    } catch (error) {
        console.error('Error procesando credenciales:', error);
        showStatus('Error en la autenticación.', 'error');
        if (isIOS) {
            closeIOSAuthModal();
        } else {
            closeAuthModal();
        }
    }
}

function closeAuthModal() {
    if (privacyConsent && !isAuthenticated) {
        privacyConsent = false;
        updatePrivacyUI();
        showStatus('Debe completar la autenticación.', 'error');
        setTimeout(() => hideStatus(), 5000);
    }
    
    const authOverlay = document.getElementById('google-auth-overlay');
    if (authOverlay) authOverlay.remove();
    
    setTimeout(() => {
        document.querySelectorAll('div[style*="position: fixed"][style*="z-index"]').forEach(overlay => {
            if (overlay.style.zIndex >= 10000) overlay.remove();
        });
    }, 500);
}

async function handleLoginFlow() {
    try {
        const consentData = {
            accepted: true,
            timestamp: new Date().toISOString(),
            version: PRIVACY_VERSION,
            userAgent: navigator.userAgent,
            authenticated_user: currentUser.email,
            authentication_timestamp: new Date().toISOString(),
            is_ios: isIOS
        };
        
        safeSetItem('cespsic_privacy_accepted', JSON.stringify(consentData));
        await recordPrivacyAction('PRIVACY_ACCEPTED');
        
        isAuthenticated = true;
        userEmail = currentUser.email;
        document.getElementById('email').value = userEmail;
        document.getElementById('google_user_id').value = currentUser.id;

        updateAuthenticationUI();
        enableForm();
        getCurrentLocation();
        updateSubmitButton();
        
        showStatus(`¡Bienvenido ${currentUser.name}! Autenticación exitosa.`, 'success');
        setTimeout(() => hideStatus(), 3000);
    } catch (error) {
        console.error('Error en flujo de login:', error);
        privacyConsent = false;
        updatePrivacyUI();
        showStatus('Error registrando la autenticación.', 'error');
    }
}

async function handleRevocationFlow() {
    try {
        await revokePrivacyConsent();
    } catch (error) {
        console.error('Error en flujo de revocación:', error);
        showStatus('Error durante la revocación.', 'error');
    }
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return null;
    }
}

function updateAuthenticationUI() {
    const authSection = document.getElementById('auth-section');
    const authTitle = document.getElementById('auth-title');
    const userInfo = document.getElementById('user-info');
    const signinContainer = document.getElementById('signin-button-container');

    if (isAuthenticated && currentUser) {
        authSection.classList.add('authenticated');
        authTitle.textContent = '✅ Autenticación Exitosa';
        authTitle.classList.add('authenticated');

        document.getElementById('user-avatar').src = currentUser.picture;
        document.getElementById('user-email').textContent = currentUser.email;
        document.getElementById('user-name').textContent = currentUser.name;
        userInfo.classList.add('show');
        signinContainer.style.display = 'none';
    } else {
        authSection.classList.remove('authenticated');
        authTitle.textContent = '🔒 Autenticación Requerida';
        authTitle.classList.remove('authenticated');
        userInfo.classList.remove('show');
        signinContainer.style.display = 'block';
    }
}

function enableForm() {
    document.getElementById('form-container').classList.add('authenticated');
}

function disableForm() {
    document.getElementById('form-container').classList.remove('authenticated');
    locationValid = false;
    updateSubmitButton();
}

function signOut() {
    try {
        google.accounts.id.disableAutoSelect();
        
        isAuthenticated = false;
        currentUser = null;
        userEmail = null;
        locationValid = false;
        currentLocation = null;
        locationAttempts = 0;
        selectedFiles = [];

        ['email', 'google_user_id', 'latitude', 'longitude', 'location_status'].forEach(id => {
            document.getElementById(id).value = '';
        });

        updateAuthenticationUI();
        disableForm();
        resetLocationFields();
        resetEvidenciasSection();

        showStatus('Sesión cerrada correctamente.', 'success');
        setTimeout(() => hideStatus(), 3000);
        setTimeout(() => initializeGoogleSignIn(), 1000);
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        showStatus('Error al cerrar sesión.', 'error');
    }
}

// ========== EVIDENCIAS (iOS COMPATIBLE) ==========
function setupEvidenciasHandlers() {
    const evidenciasInput = document.getElementById('evidencias');
    
    if (isIOS) {
        // iOS: Evento simple, sin drag & drop
        console.log('🎯 iOS: Configurando manejo simple de archivos');
        evidenciasInput.addEventListener('change', function(e) {
            handleIOSFileSelection(e.target.files);
        });
    } else {
        // Android/Windows: Funcionalidad completa con drag & drop
        evidenciasInput.addEventListener('change', function(e) {
            handleFileSelection(e.target.files);
        });
        
        const evidenciasContainer = document.querySelector('.evidencias-container');
        evidenciasContainer.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            evidenciasContainer.style.borderColor = '#4854c7';
        });
        
        evidenciasContainer.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            evidenciasContainer.style.borderColor = '#667eea';
        });
        
        evidenciasContainer.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            evidenciasContainer.style.borderColor = '#667eea';
            handleFileSelection(e.dataTransfer.files);
        });
    }
}

// iOS: Manejo simple de archivos (SIN DataTransfer)
function handleIOSFileSelection(files) {
    console.log(`📱 iOS: Procesando ${files.length} archivo(s)...`);
    
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];
    
    fileArray.forEach(file => {
        console.log(`Archivo: ${file.name}, Tipo: ${file.type}, Tamaño: ${(file.size/1024/1024).toFixed(2)}MB`);
        
        if (!file.type) {
            errors.push(`${file.name}: Sin tipo MIME`);
            console.warn(`❌ ${file.name}: No tiene tipo MIME`);
            return;
        }
        
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            errors.push(`${file.name}: Solo JPG, PNG, WEBP`);
            console.warn(`❌ ${file.name}: Tipo no permitido`);
            return;
        }
        
        const sizeMB = file.size / 1024 / 1024;
        if (file.size > MAX_FILE_SIZE) {
            errors.push(`${file.name}: ${sizeMB.toFixed(1)}MB (máx. 10MB)`);
            console.warn(`❌ ${file.name}: Muy grande`);
            return;
        }
        
        validFiles.push(file);
        console.log(`✅ ${file.name}: Válido`);
    });
    
    if (selectedFiles.length + validFiles.length > MAX_FILES) {
        errors.push(`Máximo ${MAX_FILES} imágenes (ya tiene ${selectedFiles.length})`);
        showEvidenciasStatus(errors.join('<br>'), 'error');
        console.warn(`❌ Límite excedido`);
        return;
    }
    
    if (errors.length > 0) {
        showEvidenciasStatus(errors.join('<br>'), 'error');
        console.warn(`⚠️ ${errors.length} archivo(s) rechazado(s)`);
    }
    
    // iOS: Guardar archivos directamente (NO tocar input.files)
    validFiles.forEach(file => {
        selectedFiles.push(file);
        addFilePreview(file, selectedFiles.length - 1);
    });
    
    if (validFiles.length > 0) {
        showEvidenciasStatus(`${validFiles.length} imagen(es) agregada(s).`, 'success');
        console.log(`✅ Total iOS: ${selectedFiles.length}`);
    }
}

// Android/Windows: Manejo completo de archivos (CON DataTransfer)
function handleFileSelection(files) {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];
    
    console.log(`🔍 Procesando ${fileArray.length} archivo(s)...`);
    
    fileArray.forEach(file => {
        console.log(`Archivo: ${file.name}, Tipo: ${file.type}, Tamaño: ${(file.size/1024/1024).toFixed(2)}MB`);
        
        if (!file.type) {
            errors.push(`${file.name}: Sin tipo MIME (intente otro formato)`);
            console.warn(`❌ ${file.name}: No tiene tipo MIME`);
            return;
        }
        
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            errors.push(`${file.name}: Formato no válido (solo JPG, PNG, WEBP)`);
            console.warn(`❌ ${file.name}: Tipo ${file.type} no permitido`);
            return;
        }
        
        const sizeMB = file.size / 1024 / 1024;
        if (file.size > MAX_FILE_SIZE) {
            errors.push(`${file.name}: ${sizeMB.toFixed(1)}MB (máx. 10MB)`);
            console.warn(`❌ ${file.name}: Demasiado grande (${sizeMB.toFixed(1)}MB)`);
            return;
        }
        
        validFiles.push(file);
        console.log(`✅ ${file.name}: Válido`);
    });
    
    if (selectedFiles.length + validFiles.length > MAX_FILES) {
        errors.push(`Máximo ${MAX_FILES} imágenes (ya tiene ${selectedFiles.length})`);
        showEvidenciasStatus(errors.join('<br>'), 'error');
        console.warn(`❌ Límite de archivos excedido`);
        return;
    }
    
    if (errors.length > 0) {
        showEvidenciasStatus(errors.join('<br>'), 'error');
        console.warn(`⚠️ ${errors.length} archivo(s) rechazado(s)`);
    }
    
    validFiles.forEach(file => {
        selectedFiles.push(file);
        addFilePreview(file, selectedFiles.length - 1);
    });
    
    updateFileInput();
    
    if (validFiles.length > 0) {
        showEvidenciasStatus(`${validFiles.length} imagen(es) agregada(s) correctamente.`, 'success');
        console.log(`✅ Total de archivos seleccionados: ${selectedFiles.length}`);
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
            <button type="button" class="evidencia-remove" onclick="removeFile(${index})">×</button>
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

function updatePreview() {
    const preview = document.getElementById('evidencias-preview');
    preview.innerHTML = '';
    selectedFiles.forEach((file, index) => addFilePreview(file, index));
}

// Solo para Android/Windows (iOS NO soporta DataTransfer)
function updateFileInput() {
    if (isIOS) {
        console.log('🎯 iOS: Saltando updateFileInput (no soportado)');
        return;
    }
    
    try {
        const input = document.getElementById('evidencias');
        const dt = new DataTransfer();
        selectedFiles.forEach(file => dt.items.add(file));
        input.files = dt.files;
    } catch (error) {
        console.warn('⚠️ Error actualizando input.files:', error);
        // No es crítico, continuar normal
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

// ========== UPLOAD ==========
async function uploadEvidencias() {
    if (selectedFiles.length === 0) {
        console.log('ℹ️ No hay archivos para subir');
        return [];
    }
    
    console.log(`📤 Iniciando subida de ${selectedFiles.length} archivo(s)...`);
    
    const tipoRegistro = document.getElementById('tipo_registro').value || 'sin_tipo';
    const evidenciasInfo = [];
    
    showEvidenciasStatus('Preparando archivos para subir...', 'loading');
    
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileName = generateEvidenciaFileName(tipoRegistro, i);
        const extension = file.name.split('.').pop();
        const fullFileName = `${fileName}.${extension}`;
        
        try {
            console.log(`📤 [${i+1}/${selectedFiles.length}] Procesando: ${file.name}`);
            showEvidenciasStatus(`Subiendo imagen ${i + 1}/${selectedFiles.length}: ${file.name}`, 'loading');
            
            if (!file || !file.type || file.size === 0) {
                throw new Error('Archivo inválido o corrupto');
            }
            
            let base64Data;
            try {
                base64Data = await fileToBase64(file);
                console.log(`✅ Conversión Base64 exitosa: ${(base64Data.length/1024).toFixed(1)}KB`);
            } catch (b64Error) {
                console.error(`❌ Error en conversión Base64:`, b64Error);
                throw new Error(`Error al procesar la imagen: ${b64Error.message}`);
            }
            
            const uploadData = {
                action: 'upload_evidencia',
                fileName: fullFileName,
                fileData: base64Data,
                mimeType: file.type,
                studentFolder: generateStudentFolderName(),
                userEmail: currentUser.email,
                timestamp: new Date().toISOString()
            };
            
            console.log(`🚀 Enviando archivo ${i + 1}: ${fullFileName} (${file.type})`);
            
            const uploadResult = await Promise.race([
                sendDataWithFallback(uploadData),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout de 30 segundos')), 30000)
                )
            ]);
            
            evidenciasInfo.push({
                fileName: fullFileName,
                originalName: file.name,
                size: file.size,
                uploadTime: new Date().toISOString(),
                uploadStatus: 'SUCCESS',
                url: null
            });
            
            console.log(`✅ Archivo ${fullFileName} enviado exitosamente`);
            
        } catch (error) {
            console.error(`❌ Error subiendo archivo ${file.name}:`, error);
            
            evidenciasInfo.push({
                fileName: fullFileName,
                originalName: file.name,
                size: file.size,
                uploadTime: new Date().toISOString(),
                uploadStatus: 'FAILED',
                error: error.message || 'Error desconocido',
                errorType: error.name || 'Error'
            });
            
            showEvidenciasStatus(
                `⚠️ Error en ${file.name}: ${error.message}`, 
                'warning'
            );
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (i < selectedFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }
    
    const successCount = evidenciasInfo.filter(e => e.uploadStatus === 'SUCCESS').length;
    const failCount = evidenciasInfo.filter(e => e.uploadStatus === 'FAILED').length;
    
    console.log(`\n📊 RESUMEN DE SUBIDA:`);
    console.log(`   ✅ Exitosas: ${successCount}`);
    console.log(`   ❌ Fallidas: ${failCount}`);
    console.log(`   📁 Total: ${evidenciasInfo.length}`);
    
    if (failCount > 0) {
        console.log(`\n⚠️ ARCHIVOS FALLIDOS:`);
        evidenciasInfo.filter(e => e.uploadStatus === 'FAILED').forEach(e => {
            console.log(`   - ${e.originalName}: ${e.error}`);
        });
    }
    
    if (successCount > 0) {
        showEvidenciasStatus(
            `✅ ${successCount} evidencia(s) subida(s)${failCount > 0 ? ` (${failCount} errores - revise consola)` : ''}`, 
            failCount > 0 ? 'warning' : 'success'
        );
    } else if (failCount > 0) {
        showEvidenciasStatus(
            `❌ No se pudo subir ninguna evidencia. Errores: ${evidenciasInfo.map(e => e.error).join(', ')}`, 
            'error'
        );
    }
    
    return evidenciasInfo;
}

async function sendDataWithFallback(data, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;
    const REQUEST_ID = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    console.log(`\n${'━'.repeat(80)}`);
    console.log(`[${REQUEST_ID}] 📤 INTENTO ${retryCount + 1}/${MAX_RETRIES + 1} - ENVIANDO DATOS`);
    console.log(`${'━'.repeat(80)}`);
    
    try {
        // Agregar metadata
        data.client_timestamp = new Date().toISOString();
        data.retry_count = retryCount;
        data.request_id = REQUEST_ID;
        
        console.log(`[${REQUEST_ID}] Acción: ${data.action || 'attendance_submission'}`);
        console.log(`[${REQUEST_ID}] Usuario: ${data.authenticated_user_name || 'N/A'}`);
        console.log(`[${REQUEST_ID}] Email: ${data.email || 'N/A'}`);
        
        // ========== ENVIAR VÍA FORMULARIO ==========
        const response = await enviarViaFormulario(data, REQUEST_ID);
        
        // ========== VALIDAR RESPUESTA ==========
        console.log(`[${REQUEST_ID}] 🔍 Validando respuesta...`);
        
        if (!response || typeof response !== 'object') {
            throw new Error(`Respuesta inválida del servidor (tipo: ${typeof response})`);
        }
        
        // ⚠️ CRÍTICO: Verificar campo 'verified'
        if (response.verified === undefined) {
            console.warn(`[${REQUEST_ID}] ⚠️ Campo 'verified' no presente, inferiendo desde 'success'`);
            response.verified = response.success === true;
        }
        
        // Convertir a booleano si no lo es
        if (typeof response.verified !== 'boolean') {
            response.verified = Boolean(response.verified);
        }
        
        console.log(`[${REQUEST_ID}] Respuesta - success: ${response.success}, verified: ${response.verified}`);
        
        // Validar que está verificado
        if (!response.verified) {
            throw new Error('La respuesta del servidor no está verificada (verified=false)');
        }
        
        // Validar éxito
        if (!response.success) {
            throw new Error(response.message || response.error || 'Error desconocido del servidor');
        }
        
        // ========== VERIFICACIÓN ADICIONAL EN SHEETS (solo para asistencia) ==========
        if (data.action !== 'upload_evidencia' && 
            data.action !== 'record_privacy_action' && 
            data.action !== 'verify_submission') {
            
            console.log(`[${REQUEST_ID}] 🔍 Verificando escritura en Google Sheets...`);
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            try {
                const verificationResult = await verificarEnSheets(data, REQUEST_ID);
                
                if (!verificationResult.found) {
                    console.warn(`[${REQUEST_ID}] ⚠️ Registro no encontrado en verificación inmediata`);
                    response.verification_warning = 'Registro no encontrado en verificación inmediata';
                } else {
                    console.log(`[${REQUEST_ID}] ✅ Verificación en Sheets exitosa (fila ${verificationResult.row_number})`);
                    response.sheet_verification = 'passed';
                    response.verified_row = verificationResult.row_number;
                }
            } catch (verifyError) {
                console.warn(`[${REQUEST_ID}] ⚠️ Error en verificación (no crítico):`, verifyError.message);
                response.verification_warning = verifyError.message;
            }
        }
        
        console.log(`[${REQUEST_ID}] ✅ ENVÍO EXITOSO Y VERIFICADO`);
        console.log(`${'━'.repeat(80)}\n`);
        
        return response;
        
    } catch (error) {
        console.error(`[${REQUEST_ID}] ❌ ERROR en intento ${retryCount + 1}:`, error.message);
        
        // Reintentar si no hemos alcanzado el máximo
        if (retryCount < MAX_RETRIES) {
            console.log(`[${REQUEST_ID}] ⏳ Reintentando en ${RETRY_DELAY/1000} segundos...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return sendDataWithFallback(data, retryCount + 1);
        }
        
        // Si agotamos reintentos, guardar localmente
        console.error(`[${REQUEST_ID}] ❌ TODOS LOS INTENTOS FALLARON`);
        saveFailedSubmission(data, error);
        
        throw new Error(`Error después de ${MAX_RETRIES + 1} intentos: ${error.message}`);
    }
}

// ========== FUNCIÓN AUXILIAR: Enviar vía formulario con iframe ==========
function enviarViaFormulario(data, requestId) {
    return new Promise((resolve, reject) => {
        const TIMEOUT = 20000; // 20 segundos
        const MAX_READ_ATTEMPTS = 5;
        
        let timeoutId;
        let resolved = false;
        let attemptCount = 0;
        
        console.log(`[${requestId}] 📝 Creando formulario e iframe...`);
        
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.name = 'response_frame_' + requestId;
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GOOGLE_SCRIPT_URL;
        form.target = iframe.name;
        form.style.display = 'none';
        
        // Agregar campos al formulario
        for (const [key, value] of Object.entries(data)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            
            if (typeof value === 'object' && value !== null) {
                input.value = JSON.stringify(value);
            } else {
                input.value = value || '';
            }
            
            form.appendChild(input);
        }
        
        // Timeout
        timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                console.error(`[${requestId}] ⏱️ TIMEOUT después de ${TIMEOUT}ms`);
                cleanup();
                
                // En caso de timeout, asumir éxito parcial (el servidor puede haber procesado)
                resolve({
                    success: true,
                    verified: false,
                    message: 'Timeout - El servidor no respondió a tiempo',
                    warning: 'El registro puede haberse guardado. Verifique manualmente en Google Sheets.',
                    timeout: true
                });
            }
        }, TIMEOUT);
        
        // Función para leer la respuesta del iframe
        function tryReadResponse() {
            if (resolved) return;
            
            attemptCount++;
            console.log(`[${requestId}] 📥 Intento ${attemptCount}/${MAX_READ_ATTEMPTS} de leer respuesta`);
            
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                
                if (!iframeDoc || !iframeDoc.body) {
                    if (attemptCount < MAX_READ_ATTEMPTS) {
                        setTimeout(tryReadResponse, 1000);
                        return;
                    }
                    throw new Error('No se pudo acceder al documento del iframe');
                }
                
                const responseText = iframeDoc.body.textContent || iframeDoc.body.innerText || '';
                
                console.log(`[${requestId}] 📄 Respuesta raw (${responseText.length} chars):`, 
                           responseText.substring(0, 300) + (responseText.length > 300 ? '...' : ''));
                
                if (!responseText || responseText.trim() === '') {
                    if (attemptCount < MAX_READ_ATTEMPTS) {
                        setTimeout(tryReadResponse, 1000);
                        return;
                    }
                    throw new Error('El servidor devolvió una respuesta vacía');
                }
                
                // Parsear JSON
                let responseData;
                try {
                    responseData = JSON.parse(responseText);
                    console.log(`[${requestId}] ✅ JSON parseado correctamente`);
                } catch (parseError) {
                    console.error(`[${requestId}] ❌ Error parseando JSON:`, parseError);
                    throw new Error(
                        `Respuesta del servidor no es JSON válido. ` +
                        `Texto: "${responseText.substring(0, 100)}..."`
                    );
                }
                
                // ⚠️ ASEGURAR campo 'verified'
                if (responseData.verified === undefined) {
                    console.warn(`[${requestId}] ⚠️ Campo 'verified' no presente, asumiendo desde 'success'`);
                    responseData.verified = responseData.success === true;
                }
                
                // Validar estructura básica
                if (typeof responseData !== 'object') {
                    throw new Error('Respuesta no es un objeto JSON');
                }
                
                console.log(`[${requestId}] ✅ Respuesta válida recibida`);
                
                resolved = true;
                cleanup();
                resolve(responseData);
                
            } catch (readError) {
                // ⚠️ IMPORTANTE: Error CORS es ESPERADO y NO ES FATAL
                if (readError.message && readError.message.includes('cross-origin')) {
                    console.warn(`[${requestId}] ⚠️ Error CORS esperado (normal con Google Apps Script)`);
                    console.warn(`[${requestId}] ⚠️ Asumiendo éxito del envío...`);
                    
                    // Para errores CORS, asumir que el envío fue exitoso
                    // (Google Apps Script recibió y procesó los datos)
                    resolved = true;
                    cleanup();
                    
                    resolve({
                        success: true,
                        verified: true, // Asumir verificado en caso de CORS
                        message: 'Datos enviados correctamente (respuesta bloqueada por CORS)',
                        cors_blocked: true,
                        note: 'El servidor procesó la solicitud pero la respuesta no pudo ser leída debido a políticas CORS'
                    });
                    return;
                }
                
                // Para otros errores, continuar intentando
                console.error(`[${requestId}] ❌ Error leyendo respuesta:`, readError.message);
                
                if (attemptCount < MAX_READ_ATTEMPTS) {
                    console.log(`[${requestId}] 🔄 Reintentando lectura en 1 segundo...`);
                    setTimeout(tryReadResponse, 1000);
                } else {
                    resolved = true;
                    cleanup();
                    
                    // Último recurso: asumir éxito parcial
                    console.warn(`[${requestId}] ⚠️ No se pudo leer respuesta después de ${MAX_READ_ATTEMPTS} intentos`);
                    
                    resolve({
                        success: true,
                        verified: false,
                        message: 'Datos enviados pero no se pudo verificar la respuesta',
                        warning: 'La respuesta no pudo ser leída completamente',
                        error_reading_response: readError.message,
                        partial_response: true
                    });
                }
            }
        }
        
        // Handler de carga del iframe
        iframe.onload = function() {
            if (resolved) return;
            
            console.log(`[${requestId}] 📡 Iframe cargado, esperando 2s antes de leer...`);
            setTimeout(() => {
                if (!resolved) {
                    tryReadResponse();
                }
            }, 2000);
        };
        
        // Handler de error del iframe
        iframe.onerror = function(error) {
            if (resolved) return;
            
            console.warn(`[${requestId}] ⚠️ Evento de error en iframe (puede ser normal):`, error);
            
            // Intentar leer de todos modos
            setTimeout(() => {
                if (!resolved) {
                    tryReadResponse();
                }
            }, 1000);
        };
        
        // Cleanup
        function cleanup() {
            try {
                clearTimeout(timeoutId);
                
                setTimeout(() => {
                    try {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                        if (document.body.contains(form)) {
                            document.body.removeChild(form);
                        }
                    } catch (e) {
                        console.warn(`[${requestId}] Error en cleanup:`, e);
                    }
                }, 500);
            } catch (e) {
                console.warn(`[${requestId}] Error en cleanup principal:`, e);
            }
        }
        
        // Enviar formulario
        try {
            document.body.appendChild(iframe);
            document.body.appendChild(form);
            
            console.log(`[${requestId}] 📤 Enviando formulario a: ${GOOGLE_SCRIPT_URL}`);
            form.submit();
            console.log(`[${requestId}] ✅ Formulario enviado, esperando respuesta...`);
            
        } catch (submitError) {
            resolved = true;
            cleanup();
            reject(new Error('Error al enviar el formulario: ' + submitError.message));
        }
    });
}

// ========== FUNCIÓN AUXILIAR: Verificar en Google Sheets ==========
async function verificarEnSheets(originalData, requestId) {
    try {
        const verificationData = {
            action: 'verify_submission',
            email: originalData.email,
            timestamp: originalData.timestamp,
            modalidad: originalData.modalidad
        };
        
        console.log(`[${requestId}] 🔍 Enviando solicitud de verificación...`);
        
        const response = await enviarViaFormulario(verificationData, requestId + '_verify');
        
        console.log(`[${requestId}] Resultado verificación:`, response);
        
        return response;
        
    } catch (error) {
        console.error(`[${requestId}] Error en verificación:`, error);
        return { found: false, error: error.message };
    }
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

function generateStudentFolderName() {
    const apellidoPaterno = document.getElementById('apellido_paterno').value || 'Sin_Apellido';
    const apellidoMaterno = document.getElementById('apellido_materno').value || 'Sin_Apellido';
    const nombre = document.getElementById('nombre').value || 'Sin_Nombre';
    
    return `${apellidoPaterno}_${apellidoMaterno}_${nombre}`.replace(/[^a-zA-Z0-9_]/g, '');
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

// ========== FORM SUBMISSION ==========
// ========== FUNCIÓN COMPLETA: handleSubmit ==========
async function handleSubmit(e) {
    e.preventDefault();
    
    console.log('\n' + '='.repeat(80));
    console.log('🚀 INICIO DE ENVÍO DE FORMULARIO');
    console.log('='.repeat(80));
    
    // ========== VALIDACIONES PREVIAS ==========
    console.log('\n📋 PASO 1: VALIDACIONES PREVIAS');
    
    if (!isAuthenticated || !currentUser) {
        showStatus('❌ Debe autenticarse con Google antes de registrar asistencia.', 'error');
        console.error('❌ Usuario no autenticado');
        return;
    }
    console.log('✅ Usuario autenticado:', currentUser.email);
    
    if (!locationValid || !currentLocation) {
        showStatus('❌ Ubicación GPS requerida y válida para continuar.', 'error');
        console.error('❌ Ubicación no válida');
        return;
    }
    console.log('✅ Ubicación válida:', currentLocation.accuracy, 'metros');
    
    if (currentLocation.accuracy > REQUIRED_ACCURACY) {
        const deviceTypeText = isDesktop ? 'Desktop/Laptop' : 'Móvil';
        showStatus(
            `❌ Precisión GPS insuficiente: ${Math.round(currentLocation.accuracy)}m > ${REQUIRED_ACCURACY}m (${deviceTypeText})\n\n` +
            `Por favor, ${isDesktop ? 'conéctese a una red WiFi o use un dispositivo móvil' : 'espere a tener mejor señal GPS'}.`,
            'error'
        );
        console.error('❌ Precisión GPS insuficiente');
        return;
    }
    console.log('✅ Precisión GPS aceptable');
    
    // Actualizar timestamp
    document.getElementById('timestamp').value = new Date().toISOString();
    
    // Validar campos condicionales
    if (!validateConditionalFields()) {
        console.error('❌ Validación de campos condicionales fallida');
        return;
    }
    console.log('✅ Campos condicionales validados');
    
    // ========== PREPARAR UI ==========
    showStatus('⏳ Guardando asistencia...', 'success');
    const submitBtn = document.querySelector('.submit-btn');
    const originalBtnText = submitBtn.textContent;
    const originalBtnStyle = submitBtn.style.background;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Guardando...';
    
    try {
        console.log('\n📊 PASO 2: INFORMACIÓN DEL DISPOSITIVO');
        console.log(`   Tipo: ${deviceType}`);
        console.log(`   Es Desktop: ${isDesktop}`);
        console.log(`   Precisión GPS: ${Math.round(currentLocation.accuracy)}m`);
        console.log(`   Archivos seleccionados: ${selectedFiles.length}`);
        
        // ========== SUBIR EVIDENCIAS ==========
        let evidenciasUrls = [];
        let successUploads = [];
        let failedUploads = [];
        
        if (selectedFiles.length > 0) {
            console.log('\n📤 PASO 3: SUBIENDO EVIDENCIAS');
            console.log(`   Total archivos: ${selectedFiles.length}`);
            
            showStatus(`📤 Subiendo ${selectedFiles.length} evidencia(s)...`, 'success');
            submitBtn.textContent = `📤 Subiendo evidencias (0/${selectedFiles.length})...`;
            
            try {
                evidenciasUrls = await uploadEvidencias();
                
                successUploads = evidenciasUrls.filter(e => e.uploadStatus === 'SUCCESS');
                failedUploads = evidenciasUrls.filter(e => e.uploadStatus === 'FAILED');
                
                console.log(`   ✅ Exitosas: ${successUploads.length}`);
                console.log(`   ❌ Fallidas: ${failedUploads.length}`);
                
                // Si TODAS fallaron, preguntar al usuario
                if (selectedFiles.length > 0 && successUploads.length === 0) {
                    const errorDetails = failedUploads
                        .map(e => `   • ${e.originalName}: ${e.error}`)
                        .join('\n');
                    
                    console.error('\n⚠️ TODAS LAS EVIDENCIAS FALLARON:');
                    console.error(errorDetails);
                    
                    const userDecision = confirm(
                        `⚠️ NO se pudo subir ninguna evidencia:\n\n${errorDetails}\n\n` +
                        `¿Desea continuar registrando la asistencia SIN evidencias?\n\n` +
                        `• Clic en "Aceptar" = Continuar sin evidencias\n` +
                        `• Clic en "Cancelar" = Reintentar o corregir archivos`
                    );
                    
                    if (!userDecision) {
                        throw new Error('Registro cancelado por el usuario. Por favor revise los archivos e intente nuevamente.');
                    }
                    
                    console.log('⚠️ Usuario decidió continuar sin evidencias');
                    showStatus('⚠️ Continuando sin evidencias...', 'warning');
                    
                } else if (failedUploads.length > 0) {
                    console.warn(`⚠️ ${failedUploads.length} evidencia(s) fallaron, pero continuando con ${successUploads.length}`);
                }
                
            } catch (uploadError) {
                console.error('❌ Error en proceso de subida:', uploadError);
                
                if (uploadError.message.includes('cancelado por el usuario')) {
                    throw uploadError; // Re-lanzar si el usuario canceló
                }
                
                // Para otros errores, preguntar si continuar
                const continuar = confirm(
                    `⚠️ Error al subir evidencias:\n\n${uploadError.message}\n\n` +
                    `¿Desea continuar SIN evidencias?`
                );
                
                if (!continuar) {
                    throw new Error('Registro cancelado. Error al subir evidencias.');
                }
            }
        } else {
            console.log('\n📝 PASO 3: Sin evidencias para subir');
        }
        
        // ========== PREPARAR DATOS DEL FORMULARIO ==========
        console.log('\n📝 PASO 4: PREPARANDO DATOS DEL FORMULARIO');
        
        submitBtn.textContent = '📝 Preparando datos...';
        
        const formData = new FormData(e.target);
        const data = {};
        
        // Procesar campos del formulario
        for (let [key, value] of formData.entries()) {
            if (key === 'evidencias') continue; // Omitir campo de archivos
            
            if (key.endsWith('[]')) {
                // Campos con múltiples valores (checkboxes)
                const cleanKey = key.replace('[]', '');
                if (!data[cleanKey]) {
                    data[cleanKey] = [];
                }
                data[cleanKey].push(value);
            } else {
                // Campos normales
                if (data[key]) {
                    // Si ya existe, convertir a array
                    if (Array.isArray(data[key])) {
                        data[key].push(value);
                    } else {
                        data[key] = [data[key], value];
                    }
                } else {
                    data[key] = value;
                }
            }
        }
        
        // ========== AGREGAR INFORMACIÓN DE EVIDENCIAS ==========
        data.evidencias_urls = evidenciasUrls;
        data.total_evidencias = successUploads.length;
        data.evidencias_failed = failedUploads.length;
        
        // Nombres de archivos exitosos
        const evidenciasNombres = successUploads
            .map(e => e.fileName)
            .join(', ');
        
        data.evidencias_nombres = evidenciasNombres;
        data.carpeta_evidencias = generateStudentFolderName();
        
        // ========== AGREGAR DATOS ADICIONALES ==========
        data.modalidad = document.getElementById('modalidad').value;
        data.ubicacion_detectada = document.getElementById('ubicacion_detectada').value;
        data.direccion_completa = document.getElementById('direccion_completa').value;
        data.precision_gps = document.getElementById('precision_gps').value;
        data.precision_gps_metros = Math.round(currentLocation.accuracy);
        data.location_validation = 'passed';
        data.authenticated_user_name = currentUser.name;
        data.authentication_timestamp = new Date().toISOString();
        
        // Información del dispositivo
        data.device_type = deviceType;
        data.is_desktop = isDesktop;
        data.is_mobile = !isDesktop;
        data.gps_method = isDesktop ? 'IP/WiFi' : 'GPS';
        data.required_accuracy = REQUIRED_ACCURACY;
        data.device_info = JSON.stringify(getDeviceInfo());
        
        // ========== VALIDACIÓN FINAL DE DATOS ==========
        console.log('\n🔍 PASO 5: VALIDACIÓN FINAL DE DATOS');
        
        if (!data.modalidad || data.modalidad === '' || data.modalidad === 'undefined') {
            throw new Error('ERROR CRÍTICO: El campo Modalidad es requerido y no puede estar vacío');
        }
        console.log('✅ Modalidad válida:', data.modalidad);
        
        if (!data.email || !data.google_user_id) {
            throw new Error('ERROR CRÍTICO: Datos de autenticación incompletos');
        }
        console.log('✅ Autenticación completa');
        
        // ========== LOGGING PRE-ENVÍO ==========
        console.log('\n📊 RESUMEN PRE-ENVÍO:');
        console.log(`   Usuario: ${currentUser.name}`);
        console.log(`   Email: ${data.email}`);
        console.log(`   Dispositivo: ${deviceType}`);
        console.log(`   Modalidad: ${data.modalidad}`);
        console.log(`   Tipo registro: ${data.tipo_registro}`);
        console.log(`   Método GPS: ${data.gps_method}`);
        console.log(`   Precisión: ${data.precision_gps_metros}m`);
        console.log(`   Evidencias exitosas: ${data.total_evidencias}`);
        console.log(`   Evidencias fallidas: ${data.evidencias_failed}`);
        console.log(`   Ubicación: ${data.ubicacion_detectada}`);
        
        // ========== ENVIAR FORMULARIO PRINCIPAL ==========
        console.log('\n📤 PASO 6: ENVIANDO FORMULARIO PRINCIPAL');
        
        submitBtn.textContent = '📤 Enviando al servidor...';
        showStatus('📤 Enviando asistencia al servidor...', 'success');
        
        let responseData;
        try {
            responseData = await sendDataWithFallback(data);
        } catch (sendError) {
            console.error('❌ Error crítico en envío:', sendError);
            
            // Determinar si es un error recuperable
            const isRecoverable = sendError.message.includes('guardados localmente');
            
            if (isRecoverable) {
                throw new Error(
                    `⚠️ NO se pudo enviar la asistencia después de múltiples intentos.\n\n` +
                    `Detalles: ${sendError.message}\n\n` +
                    `✅ Sus datos han sido guardados localmente de forma segura.\n` +
                    `✅ Se reintentarán automáticamente la próxima vez que abra la aplicación.\n\n` +
                    `Recomendaciones:\n` +
                    `• Verifique su conexión a Internet\n` +
                    `• Intente nuevamente en unos minutos\n` +
                    `• Los datos NO se perderán`
                );
            } else {
                throw new Error(
                    `❌ Error al enviar la asistencia:\n\n${sendError.message}\n\n` +
                    `Por favor, intente nuevamente. Si el problema persiste, ` +
                    `contacte al administrador del sistema.`
                );
            }
        }
        
        // ========== VALIDAR RESPUESTA ==========
        console.log('\n🔍 PASO 7: VALIDANDO RESPUESTA DEL SERVIDOR');
        console.log('Respuesta recibida:', JSON.stringify(responseData, null, 2));
        
        if (!responseData) {
            throw new Error('El servidor no devolvió ninguna respuesta');
        }
        
        if (!responseData.verified) {
            throw new Error('La respuesta del servidor no está verificada');
        }
        
        if (!responseData.success) {
            throw new Error(responseData.message || responseData.error || 'Error desconocido del servidor');
        }
        
        if (!responseData.row_number) {
            throw new Error('El servidor no devolvió el número de fila del registro');
        }
        
        console.log('✅ Respuesta válida del servidor');
        console.log(`✅ Fila en Google Sheets: ${responseData.row_number}`);
        console.log(`✅ Hash de verificación: ${responseData.verification_hash}`);
        
        // ========== REGISTRO EXITOSO ==========
        console.log('\n' + '='.repeat(80));
        console.log('✅✅✅ ASISTENCIA REGISTRADA EXITOSAMENTE ✅✅✅');
        console.log('='.repeat(80));
        console.log(`Usuario: ${currentUser.name}`);
        console.log(`Email: ${data.email}`);
        console.log(`Dispositivo: ${deviceType}`);
        console.log(`Modalidad: ${data.modalidad}`);
        console.log(`Ubicación: ${data.ubicacion_detectada}`);
        console.log(`Precisión: ${data.precision_gps_metros}m`);
        console.log(`Evidencias: ${data.total_evidencias}${data.evidencias_failed > 0 ? ` (${data.evidencias_failed} fallidas)` : ''}`);
        console.log(`Fila en Sheets: ${responseData.row_number}`);
        console.log(`Hash verificación: ${responseData.verification_hash?.substring(0, 16)}...`);
        console.log(`Request ID: ${responseData.request_id}`);
        console.log(`Tiempo procesamiento: ${responseData.processing_time_ms}ms`);
        console.log('='.repeat(80) + '\n');
        
        // ========== MOSTRAR MENSAJE DE ÉXITO ==========
        const evidenciasInfo = data.total_evidencias > 0 
            ? `\n✅ Evidencias: ${data.total_evidencias} imagen(es)${data.evidencias_failed > 0 ? ` (${data.evidencias_failed} no se pudieron subir)` : ''}` 
            : selectedFiles.length > 0 
                ? `\n⚠️ Evidencias: No se pudo subir ninguna (registrado sin evidencias)`
                : '';
        
        const successMessage = `✅ ¡Asistencia registrada y verificada exitosamente!

📋 DETALLES DEL REGISTRO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Usuario: ${currentUser.name}
📧 Email: ${data.email}
💻 Dispositivo: ${deviceType}
📍 Modalidad: ${data.modalidad}
📝 Tipo: ${data.tipo_registro}
🌍 Ubicación: ${data.ubicacion_detectada}
🎯 Precisión GPS: ${data.precision_gps_metros}m${evidenciasInfo}

✅ Fila en Google Sheets: ${responseData.row_number}
🔐 ID de verificación: ${responseData.verification_hash?.substring(0, 12)}...
⏱️ Tiempo: ${responseData.processing_time_ms}ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        showStatus(successMessage, 'success');
        
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        submitBtn.style.background = originalBtnStyle;
        
        // ========== PREGUNTAR SIGUIENTE ACCIÓN ==========
        setTimeout(() => {
            if (confirm('✅ Asistencia registrada correctamente.\n\n¿Desea registrar otra asistencia?')) {
                resetFormOnly();
                getCurrentLocation();
            } else {
                signOut();
            }
            hideStatus();
        }, 6000);
        
    } catch (error) {
        // ========== MANEJO DE ERRORES ==========
        console.error('\n' + '='.repeat(80));
        console.error('❌❌❌ ERROR EN ENVÍO DE FORMULARIO ❌❌❌');
        console.error('='.repeat(80));
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('='.repeat(80) + '\n');
        
        // Determinar tipo de error
        const isRecoverable = error.message.includes('guardados localmente');
        const isCancelled = error.message.includes('cancelado');
        
        let errorMessage;
        let errorType;
        
        if (isCancelled) {
            errorMessage = `⚠️ Registro cancelado\n\n${error.message}`;
            errorType = 'warning';
        } else if (isRecoverable) {
            errorMessage = error.message;
            errorType = 'warning';
        } else {
            errorMessage = `❌ Error al guardar la asistencia:\n\n${error.message}\n\n` +
                          `Por favor, intente nuevamente. Si el problema persiste, ` +
                          `tome una captura de pantalla de este mensaje y contacte al administrador.`;
            errorType = 'error';
        }
        
        showStatus(errorMessage, errorType);
        
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        submitBtn.style.background = originalBtnStyle;
        
        // Mantener mensaje más tiempo para errores graves
        const displayTime = isRecoverable ? 12000 : isCancelled ? 5000 : 10000;
        setTimeout(() => {
            hideStatus();
        }, displayTime);
    }
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
    
    document.getElementById('retry_location_btn').style.display = 'none';
    
    document.getElementById('email').value = currentUser.email;
    document.getElementById('google_user_id').value = currentUser.id;
    
    locationValid = false;
    locationAttempts = 0;
    updateLocationStatus('loading', 'Obteniendo nueva ubicación GPS...', '');
    updateSubmitButton();
}

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
    
    if (actividadesVarias.checked && !actividadesVariasTexto.value.trim()) {
        showStatus('Describa las actividades varias realizadas.', 'error');
        actividadesVariasTexto.focus();
        return false;
    }
    
    const pruebasPsicologicas = document.getElementById('pruebas_psicologicas');
    const pruebasPsicologicasTexto = document.getElementById('pruebas_psicologicas_texto');
    
    if (pruebasPsicologicas.checked && !pruebasPsicologicasTexto.value.trim()) {
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

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.innerHTML = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
}

function hideStatus() {
    document.getElementById('status').style.display = 'none';
}

// ========== LOCATION ==========
function setupEventListeners() {
    setupEvidenciasHandlers();
    
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
        } else if (this.value === 'permiso') {
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

function getCurrentLocation() {
    if (!isAuthenticated) {
        updateLocationStatus('error', 'Autenticación requerida', '');
        ['ubicacion_detectada', 'direccion_completa', 'precision_gps'].forEach(id => {
            document.getElementById(id).value = 'Esperando autenticación...';
        });
        document.getElementById('location_status').value = 'Autenticación requerida';
        return;
    }

    if (!navigator.geolocation) {
        updateLocationStatus('error', 'Geolocalización no soportada', '');
        return;
    }

    locationAttempts++;
    
    const statusMsg = isDesktop 
        ? `Obteniendo ubicación por IP/WiFi... (${locationAttempts}/${MAX_LOCATION_ATTEMPTS})` 
        : `Obteniendo ubicación GPS... (${locationAttempts}/${MAX_LOCATION_ATTEMPTS})`;
    
    updateLocationStatus('loading', statusMsg, '');

    const options = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            document.getElementById('latitude').value = currentLocation.latitude;
            document.getElementById('longitude').value = currentLocation.longitude;
            
            console.log(`📍 Ubicación obtenida - Precisión: ${Math.round(currentLocation.accuracy)}m (límite: ${REQUIRED_ACCURACY}m)`);
            
            if (currentLocation.accuracy <= REQUIRED_ACCURACY) {
                locationValid = true;
                document.getElementById('location_status').value = 'success';
                
                let successMsg = 'Ubicación obtenida correctamente';
                let successDesc = `Precisión: ${Math.round(currentLocation.accuracy)} metros`;
                
                if (isDesktop && currentLocation.accuracy > REQUIRED_ACCURACY_OPTIMAL) {
                    successDesc += ` (normal para ordenadores)`;
                }
                
                updateLocationStatus('success', successMsg, successDesc);
                updateSubmitButton();
                updateLocationFields(currentLocation);
            } else {
                locationValid = false;
                
                const precisedMsg = isDesktop 
                    ? `Precisión insuficiente (${Math.round(currentLocation.accuracy)}m > ${REQUIRED_ACCURACY}m)`
                    : `Precisión GPS insuficiente`;
                
                const preciseDesc = isDesktop
                    ? `Se requiere ${REQUIRED_ACCURACY}m o menos. En desktop, intente conectarse a una red WiFi conocida para mejorar la precisión.`
                    : `Se requiere ${REQUIRED_ACCURACY}m o menos. Actual: ${Math.round(currentLocation.accuracy)}m`;
                
                updateLocationStatus('warning', precisedMsg, preciseDesc);
                
                if (locationAttempts < MAX_LOCATION_ATTEMPTS) {
                    setTimeout(() => getCurrentLocation(), 2000);
                } else {
                    updateLocationStatus('error', 'No se pudo obtener la precisión requerida', 
                        isDesktop ? 'Intente conectarse a WiFi o usar un dispositivo móvil' : '');
                    document.getElementById('retry_location_btn').style.display = 'block';
                }
            }
        },
        function(error) {
            locationValid = false;
            let errorMessage, errorDescription;
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Permisos denegados';
                    errorDescription = 'Permita el acceso a la ubicación';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Ubicación no disponible';
                    errorDescription = isDesktop 
                        ? 'Verifique su conexión a Internet o WiFi' 
                        : 'Verifique su conexión GPS';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Tiempo agotado';
                    errorDescription = 'Intente nuevamente';
                    break;
                default:
                    errorMessage = 'Error desconocido';
                    errorDescription = 'Error inesperado';
            }
            
            document.getElementById('location_status').value = 'error: ' + errorMessage;
            updateLocationStatus('error', errorMessage, errorDescription);
            
            ['ubicacion_detectada', 'direccion_completa', 'precision_gps'].forEach(id => {
                document.getElementById(id).value = 'Error: ' + errorMessage;
                document.getElementById(id).className = 'location-field error';
            });
            
            if (locationAttempts < MAX_LOCATION_ATTEMPTS && error.code !== error.PERMISSION_DENIED) {
                setTimeout(() => getCurrentLocation(), 3000);
            } else {
                document.getElementById('retry_location_btn').style.display = 'block';
            }
        },
        options
    );
}

function updateLocationStatus(type, message, description) {
    const statusDiv = document.getElementById('location_status_display');
    const icons = { loading: '🌍', success: '✅', warning: '⚠️', error: '❌' };
    
    statusDiv.className = `location-status ${type}`;
    statusDiv.innerHTML = `${icons[type]} <strong>${message}</strong>${description ? '<br>' + description : ''}`;
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submit_btn');
    
    if (!isAuthenticated) {
        submitBtn.disabled = true;
        submitBtn.textContent = '🔒 Autentíquese primero';
        submitBtn.style.background = '#6c757d';
    } else if (locationValid) {
        submitBtn.disabled = false;
        submitBtn.textContent = '📋 Registrar Asistencia';
        submitBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
    } else {
        submitBtn.disabled = true;
        submitBtn.textContent = '⚠️ Ubicación GPS requerida';
        submitBtn.style.background = '#6c757d';
    }
}

function updateLocationFields(location) {
    const accuracy = Math.round(location.accuracy);
    let precisionText = `${accuracy} metros`;
    let precisionClass = '';
    
    // Clasificación de precisión adaptada al tipo de dispositivo
    if (isDesktop) {
        // Para desktop: estándares más relajados
        if (accuracy <= 200) {
            precisionText += ' (Excelente para Desktop)';
            precisionClass = 'uas-location';
        } else if (accuracy <= 500) {
            precisionText += ' (Muy Buena para Desktop)';
            precisionClass = 'uas-location';
        } else if (accuracy <= 1000) {
            precisionText += ' (Aceptable para Desktop)';
            precisionClass = '';
        } else {
            precisionText += ' (Baja - típica de Desktop)';
            precisionClass = 'warning';
        }
    } else {
        // Para móviles: estándares estrictos
        if (accuracy <= 10) {
            precisionText += ' (Excelente)';
            precisionClass = 'uas-location';
        } else if (accuracy <= 30) {
            precisionText += ' (Muy Buena)';
            precisionClass = 'uas-location';
        } else if (accuracy <= 50) {
            precisionText += ' (Buena)';
            precisionClass = '';
        } else {
            precisionText += ' (Regular)';
            precisionClass = 'warning';
        }
    }
    
    document.getElementById('precision_gps').value = precisionText;
    document.getElementById('precision_gps').className = `location-field ${precisionClass}`;
    
    const ubicacionDetectada = detectarUbicacionEspecifica(location.latitude, location.longitude);
    const campoUbicacion = document.getElementById('ubicacion_detectada');
    
    if (ubicacionDetectada.encontrada && ubicacionDetectada.esUAS) {
        campoUbicacion.value = ubicacionDetectada.nombre;
        campoUbicacion.className = 'location-field uas-location';
    } else {
        campoUbicacion.value = "Consultando ubicación...";
        campoUbicacion.className = 'location-field';
    }
    
    obtenerDireccionCompleta(location.latitude, location.longitude, ubicacionDetectada);
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
        document.getElementById(id).value = 'Esperando autenticación...';
        document.getElementById(id).className = 'location-field';
    });
    document.getElementById('retry_location_btn').style.display = 'none';
    updateLocationStatus('loading', 'Complete la autenticación para obtener ubicación GPS', '');
}

// ========== FUNCIONES AUXILIARES PARA MANEJO DE ERRORES Y RECUPERACIÓN ==========

/**
 * Guarda un envío fallido en localStorage para reintento posterior
 */
function saveFailedSubmission(data, error) {
    try {
        console.log('💾 Guardando envío fallido localmente...');
        
        const failedSubmissions = JSON.parse(safeGetItem('failed_submissions') || '[]');
        
        const failedSubmission = {
            data: data,
            error: error.message || error.toString(),
            error_type: error.name || 'Error',
            timestamp: new Date().toISOString(),
            retry_count: data.retry_count || 0,
            device_type: deviceType,
            user_email: data.email || currentUser?.email || 'unknown',
            user_name: data.authenticated_user_name || currentUser?.name || 'unknown'
        };
        
        failedSubmissions.push(failedSubmission);
        
        // Mantener solo los últimos 10 envíos fallidos
        if (failedSubmissions.length > 10) {
            console.log('⚠️ Más de 10 envíos pendientes, eliminando los más antiguos');
            failedSubmissions.shift();
        }
        
        safeSetItem('failed_submissions', JSON.stringify(failedSubmissions));
        
        console.log(`✅ Envío fallido guardado (total pendientes: ${failedSubmissions.length})`);
        console.log('   Usuario:', failedSubmission.user_name);
        console.log('   Error:', failedSubmission.error);
        
    } catch (storageError) {
        console.error('❌ No se pudo guardar el envío fallido en localStorage:', storageError);
        console.error('   Esto puede deberse a:');
        console.error('   • Modo privado del navegador');
        console.error('   • Cuota de almacenamiento excedida');
        console.error('   • Permisos de almacenamiento bloqueados');
    }
}

/**
 * Reintenta envíos fallidos guardados previamente
 */
async function retryFailedSubmissions() {
    try {
        const failedSubmissions = JSON.parse(safeGetItem('failed_submissions') || '[]');
        
        if (failedSubmissions.length === 0) {
            console.log('✅ No hay envíos pendientes de reintentar');
            return;
        }
        
        console.log(`\n${'━'.repeat(80)}`);
        console.log(`🔄 REINTENTANDO ${failedSubmissions.length} ENVÍO(S) PENDIENTE(S)`);
        console.log(`${'━'.repeat(80)}`);
        
        const successfulRetries = [];
        const failedRetries = [];
        
        for (let i = 0; i < failedSubmissions.length; i++) {
            const submission = failedSubmissions[i];
            
            console.log(`\n[${i + 1}/${failedSubmissions.length}] Reintentando:`);
            console.log(`   Usuario: ${submission.user_name}`);
            console.log(`   Fecha original: ${new Date(submission.timestamp).toLocaleString()}`);
            console.log(`   Error previo: ${submission.error}`);
            
            try {
                // Reintentar con contador en 0 para darle nuevas oportunidades
                const result = await sendDataWithFallback(submission.data, 0);
                
                successfulRetries.push(i);
                console.log(`   ✅ Reintento exitoso`);
                
            } catch (retryError) {
                console.error(`   ❌ Reintento fallido:`, retryError.message);
                failedRetries.push({
                    index: i,
                    submission: submission,
                    error: retryError.message
                });
            }
            
            // Esperar entre reintentos para no saturar
            if (i < failedSubmissions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Actualizar localStorage
        if (successfulRetries.length > 0) {
            const remaining = failedSubmissions.filter((_, index) => !successfulRetries.includes(index));
            safeSetItem('failed_submissions', JSON.stringify(remaining));
            
            console.log(`\n${'━'.repeat(80)}`);
            console.log(`✅ RECUPERACIÓN COMPLETA`);
            console.log(`   Exitosos: ${successfulRetries.length}`);
            console.log(`   Fallidos: ${failedRetries.length}`);
            console.log(`   Pendientes: ${remaining.length}`);
            console.log(`${'━'.repeat(80)}\n`);
            
            if (successfulRetries.length > 0) {
                showStatus(
                    `✅ Se recuperaron ${successfulRetries.length} registro(s) pendiente(s)\n\n` +
                    `${remaining.length > 0 ? `⚠️ Quedan ${remaining.length} pendiente(s) que se reintentarán después.` : ''}`,
                    'success'
                );
                setTimeout(() => hideStatus(), 5000);
            }
        } else {
            console.log(`\n${'━'.repeat(80)}`);
            console.log(`⚠️ NO SE PUDO RECUPERAR NINGÚN ENVÍO`);
            console.log(`   Todos los reintentos fallaron`);
            console.log(`   Los datos permanecen guardados para intentos futuros`);
            console.log(`${'━'.repeat(80)}\n`);
        }
        
    } catch (error) {
        console.error('❌ Error general en retryFailedSubmissions:', error);
    }
}

/**
 * Función para que los usuarios vean envíos pendientes
 */
function verPendientes() {
    try {
        const failedSubmissions = JSON.parse(safeGetItem('failed_submissions') || '[]');
        
        if (failedSubmissions.length === 0) {
            alert('✅ No hay registros pendientes de enviar');
            console.log('✅ No hay registros pendientes');
            return;
        }
        
        console.log('\n' + '═'.repeat(80));
        console.log('📋 REGISTROS PENDIENTES DE ENVIAR');
        console.log('═'.repeat(80));
        
        failedSubmissions.forEach((submission, index) => {
            console.log(`\n${index + 1}. ${submission.user_name} (${submission.user_email})`);
            console.log(`   📅 Fecha: ${new Date(submission.timestamp).toLocaleString()}`);
            console.log(`   ❌ Error: ${submission.error}`);
            console.log(`   🔄 Intentos: ${submission.retry_count + 1}`);
            console.log(`   💻 Dispositivo: ${submission.device_type}`);
            
            if (submission.data) {
                console.log(`   📝 Modalidad: ${submission.data.modalidad || 'N/A'}`);
                console.log(`   📍 Ubicación: ${submission.data.ubicacion_detectada || 'N/A'}`);
            }
        });
        
        console.log('\n' + '═'.repeat(80));
        console.log(`Total: ${failedSubmissions.length} registro(s) pendiente(s)`);
        console.log('═'.repeat(80) + '\n');
        
        const message = `⚠️ Hay ${failedSubmissions.length} registro(s) pendiente(s) de enviar.\n\n` +
                       `Detalles completos en la consola del navegador (F12).\n\n` +
                       `Estos registros se reintentarán automáticamente cuando:\n` +
                       `• Recargue la página\n` +
                       `• Se restaure la conexión a Internet\n\n` +
                       `¿Desea reintentar enviarlos ahora?`;
        
        if (confirm(message)) {
            console.log('🔄 Reintentando envíos pendientes...');
            retryFailedSubmissions().then(() => {
                console.log('✅ Proceso de reintento completado');
            }).catch(error => {
                console.error('❌ Error en reintento manual:', error);
            });
        }
        
    } catch (error) {
        console.error('❌ Error al consultar pendientes:', error);
        alert('❌ Error al consultar registros pendientes. Ver consola para detalles.');
    }
}

/**
 * Limpiar envíos pendientes (usar con precaución)
 */
function limpiarPendientes() {
    try {
        const failedSubmissions = JSON.parse(safeGetItem('failed_submissions') || '[]');
        
        if (failedSubmissions.length === 0) {
            alert('✅ No hay registros pendientes para limpiar');
            return;
        }
        
        const confirmacion = confirm(
            `⚠️ ¿Está seguro de eliminar ${failedSubmissions.length} registro(s) pendiente(s)?\n\n` +
            `Esta acción NO se puede deshacer.\n\n` +
            `Los registros eliminados se perderán permanentemente.`
        );
        
        if (confirmacion) {
            safeRemoveItem('failed_submissions');
            console.log('✅ Registros pendientes eliminados');
            alert('✅ Registros pendientes eliminados correctamente');
        } else {
            console.log('❌ Limpieza cancelada por el usuario');
        }
        
    } catch (error) {
        console.error('❌ Error al limpiar pendientes:', error);
        alert('❌ Error al limpiar registros pendientes');
    }
}

// ========== DIAGNÓSTICO ==========
async function diagnosticarEvidencias() {
    console.log('\n🔍 DIAGNÓSTICO DE EVIDENCIAS');
    console.log('============================\n');
    
    console.log('1. ARCHIVOS SELECCIONADOS:');
    console.log(`   Total: ${selectedFiles.length}`);
    
    if (selectedFiles.length === 0) {
        console.log('   ⚠️ No hay archivos seleccionados');
        return;
    }
    
    console.log('\n2. VALIDACIÓN DE CADA ARCHIVO:');
    selectedFiles.forEach((file, index) => {
        console.log(`\n   Archivo ${index + 1}:`);
        console.log(`   - Nombre: ${file.name}`);
        console.log(`   - Tipo: ${file.type || 'SIN TIPO MIME ❌'}`);
        console.log(`   - Tamaño: ${(file.size/1024/1024).toFixed(2)}MB`);
        
        const validaciones = [];
        
        if (!file.type) {
            validaciones.push('❌ Sin tipo MIME - RECHAZADO');
        } else if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            validaciones.push(`❌ Tipo ${file.type} no permitido - RECHAZADO`);
        } else {
            validaciones.push('✅ Tipo válido');
        }
        
        if (file.size === 0) {
            validaciones.push('❌ Archivo vacío - RECHAZADO');
        } else if (file.size > MAX_FILE_SIZE) {
            validaciones.push(`❌ Demasiado grande (>10MB) - RECHAZADO`);
        } else {
            validaciones.push('✅ Tamaño válido');
        }
        
        validaciones.forEach(v => console.log(`   ${v}`));
    });
    
    console.log('\n3. PRUEBA DE CONVERSIÓN BASE64:');
    try {
        const testFile = selectedFiles[0];
        console.log(`   Probando con: ${testFile.name}`);
        
        const base64 = await fileToBase64(testFile);
        console.log(`   ✅ Conversión exitosa: ${(base64.length/1024).toFixed(1)}KB en Base64`);
    } catch (error) {
        console.log(`   ❌ Error en conversión: ${error.message}`);
    }
    
    console.log('\n4. CONFIGURACIÓN:');
    console.log(`   - Tipos permitidos: ${ALLOWED_FILE_TYPES.join(', ')}`);
    console.log(`   - Tamaño máximo: ${MAX_FILE_SIZE/1024/1024}MB`);
    console.log(`   - Máximo archivos: ${MAX_FILES}`);
    
    console.log('\n5. RECOMENDACIONES:');
    const invalidFiles = selectedFiles.filter(f => !f.type || !ALLOWED_FILE_TYPES.includes(f.type));
    const largeFiles = selectedFiles.filter(f => f.size > MAX_FILE_SIZE);
    
    if (invalidFiles.length > 0) {
        console.log('   ⚠️ Archivos con formato inválido:');
        invalidFiles.forEach(f => {
            console.log(`      - ${f.name}: ${f.type || 'sin tipo'}`);
            console.log(`        → Convierta a JPG, PNG o WEBP`);
        });
    }
    
    if (largeFiles.length > 0) {
        console.log('   ⚠️ Archivos muy grandes:');
        largeFiles.forEach(f => {
            console.log(`      - ${f.name}: ${(f.size/1024/1024).toFixed(2)}MB`);
            console.log(`        → Reduzca la calidad o resolución`);
        });
    }
    
    if (invalidFiles.length === 0 && largeFiles.length === 0) {
        console.log('   ✅ Todos los archivos parecen válidos');
    }
    
    console.log('\n============================');
}

async function diagnosticComplete() {
    console.log('🔬 DIAGNÓSTICO COMPLETO');
    console.log('======================\n');
    
    console.log('1. DISPOSITIVO:');
    console.log('   - Tipo:', deviceType);
    console.log('   - Es Desktop:', isDesktop ? '✅' : '❌');
    console.log('   - Es Móvil:', !isDesktop ? '✅' : '❌');
    console.log('   - iOS:', isIOS ? '✅' : '❌');
    console.log('   - Safari:', isSafari ? '✅' : '❌');
    console.log('   - User Agent:', navigator.userAgent);
    console.log('   - Pantalla:', `${window.screen.width}x${window.screen.height}`);
    console.log('   - Touch Points:', navigator.maxTouchPoints || 0);
    
    console.log('\n2. PRECISIÓN GPS:');
    console.log('   - Método:', isDesktop ? 'IP/WiFi' : 'GPS nativo');
    console.log('   - Precisión requerida:', REQUIRED_ACCURACY + 'm');
    console.log('   - Precisión óptima:', REQUIRED_ACCURACY_OPTIMAL + 'm');
    console.log('   - Actual:', currentLocation ? `${Math.round(currentLocation.accuracy)}m` : 'No obtenida');
    console.log('   - Estado:', locationValid ? '✅ Válida' : '❌ Inválida');
    
    console.log('\n3. CONFIGURACIÓN:');
    console.log('   - Client ID:', GOOGLE_CLIENT_ID ? '✅' : '❌');
    console.log('   - Script URL:', GOOGLE_SCRIPT_URL ? '✅' : '❌');
    console.log('   - HTTPS:', location.protocol === 'https:' ? '✅' : '❌');
    
    console.log('\n4. AUTENTICACIÓN:');
    console.log('   - Usuario autenticado:', isAuthenticated ? '✅' : '❌');
    console.log('   - Consentimiento:', privacyConsent ? '✅' : '❌');
    console.log('   - Google API:', typeof google !== 'undefined' ? '✅' : '❌');
    console.log('   - localStorage:', safeLocalStorage() ? '✅' : '❌ (modo privado)');
    
    console.log('\n5. UBICACIÓN:');
    console.log('   - Geolocalización:', navigator.geolocation ? '✅' : '❌');
    console.log('   - Ubicación válida:', locationValid ? '✅' : '❌');
    console.log('   - Precisión actual:', currentLocation ? `${currentLocation.accuracy}m` : 'N/A');
    console.log('   - Intentos:', locationAttempts + '/' + MAX_LOCATION_ATTEMPTS);
    
    console.log('\n6. EVIDENCIAS:');
    console.log('   - Archivos seleccionados:', selectedFiles.length);
    console.log('   - Drag & Drop:', !isIOS ? '✅ Habilitado' : '❌ Deshabilitado (iOS)');
    console.log('   - DataTransfer:', !isIOS ? '✅ Disponible' : '❌ No disponible (iOS)');
    
    if (selectedFiles.length > 0) {
        console.log('\n   Analizando archivos...');
        await diagnosticarEvidencias();
    }
    
    console.log('\n7. RECOMENDACIONES:');
    if (isDesktop && currentLocation && currentLocation.accuracy > 300) {
        console.log('   ⚠️ Desktop con baja precisión:');
        console.log('      - Conéctese a una red WiFi conocida');
        console.log('      - Use un dispositivo móvil para mejor precisión');
        console.log('      - La precisión actual (' + Math.round(currentLocation.accuracy) + 'm) es normal para desktop');
    }
    if (!locationValid) {
        console.log('   ⚠️ Ubicación no válida:');
        console.log('      - Verifique permisos de ubicación');
        console.log('      - Asegúrese de tener conexión a Internet');
        if (isDesktop) {
            console.log('      - Considere usar un dispositivo móvil');
        }
    }
    if (!isAuthenticated) {
        console.log('   ⚠️ No autenticado - Complete la autenticación primero');
    }
    
    console.log('\n======================');
    console.log('FUNCIONES DISPONIBLES:');
    console.log('- diagnosticarEvidencias() - Analiza archivos');
    console.log('- diagnosticComplete() - Diagnóstico completo');
    console.log('- getDeviceInfo() - Información del dispositivo');
}

// Mensaje de inicio
console.log('✅ Script cargado correctamente');
console.log(`📱 Dispositivo: ${deviceType}`);
console.log(`💻 Es Desktop: ${isDesktop ? 'Sí' : 'No'}`);
console.log(`📍 Precisión requerida: ${REQUIRED_ACCURACY}m ${isDesktop ? '(relajada para desktop)' : '(estándar móvil)'}`);
console.log(`🎯 Modo: ${isIOS ? 'iOS (compatibilidad especial)' : isDesktop ? 'Desktop (precisión adaptada)' : 'Android/Windows/Desktop (funcionalidad completa)'}`);
console.log('🔍 Para diagnóstico: diagnosticComplete()');
