// ========== DETECCIÓN DE DISPOSITIVO Y NAVEGADOR ==========
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

const MAX_RETRIES = 5; // Aumentado de 3 a 5
const RETRY_DELAY = 3000; // Aumentado de 2s a 3s
const SUBMISSION_TIMEOUT = 45000; // Aumentado de 20s a 45s
const VERIFICATION_TIMEOUT = 10000; // Nuevo: timeout para verificación

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

function generateSubmissionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `SUB_${timestamp}_${userEmail.split('@')[0]}_${random}`;
}

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
    console.log('=== INFORMACIÓN DEL DISPOSITIVO ===');
    console.log('Tipo:', deviceType);
    console.log('Es Desktop:', isDesktop);
    console.log('Precisión requerida:', REQUIRED_ACCURACY + 'm');
    console.log('Precisión óptima:', REQUIRED_ACCURACY_OPTIMAL + 'm');
    
    if (isDesktop) {
        console.log('⚠️ MODO DESKTOP ACTIVADO');
        console.log('   Los ordenadores no tienen GPS integrado.');
        console.log('   La ubicación se obtiene por IP/WiFi (menor precisión).');
        console.log('   Precisión aceptada: hasta ' + REQUIRED_ACCURACY + 'm');
        showDesktopWarning();
    }
    
    if (isIOS) {
        console.log('🎯 Modo iOS activado - Aplicando compatibilidad especial');
        checkHTTPS();
    }
    
    initializeForm();
    setupEventListeners();
    loadGoogleSignInScript();
    updateCurrentTime();
    checkPrivacyConsent();
    setInterval(updateCurrentTime, 1000);
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
    
    console.log('🔐 Procesando credenciales de Google...');
    
    const userInfo = parseJwt(response.credential);
    
    if (!userInfo) {
      throw new Error('No se pudo decodificar el token de Google');
    }
    
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

    console.log('✅ Usuario autenticado:', currentUser.email);

    if (authenticationPurpose === 'revoke') {
      await handleRevocationFlow();
    } else {
      await handleLoginFlow();
    }
  } catch (error) {
    console.error('❌ Error procesando credenciales:', error);
    showStatus(
      `Error en la autenticación: ${error.message}\n\n` +
      `Por favor, intente nuevamente o use otro navegador.`,
      'error'
    );
    
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
    if (!token || typeof token !== 'string') {
      throw new Error('Token inválido');
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Formato de token incorrecto');
    }
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decodificar con manejo de errores
    let jsonPayload;
    try {
      jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (decodeError) {
      throw new Error('Error decodificando token: ' + decodeError.message);
    }
    
    const parsed = JSON.parse(jsonPayload);
    
    // Validar campos obligatorios
    if (!parsed.sub || !parsed.email) {
      throw new Error('Token no contiene datos de usuario válidos');
    }
    
    return parsed;
    
  } catch (error) {
    console.error('❌ Error parsing JWT:', error);
    showStatus(
      `Error procesando autenticación de Google.\n` +
      `Detalles: ${error.message}\n\n` +
      `Intente cerrar esta pestaña y abrir la aplicación nuevamente.`,
      'error'
    );
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
  const submissionId = data.submission_id || generateSubmissionId();
  data.submission_id = submissionId;
  
  console.log(`📤 Intento ${retryCount + 1}/${MAX_RETRIES}`);
  console.log(`🆔 Submission ID: ${submissionId}`);
  
  return new Promise(async (resolve, reject) => {
    let responseReceived = false;
    let timeoutId;
    
    // Crear FormData para envío
    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value || '');
      }
    }
    
    try {
      // ⏱️ Timeout general
      timeoutId = setTimeout(() => {
        if (!responseReceived) {
          console.error('⏱️ Timeout general alcanzado');
          handleRetry('Timeout - sin respuesta del servidor');
        }
      }, SUBMISSION_TIMEOUT);
      
      // 🚀 ENVÍO CON FETCH (más confiable que iframe)
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors' // Necesario para Google Apps Script
      });
      
      // ⚠️ no-cors no permite leer la respuesta directamente
      // Por eso usamos verificación externa
      
      console.log('📨 Datos enviados, iniciando verificación...');
      
      // ✅ VERIFICACIÓN EXTERNA (método más confiable)
      await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar 3s
      
      const verified = await verifySubmissionExternal(submissionId, data.email);
      
      if (verified.found) {
        responseReceived = true;
        clearTimeout(timeoutId);
        console.log('✅ VERIFICACIÓN EXITOSA');
        resolve({
          success: true,
          confirmed: true,
          submission_id: submissionId,
          row_number: verified.row_number,
          message: 'Registro confirmado mediante verificación externa',
          ...verified
        });
      } else {
        throw new Error('Verificación falló - registro no encontrado');
      }
      
    } catch (error) {
      console.error('❌ Error en envío/verificación:', error);
      handleRetry(error.message);
    }
    
    function handleRetry(errorMsg) {
      clearTimeout(timeoutId);
      
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`🔄 Reintentando en ${RETRY_DELAY/1000}s...`);
        setTimeout(() => {
          sendDataWithFallback(data, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }, RETRY_DELAY);
      } else {
        reject(new Error(
          `No se pudo confirmar el registro después de ${MAX_RETRIES} intentos.\n` +
          `Último error: ${errorMsg}\n\n` +
          `Submission ID: ${submissionId}\n` +
          `Email: ${data.email}\n\n` +
          `Por favor, contacte al administrador con esta información.`
        ));
      }
    }
  });
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
async function verifySubmissionExternal(submissionId, email) {
  try {
    const verifyUrl = `${GOOGLE_SCRIPT_URL}?action=verify_submission&submission_id=${encodeURIComponent(submissionId)}&email=${encodeURIComponent(email)}`;
    
    console.log('🔍 Verificando mediante URL externa...');
    
    const response = await fetch(verifyUrl, {
      method: 'GET',
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error('Error en verificación HTTP');
    }
    
    const result = await response.json();
    console.log('📊 Resultado verificación:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error en verificación externa:', error);
    
    // Fallback: esperar más y reintentar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const retryResponse = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=verify_submission&submission_id=${encodeURIComponent(submissionId)}&email=${encodeURIComponent(email)}`,
        { method: 'GET', cache: 'no-cache' }
      );
      return await retryResponse.json();
    } catch (retryError) {
      return { success: false, found: false };
    }
  }
}

// MODIFICAR handleSubmit (línea ~1050 aprox)
async function handleSubmit(e) {
  e.preventDefault();
  
  // Validaciones previas...
  if (!isAuthenticated || !currentUser) {
    showStatus('❌ Debe autenticarse con Google antes de continuar.', 'error');
    return;
  }
  
  if (!locationValid || !currentLocation) {
    showStatus('❌ Se requiere ubicación GPS válida.', 'error');
    return;
  }
  
  if (!validateConditionalFields()) {
    return;
  }
  
  const submitBtn = document.querySelector('.submit-btn');
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Guardando asistencia...';
  submitBtn.style.background = '#6c757d';
  
  const submissionId = generateSubmissionId();
  
  try {
    console.log('\n🚀 INICIANDO PROCESO DE REGISTRO');
    console.log('🆔 Submission ID:', submissionId);
    console.log('================================');
    
    // FASE 1: Subir evidencias
    let evidenciasUrls = [];
    if (selectedFiles.length > 0) {
      console.log(`\n📤 FASE 1: Subiendo ${selectedFiles.length} evidencia(s)...`);
      submitBtn.textContent = `⏳ Subiendo ${selectedFiles.length} evidencia(s)...`;
      
      try {
        evidenciasUrls = await uploadEvidencias();
        const successUploads = evidenciasUrls.filter(e => e.uploadStatus === 'SUCCESS');
        
        if (selectedFiles.length > 0 && successUploads.length === 0) {
          const userDecision = confirm(
            '⚠️ No se pudo subir ninguna evidencia.\n\n' +
            '¿Desea continuar sin evidencias?'
          );
          if (!userDecision) {
            throw new Error('Registro cancelado por el usuario');
          }
        }
      } catch (uploadError) {
        console.error('❌ Error en evidencias:', uploadError);
        const continuar = confirm(
          `Error subiendo evidencias: ${uploadError.message}\n\n` +
          '¿Desea continuar sin evidencias?'
        );
        if (!continuar) throw uploadError;
      }
    }
    
    // FASE 2: Preparar datos
    console.log('\n📋 FASE 2: Preparando datos...');
    submitBtn.textContent = '⏳ Preparando datos...';
    
    const formData = new FormData(e.target);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      if (key === 'evidencias') continue;
      
      if (key.endsWith('[]')) {
        const cleanKey = key.replace('[]', '');
        if (!data[cleanKey]) data[cleanKey] = [];
        data[cleanKey].push(value);
      } else {
        data[key] = value;
      }
    }
    
    // Agregar datos críticos
    const successUploads = evidenciasUrls.filter(e => e.uploadStatus === 'SUCCESS');
    data.evidencias_urls = evidenciasUrls;
    data.total_evidencias = successUploads.length;
    data.evidencias_nombres = successUploads.map(e => e.fileName).join(', ');
    data.carpeta_evidencias = generateStudentFolderName();
    data.modalidad = document.getElementById('modalidad').value;
    data.ubicacion_detectada = document.getElementById('ubicacion_detectada').value;
    data.direccion_completa = document.getElementById('direccion_completa').value;
    data.precision_gps = document.getElementById('precision_gps').value;
    data.precision_gps_metros = Math.round(currentLocation.accuracy);
    data.location_validation = 'passed';
    data.authenticated_user_name = currentUser.name;
    data.authentication_timestamp = new Date().toISOString();
    data.device_type = deviceType;
    data.is_desktop = isDesktop;
    data.submission_id = submissionId;
    
    // Validación final
    if (!data.modalidad || data.modalidad === '') {
      throw new Error('El campo Modalidad es requerido');
    }
    
    // FASE 3: Enviar y verificar
    console.log('\n📤 FASE 3: Enviando al servidor...');
    submitBtn.textContent = '⏳ Enviando y verificando...';
    
    const responseData = await sendDataWithFallback(data);
    
    // ✅ CONFIRMACIÓN EXITOSA
    if (responseData && responseData.confirmed === true) {
      console.log('✅ REGISTRO CONFIRMADO');
      
      const evidenciasInfo = data.total_evidencias > 0 
        ? `\n✅ Evidencias: ${data.total_evidencias} imagen(es)` 
        : '';
      
      showStatus(
        `✅ ¡Asistencia registrada y confirmada!\n\n` +
        `Usuario: ${currentUser.name}\n` +
        `Modalidad: ${data.modalidad}\n` +
        `Ubicación: ${data.ubicacion_detectada}\n` +
        `Precisión: ${data.precision_gps_metros}m${evidenciasInfo}\n\n` +
        `Fila: ${responseData.row_number}\n` +
        `ID: ${submissionId.substring(0, 20)}...`,
        'success'
      );
      
      setTimeout(() => {
        if (confirm('¿Desea registrar otra asistencia?')) {
          resetFormOnly();
          getCurrentLocation();
        } else {
          signOut();
        }
        hideStatus();
      }, 8000); // Mostrar 8 segundos
      
    } else {
      throw new Error('Respuesta del servidor no confirmó el registro');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR EN REGISTRO:', error);
    
    showStatus(
      `❌ ERROR: No se pudo confirmar el registro\n\n` +
      `Motivo: ${error.message}\n\n` +
      `Submission ID:\n${submissionId}\n\n` +
      `Por favor, tome captura de pantalla de este mensaje ` +
      `y contacte al administrador.`,
      'error'
    );
    
    // Restaurar botón
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
    submitBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
    
    // Mantener error visible más tiempo
    setTimeout(() => hideStatus(), 15000);
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
    
    // Formatear mensaje con saltos de línea
    const formattedMessage = message.replace(/\n/g, '<br>');
    
    status.innerHTML = formattedMessage;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    // Scroll al mensaje
    status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

async function diagnosticoCompletoMejorado() {
  console.log('\n🔬 DIAGNÓSTICO COMPLETO DEL SISTEMA v2.0');
  console.log('==========================================\n');
  
  console.log('1. CONFIGURACIÓN:');
  console.log(`   ✓ Google Script URL: ${GOOGLE_SCRIPT_URL}`);
  console.log(`   ✓ Client ID: ${GOOGLE_CLIENT_ID.substring(0, 20)}...`);
  console.log(`   ✓ Max Retries: ${MAX_RETRIES}`);
  console.log(`   ✓ Timeout: ${SUBMISSION_TIMEOUT}ms`);
  
  console.log('\n2. AUTENTICACIÓN:');
  console.log(`   ${isAuthenticated ? '✅' : '❌'} Autenticado`);
  console.log(`   ${privacyConsent ? '✅' : '❌'} Consentimiento`);
  console.log(`   Usuario: ${currentUser?.name || 'N/A'}`);
  console.log(`   Email: ${currentUser?.email || 'N/A'}`);
  
  console.log('\n3. UBICACIÓN:');
  console.log(`   ${locationValid ? '✅' : '❌'} Válida`);
  console.log(`   Precisión: ${currentLocation?.accuracy || 'N/A'}m`);
  console.log(`   Requerida: ${REQUIRED_ACCURACY}m`);
  console.log(`   Latitud: ${currentLocation?.latitude || 'N/A'}`);
  console.log(`   Longitud: ${currentLocation?.longitude || 'N/A'}`);
  
  console.log('\n4. EVIDENCIAS:');
  console.log(`   Archivos: ${selectedFiles.length}/${MAX_FILES}`);
  if (selectedFiles.length > 0) {
    selectedFiles.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file.name} (${(file.size/1024).toFixed(1)}KB)`);
    });
  }
  
  console.log('\n5. DISPOSITIVO:');
  console.log(`   Tipo: ${deviceType}`);
  console.log(`   Desktop: ${isDesktop ? 'Sí' : 'No'}`);
  console.log(`   iOS: ${isIOS ? 'Sí' : 'No'}`);
  console.log(`   Safari: ${isSafari ? 'Sí' : 'No'}`);
  
  console.log('\n6. PRUEBA DE CONECTIVIDAD:');
  try {
    console.log('   Probando conexión al servidor...');
    
    const testResponse = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'GET',
      cache: 'no-cache'
    });
    
    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log('   ✅ Servidor respondiendo:', data);
    } else {
      console.log('   ⚠️ Respuesta HTTP:', testResponse.status);
    }
  } catch (error) {
    console.log('   ❌ Error de conexión:', error.message);
  }
  
  console.log('\n7. PRUEBA DE GOOGLE API:');
  console.log(`   ${typeof google !== 'undefined' ? '✅' : '❌'} Google API cargada`);
  if (typeof google !== 'undefined') {
    console.log(`   ${google.accounts ? '✅' : '❌'} Google Accounts disponible`);
  }
  
  console.log('\n8. ALMACENAMIENTO LOCAL:');
  console.log(`   ${safeLocalStorage() ? '✅' : '❌'} localStorage disponible`);
  
  console.log('\n9. RECOMENDACIONES:');
  const issues = [];
  
  if (!isAuthenticated) {
    issues.push('   ⚠️ Complete la autenticación primero');
  }
  if (!locationValid) {
    issues.push('   ⚠️ Ubicación no válida - verifique permisos GPS');
  }
  if (isDesktop && currentLocation && currentLocation.accuracy > 500) {
    issues.push('   ⚠️ Baja precisión GPS en desktop - considere usar móvil');
  }
  if (!safeLocalStorage()) {
    issues.push('   ⚠️ Navegación privada detectada - datos no persistirán');
  }
  if (selectedFiles.length === 0 && document.getElementById('tipo_registro').value === 'salida') {
    issues.push('   💡 Considere agregar evidencias para salidas');
  }
  
  if (issues.length === 0) {
    console.log('   ✅ Sistema listo para registrar asistencia');
  } else {
    issues.forEach(issue => console.log(issue));
  }
  
  console.log('\n==========================================');
  console.log('FUNCIONES DISPONIBLES:');
  console.log('- diagnosticoCompletoMejorado()');
  console.log('- testSubmissionComplete()');
  console.log('- testGoogleAuth()');
  console.log('- verificarRegistro(submissionId, email)');
  console.log('==========================================\n');
  
  return {
    authenticated: isAuthenticated,
    location_valid: locationValid,
    ready: isAuthenticated && locationValid
  };
}

// NUEVA FUNCIÓN: Prueba completa de registro
async function testSubmissionComplete() {
  console.log('\n🧪 PRUEBA COMPLETA DE REGISTRO');
  console.log('==============================\n');
  
  if (!isAuthenticated) {
    console.log('❌ No autenticado - complete la autenticación primero');
    return;
  }
  
  if (!locationValid) {
    console.log('❌ Ubicación no válida - obtenga ubicación GPS primero');
    return;
  }
  
  console.log('Preparando datos de prueba...');
  
  const testData = {
    timestamp: new Date().toISOString(),
    email: currentUser.email,
    google_user_id: currentUser.id,
    authenticated_user_name: currentUser.name,
    authentication_timestamp: new Date().toISOString(),
    latitude: currentLocation.latitude.toString(),
    longitude: currentLocation.longitude.toString(),
    location_status: 'success',
    ubicacion_detectada: document.getElementById('ubicacion_detectada').value,
    direccion_completa: document.getElementById('direccion_completa').value,
    precision_gps: document.getElementById('precision_gps').value,
    precision_gps_metros: Math.round(currentLocation.accuracy).toString(),
    location_validation: 'passed',
    nombre: 'PRUEBA',
    apellido_paterno: 'SISTEMA',
    apellido_materno: 'TEST',
    tipo_estudiante: 'servicio_social',
    modalidad: 'presencial',
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toTimeString().split(' ')[0].substring(0, 5),
    tipo_registro: 'entrada',
    permiso_detalle: '',
    otro_detalle: '',
    intervenciones_psicologicas: '0',
    ninos_ninas: '0',
    adolescentes: '0',
    adultos: '0',
    mayores_60: '0',
    familia: '0',
    actividades: '',
    actividades_varias_texto: '',
    pruebas_psicologicas_texto: '',
    comentarios_adicionales: 'REGISTRO DE PRUEBA - ELIMINAR',
    total_evidencias: '0',
    evidencias_nombres: '',
    carpeta_evidencias: 'PRUEBA_SISTEMA_TEST',
    device_type: deviceType,
    is_desktop: isDesktop,
    submission_id: generateSubmissionId()
  };
  
  console.log('📤 Enviando registro de prueba...');
  console.log('Submission ID:', testData.submission_id);
  
  try {
    const result = await sendDataWithFallback(testData);
    
    console.log('\n✅ PRUEBA EXITOSA');
    console.log('Resultado:', result);
    console.log('\n⚠️ IMPORTANTE: Elimine manualmente el registro de prueba');
    console.log(`Fila: ${result.row_number}`);
    console.log(`Submission ID: ${testData.submission_id}`);
    
    return result;
    
  } catch (error) {
    console.error('\n❌ PRUEBA FALLIDA');
    console.error('Error:', error.message);
    return null;
  }
}

// NUEVA FUNCIÓN: Verificar registro manualmente
async function verificarRegistro(submissionId, email) {
  console.log('\n🔍 VERIFICANDO REGISTRO');
  console.log('======================\n');
  console.log('Submission ID:', submissionId);
  console.log('Email:', email || userEmail);
  
  try {
    const result = await verifySubmissionExternal(
      submissionId, 
      email || userEmail
    );
    
    if (result.found) {
      console.log('\n✅ REGISTRO ENCONTRADO');
      console.log('Fila:', result.row_number);
      console.log('Timestamp:', result.timestamp);
      console.log('Modalidad:', result.modalidad);
      console.log('Tipo registro:', result.tipo_registro);
    } else {
      console.log('\n❌ REGISTRO NO ENCONTRADO');
      console.log('El registro puede no haberse guardado correctamente');
    }
    
    return result;
    
  } catch (error) {
    console.error('\n❌ ERROR EN VERIFICACIÓN');
    console.error(error);
    return null;
  }
}

// NUEVA FUNCIÓN: Test de autenticación
function testGoogleAuth() {
  console.log('\n🔐 TEST DE AUTENTICACIÓN GOOGLE');
  console.log('================================\n');
  
  console.log('1. Google API:');
  console.log(`   ${typeof google !== 'undefined' ? '✅' : '❌'} Cargada`);
  
  if (typeof google !== 'undefined') {
    console.log(`   ${google.accounts ? '✅' : '❌'} Accounts API`);
    console.log(`   ${google.accounts?.id ? '✅' : '❌'} ID API`);
  }
  
  console.log('\n2. Client ID configurado:');
  console.log(`   ${GOOGLE_CLIENT_ID ? '✅' : '❌'} ${GOOGLE_CLIENT_ID?.substring(0, 30)}...`);
  
  console.log('\n3. Estado actual:');
  console.log(`   Autenticado: ${isAuthenticated ? '✅' : '❌'}`);
  console.log(`   Usuario: ${currentUser?.email || 'N/A'}`);
  console.log(`   Nombre: ${currentUser?.name || 'N/A'}`);
  
  console.log('\n4. Consentimiento:');
  console.log(`   Privacidad: ${privacyConsent ? '✅' : '❌'}`);
  
  if (!isAuthenticated) {
    console.log('\n💡 Para autenticarse, haga clic en "Iniciar Sesión con Google"');
  }
  
  console.log('\n================================\n');
}

// Exponer funciones globales para debugging
window.diagnosticoCompletoMejorado = diagnosticoCompletoMejorado;
window.testSubmissionComplete = testSubmissionComplete;
window.verificarRegistro = verificarRegistro;
window.testGoogleAuth = testGoogleAuth;

console.log('✅ Frontend v2.1 con verificación garantizada cargado');
console.log('📋 Funciones disponibles:');
console.log('   - diagnosticoCompletoMejorado()');
console.log('   - testSubmissionComplete()');
console.log('   - testGoogleAuth()');
console.log('   - verificarRegistro(submissionId, email)');
