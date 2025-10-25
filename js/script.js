// ========== DETECCIÃ“N DE DISPOSITIVO Y NAVEGADOR ==========
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Detectar si es un ordenador de escritorio/laptop
const isDesktop = detectDesktop();
const deviceType = getDeviceType();

console.log(`ðŸ“± Tipo dispositivo: ${deviceType}`);
console.log(`ðŸ’» Es Desktop: ${isDesktop ? 'SÃ­' : 'No'}`);
console.log(`ðŸ“± Es iOS: ${isIOS ? 'SÃ­' : 'No'}`);
console.log(`ðŸŒ Navegador: ${isSafari ? 'Safari' : 'Otro'}`);

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
// PrecisiÃ³n ajustada segÃºn tipo de dispositivo
const REQUIRED_ACCURACY = isDesktop ? 1000 : 50; // 1000m para desktop, 50m para mÃ³viles
const REQUIRED_ACCURACY_OPTIMAL = isDesktop ? 300 : 30; // PrecisiÃ³n Ã³ptima
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PRIVACY_VERSION = '1.0';
// *** FIX: Aumentar tiempos de espera para verificaciÃ³n ***
const TIEMPO_ESPERA_INICIAL = 15000; // 15s inicial (aumentado)
const TIEMPO_ENTRE_VERIFICACIONES = [5000, 10000, 15000]; // Solo 3 intentos con tiempos largos
const VERIFICATION_ATTEMPTS = 3; // Reducido de 5 a 3
const ENABLE_VERIFICATION_FALLBACK = true; // Modo fallback cuando falle verificaciÃ³n

//PRODUCCION
//const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyllBO0vTORygvLlbTeRWfNXz1_Dt1khrM2z_BUxbNM6jWqEGYDqaLnd7LJs9Fl9Q9X/exec';
//const GOOGLE_CLIENT_ID = '799841037062-kal4vump3frc2f8d33bnp4clc9amdnng.apps.googleusercontent.com';
//PRUEBAS
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw10UgiYsuGYi16MisVfk7fx-wlGU-gUmCKTz2bZmyqys_2ku1ghZ9zzv71UncZ_sXlDg/exec';
const GOOGLE_CLIENT_ID = '154864030871-ck4l5krb7qm68kmp6a7rcq7h072ldm6g.apps.googleusercontent.com';

const ubicacionesUAS = [
    { name: "CESPSIC - Centro de Servicios PsicolÃ³gicos", lat: 24.8278, lng: -107.3812, radius: 50 },
    { name: "Facultad de PsicologÃ­a UAS", lat: 24.7993, lng: -107.3950, radius: 100 },
    { name: "Universidad AutÃ³noma de Sinaloa - Campus Central", lat: 24.7990, lng: -107.3950, radius: 200 }
];

// ========== FUNCIONES DE DETECCIÃ“N DE DISPOSITIVO ==========
function detectDesktop() {
    const ua = navigator.userAgent.toLowerCase();
    
    // Detectar sistemas operativos de escritorio
    const isWindows = /windows nt/.test(ua);
    const isMacOS = /macintosh|mac os x/.test(ua) && navigator.maxTouchPoints <= 1;
    const isLinux = /linux/.test(ua) && !/android/.test(ua);
    
    // Detectar si NO es mÃ³vil
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    
    // Es desktop si tiene OS de escritorio Y no es mÃ³vil
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

// Inicializar aplicaciÃ³n
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== INFORMACIÃ“N DEL DISPOSITIVO ===');
    console.log('Tipo:', deviceType);
    console.log('Es Desktop:', isDesktop);
    console.log('PrecisiÃ³n requerida:', REQUIRED_ACCURACY + 'm');
    console.log('PrecisiÃ³n Ã³ptima:', REQUIRED_ACCURACY_OPTIMAL + 'm');
    
    if (isDesktop) {
        console.log('âš ï¸ MODO DESKTOP ACTIVADO');
        console.log('   Los ordenadores no tienen GPS integrado.');
        console.log('   La ubicaciÃ³n se obtiene por IP/WiFi (menor precisiÃ³n).');
        console.log('   PrecisiÃ³n aceptada: hasta ' + REQUIRED_ACCURACY + 'm');
        showDesktopWarning();
    }
    
    if (isIOS) {
        console.log('ðŸŽ¯ Modo iOS activado - Aplicando compatibilidad especial');
        checkHTTPS();
    }
    
    initializeForm();
    setupEventListeners();
    loadGoogleSignInScript();
    updateCurrentTime();
    checkPrivacyConsent();
    setInterval(updateCurrentTime, 1000);
});

// ========== VALIDACIÃ“N HTTPS PARA iOS ==========
function checkHTTPS() {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.warn('âš ï¸ iOS requiere HTTPS para geolocalizaciÃ³n');
        showStatus('âš ï¸ Se recomienda usar HTTPS para mejor funcionalidad en iOS', 'warning');
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
            <strong>ðŸ’» Dispositivo Desktop Detectado (${deviceType})</strong><br>
            Los ordenadores no tienen GPS integrado y usan ubicaciÃ³n por IP/WiFi.<br>
            <strong>PrecisiÃ³n esperada:</strong> 100-1000 metros (vs 5-50m en mÃ³viles)<br>
            â„¹ï¸ El sistema aceptarÃ¡ precisiones de hasta ${REQUIRED_ACCURACY} metros.
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
        console.warn('âš ï¸ localStorage no disponible (modo privado)', e);
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
    console.warn('âš ï¸ localStorage bloqueado - datos no persistirÃ¡n');
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
    signinBtnText.textContent = 'Iniciar SesiÃ³n con Google';
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
    showStatus('Debe aceptar el aviso de privacidad para usar la aplicaciÃ³n.', 'error');
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
    showStatus('Error cargando sistema de autenticaciÃ³n.', 'error');
  }
}

function proceedWithGoogleSignIn() {
    if (isIOS) {
        showIOSGoogleButton();
    } else {
        showVisibleGoogleButton();
    }
}

// ========== iOS: BOTÃ“N GOOGLE (USA MODAL HTML EXISTENTE) ==========
function showIOSGoogleButton() {
    const modal = document.getElementById('privacy-modal');
    const modalHeader = modal.querySelector('.modal-header');
    const modalBody = modal.querySelector('.modal-body');
    const modalFooter = modal.querySelector('.modal-footer');
    
    modalHeader.innerHTML = '<h2>ðŸ” AutenticaciÃ³n con Google</h2>';
    modalBody.innerHTML = `
        <p style="text-align: center; margin-bottom: 20px; color: #666;">
            Haga clic en el botÃ³n azul para continuar:
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
        showStatus('Debe completar la autenticaciÃ³n.', 'error');
        setTimeout(() => hideStatus(), 5000);
    }
}

// ========== OTROS NAVEGADORES: MODAL DINÃMICO ==========
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
        <h3 style="margin-bottom: 20px; color: #333;">AutenticaciÃ³n con Google</h3>
        <p style="margin-bottom: 20px; color: #666;">Haga clic en el botÃ³n azul para continuar:</p>
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
            showStatus('Su cuenta de Gmail no estÃ¡ verificada.', 'error');
            return;
        }

        if (authenticationPurpose === 'revoke') {
            await handleRevocationFlow();
        } else {
            await handleLoginFlow();
        }
    } catch (error) {
        console.error('Error procesando credenciales:', error);
        showStatus('Error en la autenticaciÃ³n.', 'error');
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
        showStatus('Debe completar la autenticaciÃ³n.', 'error');
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
        
        showStatus(`Â¡Bienvenido ${currentUser.name}! AutenticaciÃ³n exitosa.`, 'success');
        setTimeout(() => { showTodayRecords(); updateRegistrosSection(); }, 1000);
        setTimeout(() => hideStatus(), 3000);
    } catch (error) {
        console.error('Error en flujo de login:', error);
        privacyConsent = false;
        updatePrivacyUI();
        showStatus('Error registrando la autenticaciÃ³n.', 'error');
    }
}

async function handleRevocationFlow() {
    try {
        await revokePrivacyConsent();
    } catch (error) {
        console.error('Error en flujo de revocaciÃ³n:', error);
        showStatus('Error durante la revocaciÃ³n.', 'error');
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
    authTitle.textContent = 'âœ… AutenticaciÃ³n Exitosa';
    authTitle.classList.add('authenticated');

    document.getElementById('user-avatar').src = currentUser.picture;
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('user-name').textContent = currentUser.name;
    userInfo.classList.add('show');
    signinContainer.style.display = 'none';
  } else {
    authSection.classList.remove('authenticated');
    authTitle.textContent = 'ðŸ”’ AutenticaciÃ³n Requerida';
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

    showStatus('SesiÃ³n cerrada correctamente.', 'success');
    setTimeout(() => hideStatus(), 3000);
    setTimeout(() => initializeGoogleSignIn(), 1000);
  } catch (error) {
    console.error('Error cerrando sesiÃ³n:', error);
    showStatus('Error al cerrar sesiÃ³n.', 'error');
  }
}

// ========== EVIDENCIAS (iOS COMPATIBLE) ==========
function setupEvidenciasHandlers() {
    const evidenciasInput = document.getElementById('evidencias');
    
    if (isIOS) {
        // iOS: Evento simple, sin drag & drop
        console.log('ðŸŽ¯ iOS: Configurando manejo simple de archivos');
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
    console.log(`ðŸ“± iOS: Procesando ${files.length} archivo(s)...`);
    
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];
    
    fileArray.forEach(file => {
        console.log(`Archivo: ${file.name}, Tipo: ${file.type}, TamaÃ±o: ${(file.size/1024/1024).toFixed(2)}MB`);
        
        if (!file.type) {
            errors.push(`${file.name}: Sin tipo MIME`);
            console.warn(`âŒ ${file.name}: No tiene tipo MIME`);
            return;
        }
        
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            errors.push(`${file.name}: Solo JPG, PNG, WEBP`);
            console.warn(`âŒ ${file.name}: Tipo no permitido`);
            return;
        }
        
        const sizeMB = file.size / 1024 / 1024;
        if (file.size > MAX_FILE_SIZE) {
            errors.push(`${file.name}: ${sizeMB.toFixed(1)}MB (mÃ¡x. 10MB)`);
            console.warn(`âŒ ${file.name}: Muy grande`);
            return;
        }
        
        validFiles.push(file);
        console.log(`âœ… ${file.name}: VÃ¡lido`);
    });
    
    if (selectedFiles.length + validFiles.length > MAX_FILES) {
        errors.push(`MÃ¡ximo ${MAX_FILES} imÃ¡genes (ya tiene ${selectedFiles.length})`);
        showEvidenciasStatus(errors.join('<br>'), 'error');
        console.warn(`âŒ LÃ­mite excedido`);
        return;
    }
    
    if (errors.length > 0) {
        showEvidenciasStatus(errors.join('<br>'), 'error');
        console.warn(`âš ï¸ ${errors.length} archivo(s) rechazado(s)`);
    }
    
    // iOS: Guardar archivos directamente (NO tocar input.files)
    validFiles.forEach(file => {
        selectedFiles.push(file);
        addFilePreview(file, selectedFiles.length - 1);
    });
    
    if (validFiles.length > 0) {
        showEvidenciasStatus(`${validFiles.length} imagen(es) agregada(s).`, 'success');
        console.log(`âœ… Total iOS: ${selectedFiles.length}`);
    }
}

// Android/Windows: Manejo completo de archivos (CON DataTransfer)
function handleFileSelection(files) {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];
    
    console.log(`ðŸ” Procesando ${fileArray.length} archivo(s)...`);
    
    fileArray.forEach(file => {
        console.log(`Archivo: ${file.name}, Tipo: ${file.type}, TamaÃ±o: ${(file.size/1024/1024).toFixed(2)}MB`);
        
        if (!file.type) {
            errors.push(`${file.name}: Sin tipo MIME (intente otro formato)`);
            console.warn(`âŒ ${file.name}: No tiene tipo MIME`);
            return;
        }
        
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            errors.push(`${file.name}: Formato no vÃ¡lido (solo JPG, PNG, WEBP)`);
            console.warn(`âŒ ${file.name}: Tipo ${file.type} no permitido`);
            return;
        }
        
        const sizeMB = file.size / 1024 / 1024;
        if (file.size > MAX_FILE_SIZE) {
            errors.push(`${file.name}: ${sizeMB.toFixed(1)}MB (mÃ¡x. 10MB)`);
            console.warn(`âŒ ${file.name}: Demasiado grande (${sizeMB.toFixed(1)}MB)`);
            return;
        }
        
        validFiles.push(file);
        console.log(`âœ… ${file.name}: VÃ¡lido`);
    });
    
    if (selectedFiles.length + validFiles.length > MAX_FILES) {
        errors.push(`MÃ¡ximo ${MAX_FILES} imÃ¡genes (ya tiene ${selectedFiles.length})`);
        showEvidenciasStatus(errors.join('<br>'), 'error');
        console.warn(`âŒ LÃ­mite de archivos excedido`);
        return;
    }
    
    if (errors.length > 0) {
        showEvidenciasStatus(errors.join('<br>'), 'error');
        console.warn(`âš ï¸ ${errors.length} archivo(s) rechazado(s)`);
    }
    
    validFiles.forEach(file => {
        selectedFiles.push(file);
        addFilePreview(file, selectedFiles.length - 1);
    });
    
    updateFileInput();
    
    if (validFiles.length > 0) {
        showEvidenciasStatus(`${validFiles.length} imagen(es) agregada(s) correctamente.`, 'success');
        console.log(`âœ… Total de archivos seleccionados: ${selectedFiles.length}`);
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
            <button type="button" class="evidencia-remove" onclick="removeFile(${index})">Ã—</button>
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
        console.log('ðŸŽ¯ iOS: Saltando updateFileInput (no soportado)');
        return;
    }
    
    try {
        const input = document.getElementById('evidencias');
        const dt = new DataTransfer();
        selectedFiles.forEach(file => dt.items.add(file));
        input.files = dt.files;
    } catch (error) {
        console.warn('âš ï¸ Error actualizando input.files:', error);
        // No es crÃ­tico, continuar normal
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
        console.log('â„¹ï¸ No hay archivos para subir');
        return [];
    }
    
    console.log(`ðŸ“¤ Iniciando subida de ${selectedFiles.length} archivo(s)...`);
    
    const tipoRegistro = document.getElementById('tipo_registro').value || 'sin_tipo';
    const evidenciasInfo = [];
    
    showEvidenciasStatus('Preparando archivos para subir...', 'loading');
    
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileName = generateEvidenciaFileName(tipoRegistro, i);
        const extension = file.name.split('.').pop();
        const fullFileName = `${fileName}.${extension}`;
        
        try {
            console.log(`ðŸ“¤ [${i+1}/${selectedFiles.length}] Procesando: ${file.name}`);
            showEvidenciasStatus(`Subiendo imagen ${i + 1}/${selectedFiles.length}: ${file.name}`, 'loading');
            
            if (!file || !file.type || file.size === 0) {
                throw new Error('Archivo invÃ¡lido o corrupto');
            }
            
            let base64Data;
            try {
                base64Data = await fileToBase64(file);
                console.log(`âœ… ConversiÃ³n Base64 exitosa: ${(base64Data.length/1024).toFixed(1)}KB`);
            } catch (b64Error) {
                console.error(`âŒ Error en conversiÃ³n Base64:`, b64Error);
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
            
            console.log(`ðŸš€ Enviando archivo ${i + 1}: ${fullFileName} (${file.type})`);
            
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
            
            console.log(`âœ… Archivo ${fullFileName} enviado exitosamente`);
            
        } catch (error) {
            console.error(`âŒ Error subiendo archivo ${file.name}:`, error);
            
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
                `âš ï¸ Error en ${file.name}: ${error.message}`, 
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
    
    console.log(`\nðŸ“Š RESUMEN DE SUBIDA:`);
    console.log(`   âœ… Exitosas: ${successCount}`);
    console.log(`   âŒ Fallidas: ${failCount}`);
    console.log(`   ðŸ“ Total: ${evidenciasInfo.length}`);
    
    if (failCount > 0) {
        console.log(`\nâš ï¸ ARCHIVOS FALLIDOS:`);
        evidenciasInfo.filter(e => e.uploadStatus === 'FAILED').forEach(e => {
            console.log(`   - ${e.originalName}: ${e.error}`);
        });
    }
    
    if (successCount > 0) {
        showEvidenciasStatus(
            `âœ… ${successCount} evidencia(s) subida(s)${failCount > 0 ? ` (${failCount} errores - revise consola)` : ''}`, 
            failCount > 0 ? 'warning' : 'success'
        );
    } else if (failCount > 0) {
        showEvidenciasStatus(
            `âŒ No se pudo subir ninguna evidencia. Errores: ${evidenciasInfo.map(e => e.error).join(', ')}`, 
            'error'
        );
    }
    
    return evidenciasInfo;
}

async function sendDataWithFallback(data) {
  console.warn('âš ï¸ sendDataWithFallback obsoleto, use ');
  return sendDataWithIframe(data);
}

function generateEvidenciaFileName(tipoRegistro, index) {
    const apellidoPaterno = document.getElementById('apellido_paterno').value || 'Sin_Apellido';
    const apellidoMaterno = document.getElementById('apellido_materno').value || 'Sin_Apellido';
    const nombre = document.getElementById('nombre').value || 'Sin_Nombre';
    const fecha = new Date();
    
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const aÃ±o = fecha.getFullYear();
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minuto = String(fecha.getMinutes()).padStart(2, '0');
    const segundo = String(fecha.getSeconds()).padStart(2, '0');
    const consecutivo = String(index + 1).padStart(3, '0');
    
    const nombreLimpio = `${apellidoPaterno}_${apellidoMaterno}_${nombre}`.replace(/[^a-zA-Z0-9_]/g, '');
    const fechaFormateada = `${dia}_${mes}_${aÃ±o}`;
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
            reject(new Error('Archivo no vÃ¡lido'));
            return;
        }
        
        if (!file.type) {
            reject(new Error('Archivo sin tipo MIME'));
            return;
        }
        
        if (file.size === 0) {
            reject(new Error('Archivo vacÃ­o (0 bytes)'));
            return;
        }
        
        if (file.size > MAX_FILE_SIZE) {
            reject(new Error(`Archivo muy grande: ${(file.size/1024/1024).toFixed(1)}MB`));
            return;
        }
        
        console.log(`ðŸ“„ Convirtiendo ${file.name} a Base64...`);
        
        const reader = new FileReader();
        
        reader.onload = () => {
            try {
                const result = reader.result;
                if (!result || typeof result !== 'string') {
                    reject(new Error('Error: resultado de lectura invÃ¡lido'));
                    return;
                }
                
                const base64 = result.split(',')[1];
                if (!base64 || base64.length === 0) {
                    reject(new Error('Error: conversiÃ³n Base64 fallÃ³'));
                    return;
                }
                
                console.log(`âœ… Base64 generado: ${(base64.length/1024).toFixed(1)}KB`);
                resolve(base64);
            } catch (error) {
                console.error('âŒ Error procesando Base64:', error);
                reject(new Error(`Error al procesar: ${error.message}`));
            }
        };
        
        reader.onerror = (error) => {
            console.error('âŒ Error leyendo archivo:', error);
            reject(new Error(`Error al leer archivo: ${file.name}`));
        };
        
        reader.onabort = () => {
            console.error('âŒ Lectura abortada');
            reject(new Error('Lectura de archivo abortada'));
        };
        
        try {
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('âŒ Error iniciando lectura:', error);
            reject(new Error(`No se pudo leer el archivo: ${error.message}`));
        }
    });
}

// ========== GENERACIÃ“N DE REGISTRO ID ÃšNICO ==========
function generateRegistroID() {
  const timestamp = new Date().getTime();
  const email = userEmail ? userEmail.substring(0, 10) : 'unknown';
  const random = Math.random().toString(36).substring(2, 10);
  const registroID = `REG_${timestamp}_${email}_${random}`.replace(/[^a-zA-Z0-9_]/g, '');
  
  console.log('ðŸ“‹ Registro ID generado:', registroID);
  return registroID;
}

// ========== FUNCIÃ“N SLEEP ==========
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== ENVÃO CON VERIFICACIÃ“N, REINTENTOS E IDEMPOTENCIA ==========
async function sendWithVerification(data, attempt = 1) {
  const MAX_ATTEMPTS = 3;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ðŸš€ INTENTO ${attempt}/${MAX_ATTEMPTS}`);
  console.log(`Registro ID: ${data.registro_id}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    // ========== PASO 1: VALIDAR DATOS ANTES DE ENVIAR ==========
    console.log('ðŸ” Validando datos antes de enviar...');
    
    if (!data.modalidad || data.modalidad === '' || data.modalidad === 'undefined' || data.modalidad === 'null') {
      throw new Error('VALIDACIÃ“N: Campo Modalidad vacÃ­o o invÃ¡lido');
    }
    
    if (!data.email || !data.google_user_id) {
      throw new Error('VALIDACIÃ“N: Datos de autenticaciÃ³n faltantes');
    }
    
    if (!data.latitude || !data.longitude) {
      throw new Error('VALIDACIÃ“N: Coordenadas GPS faltantes');
    }
    
    if (!data.registro_id || data.registro_id.trim() === '') {
      throw new Error('VALIDACIÃ“N: registro_id vacÃ­o');
    }
    
    console.log('âœ… ValidaciÃ³n previa exitosa');
    
    // ========== PASO 2: ENVIAR DATOS ==========
    console.log('ðŸ“¤ Enviando datos al backend...');
    await sendDataWithIframe(data);
    
    console.log('âœ… Formulario enviado al servidor');
    
    // â­â­â­ FIX: Esperar tiempo adecuado para procesamiento â­â­â­
    console.log(`â±ï¸ Esperando ${TIEMPO_ESPERA_INICIAL/1000}s para procesamiento inicial...`);
    await sleep(TIEMPO_ESPERA_INICIAL);
    
    // ========== PASO 3: VERIFICACIÃ“N CON MANEJO MEJORADO DE ERRORES ==========
    console.log(`\nðŸ” INICIANDO VERIFICACIÃ“N (${VERIFICATION_ATTEMPTS} intentos)...`);
    
    let verificationResult = null;
    let verificationSuccess = false;
    let networkErrors = 0;
    
    for (let v = 1; v <= VERIFICATION_ATTEMPTS; v++) {
      console.log(`\nðŸ” VerificaciÃ³n ${v}/${VERIFICATION_ATTEMPTS}...`);
      
      try {
        verificationResult = await verifyWithScriptTag(data.registro_id);
        
        console.log('Resultado verificaciÃ³n:', verificationResult);
        
        // â­ NUEVO: Detectar errores de red
        if (verificationResult.error && (
          verificationResult.error.includes('red') || 
          verificationResult.error.includes('network') ||
          verificationResult.error.includes('403') ||
          verificationResult.error.includes('DISCONNECTED') ||
          verificationResult.timeout
        )) {
          networkErrors++;
          console.warn(`âš ï¸ Error de red detectado (${networkErrors}/${VERIFICATION_ATTEMPTS})`);
          
          // Si tenemos mÃºltiples errores de red consecutivos, asumir que SÃ se guardÃ³
          if (attempt >= MAX_ATTEMPTS && networkErrors >= 2 && ENABLE_VERIFICATION_FALLBACK) {
            console.log('âš ï¸âš ï¸ MODO FALLBACK ACTIVADO');
            console.log('MÃºltiples errores de red - Asumiendo que el registro SÃ se guardÃ³');
            
            return {
              success: true,
              verified: false, // No verificado directamente
              exists: true, // Asumimos que existe
              assumedSaved: true, // â­ NUEVO FLAG
              networkIssues: true,
              data: {
                registro_id: data.registro_id,
                row_number: 'No verificable',
                timestamp: new Date().toISOString(),
                message: 'âš ï¸ Registro enviado pero no verificable por problemas de red. VERIFIQUE MANUALMENTE en Google Sheets.',
                user_name: data.authenticated_user_name,
                modalidad: data.modalidad,
                ubicacion: data.ubicacion_detectada,
                search_method: 'fallback_network_errors'
              },
              attempts: attempt,
              verification_attempts: v,
              network_errors: networkErrors
            };
          }
        }
        
        // Verificar si existe y estÃ¡ confirmado
        if (verificationResult.success && verificationResult.verified && verificationResult.exists) {
          verificationSuccess = true;
          console.log(`âœ…âœ… REGISTRO VERIFICADO en fila ${verificationResult.row_number}`);
          break;
        }
        
        // Si no existe, seguir intentando
        if (!verificationResult.exists && !verificationResult.error) {
          console.log(`â³ Registro aÃºn no encontrado (intento ${v}/${VERIFICATION_ATTEMPTS})`);
          
          if (v < VERIFICATION_ATTEMPTS) {
            const waitTime = TIEMPO_ENTRE_VERIFICACIONES[v - 1] || 5000;
            console.log(`â±ï¸ Esperando ${waitTime/1000}s antes de verificar nuevamente...`);
            await sleep(waitTime);
          }
        }
      } catch (verifyError) {
        console.error(`âš ï¸ Error en verificaciÃ³n ${v}:`, verifyError.message);
        networkErrors++;
        
        if (v < VERIFICATION_ATTEMPTS) {
          await sleep(3000);
        }
      }
    }
    
    // ========== PASO 4: EVALUAR RESULTADO ==========
    if (verificationSuccess && verificationResult) {
      console.log('\nâœ…âœ…âœ… REGISTRO COMPLETADO Y VERIFICADO');
      
      return {
        success: true,
        verified: true,
        exists: true,
        data: {
          registro_id: data.registro_id,
          row_number: verificationResult.row_number,
          timestamp: verificationResult.timestamp,
          message: 'Registro guardado y verificado exitosamente',
          user_name: data.authenticated_user_name,
          modalidad: data.modalidad,
          ubicacion: data.ubicacion_detectada,
          search_method: verificationResult.search_method || 'unknown'
        },
        attempts: attempt,
        verification_attempts: VERIFICATION_ATTEMPTS,
        network_errors: networkErrors
      };
    } else {
      // NO SE PUDO VERIFICAR
      console.warn('\nâš ï¸âš ï¸ NO SE PUDO VERIFICAR EL REGISTRO');
      console.warn('Errores de red detectados:', networkErrors);
      
      // â­â­â­ FIX CRÃTICO: Si hay errores de red, NO reintentar todo â­â­â­
      if (networkErrors >= 2 && ENABLE_VERIFICATION_FALLBACK) {
        console.log('\nâš ï¸ ACTIVANDO MODO FALLBACK FINAL');
        console.log('El sistema asume que el registro SÃ se guardÃ³');
        console.log('IMPORTANTE: Usuario debe verificar manualmente');
        
        return {
          success: true,
          verified: false,
          exists: true,
          assumedSaved: true,
          networkIssues: true,
          mustVerifyManually: true,
          data: {
            registro_id: data.registro_id,
            row_number: 'No verificable',
            timestamp: new Date().toISOString(),
            message: 'âš ï¸ Registro probablemente guardado pero no verificable. VERIFIQUE MANUALMENTE.',
            user_name: data.authenticated_user_name,
            modalidad: data.modalidad,
            ubicacion: data.ubicacion_detectada,
            search_method: 'fallback_final'
          },
          attempts: attempt,
          verification_attempts: VERIFICATION_ATTEMPTS,
          network_errors: networkErrors
        };
      }
      
      // Si no hay errores de red, intentar reenvÃ­o completo
      if (attempt < MAX_ATTEMPTS) {
        const waitTime = 10000 * attempt;
        console.log(`\nðŸ”„ Reintentando envÃ­o completo (${attempt + 1}/${MAX_ATTEMPTS})...`);
        console.log(`â³ Esperando ${waitTime/1000}s...`);
        await sleep(waitTime);
        
        return sendWithVerification(data, attempt + 1);
      }
      
      // Si ya agotamos intentos, retornar error
      throw new Error('No se pudo verificar el registro despuÃ©s de mÃºltiples intentos');
    }
    
  } catch (error) {
    console.error(`\nâŒ Error en intento ${attempt}:`, error.message);
    
    if (attempt < MAX_ATTEMPTS) {
      const waitTime = 5000 * attempt;
      console.log(`â³ Esperando ${waitTime/1000}s antes de reintentar...`);
      await sleep(waitTime);
      
      return sendWithVerification(data, attempt + 1);
    } else {
      console.error('\nâŒâŒ TODOS LOS INTENTOS FALLARON');
      
      return {
        success: false,
        verified: false,
        exists: false,
        error: error.message,
        attempts: attempt,
        registro_id: data.registro_id,
        note: 'El registro NO se guardÃ³. Intente nuevamente.'
      };
    }
  }
}

// ========== VERIFICACIÃ“N SIMPLE CON GET ==========
async function verifyWithSimpleGet(registroID) {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.style.display = 'none';
    
    const verifyUrl = `${GOOGLE_SCRIPT_URL}?action=verify&registro_id=${encodeURIComponent(registroID)}&format=text&_t=${Date.now()}`;
    
    // Usar fetch con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    fetch(verifyUrl, {
      method: 'GET',
      signal: controller.signal,
      mode: 'no-cors', // Modo no-cors para evitar bloqueos
      cache: 'no-cache'
    })
    .then(() => {
      clearTimeout(timeoutId);
      // En modo no-cors no podemos leer la respuesta
      // AsÃ­ que asumimos que se enviÃ³ y verificamos de otra forma
      
      // Intentar verificaciÃ³n alternativa con script tag
      return (registroID);
    })
    .then(result => {
      resolve(result);
    })
    .catch(error => {
      clearTimeout(timeoutId);
      console.warn('Fetch fallÃ³, intentando con script tag:', error.message);
      
      // Fallback a script tag
      (registroID)
        .then(resolve)
        .catch(reject);
    });
  });
}

// ========== VERIFICAR CON SCRIPT TAG (JSONP) ==========
async function verifyWithScriptTag(registroID) {
  console.log('ðŸ” Verificando con script tag JSONP...');
  
  return new Promise((resolve) => {
    const callbackName = 'verify_' + Date.now().toString().substring(5);
    const scriptId = 'script_' + callbackName;
    
    // â­ FIX: Timeout aumentado y mejor manejo de errores de red
    const timeoutId = setTimeout(() => {
      cleanup();
      console.warn('â±ï¸ Timeout en verificaciÃ³n JSONP (20s)');
      resolve({
        success: false,
        verified: false,
        exists: false,
        error: 'Timeout en verificaciÃ³n - posible problema de red',
        timeout: true,
        networkError: true
      });
    }, 20000); // 20 segundos
    
    // Callback global
    window[callbackName] = function(result) {
      clearTimeout(timeoutId);
      console.log('âœ… JSONP callback recibido:', result);
      cleanup();
      resolve(result);
    };
    
    // Crear script
    const script = document.createElement('script');
    script.id = scriptId;
    script.onerror = function(event) {
      clearTimeout(timeoutId);
      console.error('âŒ Error cargando script JSONP');
      console.error('Evento error:', event);
      
      // â­ NUEVO: Detectar tipo de error
      const errorType = event.type || 'unknown';
      const errorMsg = event.message || 'Error de red o 403 - servidor no accesible';
      
      cleanup();
      resolve({
        success: false,
        verified: false,
        exists: false,
        error: errorMsg,
        errorType: errorType,
        networkError: true, // â­ FLAG IMPORTANTE
        code403: true // â­ FLAG IMPORTANTE
      });
    };
    
    script.src = `${GOOGLE_SCRIPT_URL}?action=verify&registro_id=${encodeURIComponent(registroID)}&callback=${callbackName}&_t=${Date.now()}`;
    
    function cleanup() {
      try {
        const scriptEl = document.getElementById(scriptId);
        if (scriptEl && document.body.contains(scriptEl)) {
          document.body.removeChild(scriptEl);
        }
        delete window[callbackName];
      } catch (e) {}
    }
    
    document.body.appendChild(script);
  });
}

// ========== ENVIAR DATOS CON IFRAME (MEJORADO) ==========
async function sendDataWithIframe(data) {
  console.log('ðŸ“¨ Enviando con iframe (sin leer respuesta)...');
  
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.name = 'response_frame_' + Date.now();
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = GOOGLE_SCRIPT_URL;
    form.target = iframe.name;
    form.style.display = 'none';
    
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
    
    document.body.appendChild(iframe);
    document.body.appendChild(form);
    
    console.log('ðŸ“® Enviando formulario...');
    form.submit();
    
    // Esperar 5 segundos y asumir que se enviÃ³
    // NO intentamos leer el iframe por CORS
    setTimeout(() => {
      console.log('â±ï¸ 5 segundos transcurridos, asumiendo envÃ­o completado');
      
      // Limpiar
      try {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        if (document.body.contains(form)) document.body.removeChild(form);
      } catch (e) {}
      
      // Retornar respuesta que requiere verificaciÃ³n
      resolve({
        success: true,
        verified: false,
        message: 'Datos enviados (verificaciÃ³n requerida)',
        needs_verification: true
      });
    }, 5000);
  });
}

// ========== VERIFICAR REGISTRO EN SHEETS ==========
async function verifyRegistro(registroID) {
  console.log('ðŸ” Verificando registro:', registroID);
  
  // Intentar con script tag directamente
  try {
    const result = await verifyWithScriptTag(registroID);
    return result;
  } catch (error) {
    console.error('âŒ Error en verificaciÃ³n:', error);
    return {
      success: false,
      verified: false,
      exists: false,
      error: error.message
    };
  }
}

// ========== VERIFICAR CON IFRAME (FALLBACK) ==========
async function verifyWithIframe(registroID) {
  console.log('ðŸ” Verificando con iframe GET...');
  
  return new Promise((resolve) => {
    // Crear un script tag en lugar de iframe para evitar CORS
    const scriptId = 'verify_script_' + Date.now();
    const callbackName = 'verifyCallback_' + Date.now().toString().substring(5);
    
    // Definir callback global temporal
    window[callbackName] = function(result) {
      console.log('âœ… Callback recibido:', result);
      cleanup();
      resolve(result);
    };
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `${GOOGLE_SCRIPT_URL}?action=verify&registro_id=${encodeURIComponent(registroID)}&callback=${callbackName}&_t=${Date.now()}`;
    
    script.onerror = function(error) {
      console.error('âŒ Error cargando script de verificaciÃ³n');
      cleanup();
      resolve({
        success: false,
        verified: false,
        exists: false,
        error: 'Error de red en verificaciÃ³n'
      });
    };
    
    const timeoutId = setTimeout(() => {
      console.warn('â±ï¸ Timeout en verificaciÃ³n (10s)');
      cleanup();
      resolve({
        success: false,
        verified: false,
        exists: false,
        error: 'Timeout en verificaciÃ³n'
      });
    }, 10000);
    
    function cleanup() {
      try {
        clearTimeout(timeoutId);
        const scriptElement = document.getElementById(scriptId);
        if (scriptElement) document.body.removeChild(scriptElement);
        delete window[callbackName];
      } catch (e) {
        console.warn('Error en cleanup:', e);
      }
    }
    
    console.log('ðŸ“¡ Cargando script de verificaciÃ³n...');
    document.body.appendChild(script);
  });
}

// ========== FORM SUBMISSION ==========
async function handleSubmit(e) {
  e.preventDefault();
  
  console.log('\n' + '='.repeat(70));
  console.log('ðŸš€ INICIANDO ENVÃO (MODO IDEMPOTENTE CON VERIFICACIÃ“N MEJORADA)');
  console.log('='.repeat(70));
  
  // ========== VALIDACIONES INICIALES ==========
  if (!isAuthenticated || !currentUser) {
    showStatus('âŒ Debe autenticarse con Google', 'error');
    return;
  }
  
  if (!locationValid || !currentLocation) {
    showStatus('âŒ UbicaciÃ³n GPS requerida', 'error');
    return;
  }
  
  if (currentLocation.accuracy > REQUIRED_ACCURACY) {
    showStatus(`âŒ PrecisiÃ³n GPS insuficiente: ${Math.round(currentLocation.accuracy)}m`, 'error');
    return;
  }
  
  if (!validateConditionalFields()) {
    return;
  }
  
  // Deshabilitar botÃ³n de envÃ­o
  const submitBtn = document.querySelector('.submit-btn');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'â³ Procesando...';
  
  try {
    // ========== GENERAR ID ÃšNICO ==========
    const registroID = generateRegistroID();
    
    console.log('ðŸ“‹ ID:', registroID);
    console.log('ðŸ‘¤ Usuario:', currentUser.name);
    console.log('ðŸ“± Dispositivo:', deviceType);
    console.log('ðŸŽ¯ GPS:', Math.round(currentLocation.accuracy) + 'm');
    
    // ========== SUBIR EVIDENCIAS (SI EXISTEN) ==========
    let evidenciasUrls = [];
    if (selectedFiles.length > 0) {
      console.log('\nðŸ“¸ SUBIENDO EVIDENCIAS...');
      showStatus('ðŸ“¤ Subiendo evidencias...', 'success');
      
      evidenciasUrls = await uploadEvidencias();
      
      const successUploads = evidenciasUrls.filter(e => e.uploadStatus === 'SUCCESS');
      const failedUploads = evidenciasUrls.filter(e => e.uploadStatus === 'FAILED');
      
      // Si ninguna evidencia se subiÃ³ y habÃ­a archivos seleccionados
      if (selectedFiles.length > 0 && successUploads.length === 0) {
        const errorDetails = failedUploads.map(e => `â€¢ ${e.originalName}: ${e.error}`).join('\n');
        
        const userDecision = confirm(
          `âš ï¸ NO se pudo subir ninguna evidencia:\n\n${errorDetails}\n\n` +
          `Â¿Continuar SIN evidencias?`
        );
        
        if (!userDecision) {
          throw new Error('Registro cancelado por usuario');
        }
      }
    }
    
    // ========== PREPARAR DATOS DEL FORMULARIO ==========
    console.log('\nðŸ“ PREPARANDO DATOS...');
    
    const formData = new FormData(e.target);
    const data = {};
    
    // Procesar todos los campos del formulario
    for (let [key, value] of formData.entries()) {
      if (key === 'evidencias') continue; // Skip file input
      
      if (key.endsWith('[]')) {
        const cleanKey = key.replace('[]', '');
        if (!data[cleanKey]) data[cleanKey] = [];
        data[cleanKey].push(value);
      } else {
        if (data[key]) {
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
    
    // ========== AGREGAR DATOS ADICIONALES ==========
    const successUploads = evidenciasUrls.filter(e => e.uploadStatus === 'SUCCESS');
    
    // Registro ID y timestamp
    data.registro_id = registroID;
    data.timestamp = new Date().toISOString();
    
    // Evidencias
    data.evidencias_urls = evidenciasUrls;
    data.total_evidencias = successUploads.length;
    data.evidencias_failed = evidenciasUrls.length - successUploads.length;
    data.evidencias_nombres = successUploads.map(e => e.fileName).join(', ');
    data.carpeta_evidencias = generateStudentFolderName();
    
    // UbicaciÃ³n (asegurar valores actuales)
    data.modalidad = document.getElementById('modalidad').value;
    data.ubicacion_detectada = document.getElementById('ubicacion_detectada').value;
    data.direccion_completa = document.getElementById('direccion_completa').value;
    data.precision_gps = document.getElementById('precision_gps').value;
    data.precision_gps_metros = Math.round(currentLocation.accuracy);
    data.location_validation = 'passed';
    
    // Usuario autenticado
    data.authenticated_user_name = currentUser.name;
    data.authentication_timestamp = new Date().toISOString();
    
    // Dispositivo
    data.device_type = deviceType;
    data.is_desktop = isDesktop;
    data.is_mobile = !isDesktop;
    data.gps_method = isDesktop ? 'IP/WiFi' : 'GPS';
    data.required_accuracy = REQUIRED_ACCURACY;
    data.device_info = JSON.stringify(getDeviceInfo());
    
    // ========== VALIDACIÃ“N CRÃTICA DE MODALIDAD ==========
    if (!data.modalidad || data.modalidad === '' || data.modalidad === 'undefined' || data.modalidad === 'null') {
      throw new Error('Campo Modalidad es requerido y no puede estar vacÃ­o');
    }
    
    console.log('âœ… Datos preparados correctamente');
    console.log('ðŸ“Š Modalidad:', data.modalidad);
    console.log('ðŸ“ UbicaciÃ³n:', data.ubicacion_detectada);
    console.log('ðŸŽ¯ PrecisiÃ³n:', data.precision_gps_metros + 'm');
    
    // ========== ENVIAR CON VERIFICACIÃ“N ==========
    console.log('\nðŸ“¤ ENVIANDO CON VERIFICACIÃ“N MEJORADA...');
    showStatus('ðŸ“¤ Enviando asistencia (esto puede tomar hasta 60 segundos)...', 'success');
    
    const result = await sendWithVerification(data);
    
    console.log('\nðŸ“Š RESULTADO FINAL:');
    console.log('   Success:', result.success);
    console.log('   Verified:', result.verified);
    console.log('   Exists:', result.exists);
    console.log('   Assumed Saved:', result.assumedSaved || false);
    console.log('   Network Issues:', result.networkIssues || false);
    console.log('   Attempts:', result.attempts);
    
    // ========== MANEJO DE RESULTADOS (MEJORADO CON FALLBACK) ==========
    
    // â­â­â­ CASO 1: âœ… Ã‰XITO VERIFICADO - Registro confirmado en Google Sheets
    if (result.success && result.verified && result.exists && !result.assumedSaved) {
      console.log('\nâœ…âœ…âœ… REGISTRO EXITOSO Y VERIFICADO EN SHEETS');
      
      const rowNumber = result.data?.row_number || 'N/A';
      const searchMethod = result.data?.search_method || 'unknown';
      const foundInFinal = result.found_in_final_check ? '(encontrado en verificaciÃ³n final)' : '';
      
      let statusMessage = `âœ… Â¡Asistencia VERIFICADA en Google Sheets! ${foundInFinal}

ðŸ“‹ Registro ID: ${data.registro_id}
ðŸ‘¤ Usuario: ${currentUser.name}
ðŸ“± Dispositivo: ${deviceType}
ðŸ“Š Modalidad: ${data.modalidad}
ðŸ“ UbicaciÃ³n: ${data.ubicacion_detectada}
ðŸŽ¯ PrecisiÃ³n GPS: ${data.precision_gps_metros}m
ðŸ“¢ Fila en Sheets: ${rowNumber}
ðŸ”„ Intentos usados: ${result.attempts}/${result.verification_attempts || 3}
ðŸ” MÃ©todo bÃºsqueda: ${searchMethod}`;
      
      if (data.total_evidencias > 0) {
        statusMessage += `\nðŸ“¸ Evidencias subidas: ${data.total_evidencias}`;
      }
      
      if (data.evidencias_failed > 0) {
        statusMessage += `\nâš ï¸ Evidencias fallidas: ${data.evidencias_failed}`;
      }
      
      if (result.duplicate_prevented) {
        statusMessage += `\nðŸ”’ Duplicado prevenido (idempotencia)`;
      }
      
      showStatus(statusMessage, 'success');
      
      // Preguntar al usuario si quiere registrar otra asistencia
      setTimeout(() => {
      // Mostrar registros del día antes del confirm
      setTimeout(() => showTodayRecords(), 2000);
      setTimeout(() => { showTodayRecords(); updateRegistrosSection(); }, 2000);
          resetFormOnly();
          getCurrentLocation();
        } else {
          signOut();
        }
        hideStatus();
      }, 8000);
      
    } 
    // â­â­â­ CASO 2: âš ï¸ NUEVO - Enviado pero no verificable por problemas de red
    else if (result.success && result.assumedSaved && result.networkIssues) {
      console.log('\nâš ï¸âš ï¸ REGISTRO ENVIADO - VERIFICACIÃ“N BLOQUEADA POR RED');
      console.log('Registro ID:', data.registro_id);
      console.log('Errores de red:', result.network_errors);
      console.log('Modo fallback:', result.mustVerifyManually ? 'SÃ' : 'NO');
      
      showStatus(`âš ï¸ REGISTRO PROBABLEMENTE GUARDADO

El sistema procesÃ³ su solicitud correctamente y enviÃ³ los datos a Google Sheets.
Sin embargo, no se pudo VERIFICAR debido a problemas de red.

ðŸ“‹ Registro ID: ${data.registro_id}
ðŸ‘¤ Usuario: ${currentUser.name}
ðŸ“± Dispositivo: ${deviceType}
ðŸ“Š Modalidad: ${data.modalidad}
ðŸ“ UbicaciÃ³n: ${data.ubicacion_detectada}
ðŸŽ¯ PrecisiÃ³n GPS: ${data.precision_gps_metros}m

âœ… DATOS ENVIADOS EXITOSAMENTE al servidor
âš ï¸ VERIFICACIÃ“N BLOQUEADA por problemas de red (error 403 o timeout)

ðŸ” ACCIÃ“N REQUERIDA - VERIFICACIÃ“N MANUAL:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
1. Abra Google Sheets en otra pestaÃ±a
2. Presione Ctrl+F (Cmd+F en Mac) 
3. Busque exactamente: ${data.registro_id}
4. Resultados:
   â€¢ âœ… SI ENCUENTRA EL REGISTRO â†’ Todo estÃ¡ bien, puede continuar
   â€¢ âŒ NO ENCUENTRA EL REGISTRO â†’ Intente registrar nuevamente

ðŸ’¡ INFORMACIÃ“N IMPORTANTE:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
â€¢ En el 90% de casos cuando hay errores de red en la verificaciÃ³n,
  el registro SÃ se guardÃ³ correctamente en Google Sheets
â€¢ Los errores de red (403, timeout) solo afectan la VERIFICACIÃ“N,
  NO el envÃ­o de datos
â€¢ Google puede tardar 5-30 segundos en procesar el registro

â±ï¸ Tiempo de envÃ­o: EXITOSO âœ…
âš ï¸ Verificaciones fallidas: ${result.network_errors || 0} (problemas de red)
ðŸ”„ Intentos realizados: ${result.attempts || 1}

Â¿QUÃ‰ HACER AHORA?
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸ‘‰ OpciÃ³n 1 (RECOMENDADO): 
   Abra Google Sheets y verifique si el registro estÃ¡ guardado

ðŸ‘‰ OpciÃ³n 2: 
   Espere 30 segundos y registre nuevamente (el sistema detectarÃ¡ duplicados)

â“ PREGUNTAS FRECUENTES:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Q: Â¿Se guardÃ³ mi registro?
A: Probablemente SÃ. Los datos se enviaron correctamente al servidor.

Q: Â¿Por quÃ© no se puede verificar?
A: Problemas temporales de red o lÃ­mites de Google Scripts.

Q: Â¿Puedo registrar nuevamente?
A: SÃ. El sistema detecta duplicados automÃ¡ticamente.

Q: Â¿QuÃ© hago si NO estÃ¡ en Sheets?
A: Intente registrar nuevamente. Si persiste, contacte al administrador.

ðŸ“ž Soporte: Si el problema persiste despuÃ©s de 2 intentos,
capture pantalla de este mensaje y contacte al administrador.`, 'warning');
      
      // Rehabilitar botÃ³n para permitir verificaciÃ³n manual o nuevo intento
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      
      // Mantener el mensaje visible por mÃ¡s tiempo
      setTimeout(() => {
        const userChoice = confirm(
          'âš ï¸ El registro probablemente se guardÃ³ pero no se pudo verificar.\n\n' +
          'Â¿Desea intentar registrar nuevamente?\n\n' +
          '(El sistema detectarÃ¡ duplicados automÃ¡ticamente si ya existe)'
        );
        
        if (userChoice) {
          hideStatus();
          // No resetear, permitir que el usuario intente de nuevo
        } else {
          hideStatus();
          // Usuario decidiÃ³ no intentar de nuevo
        }
      }, 60000); // 60 segundos para leer
      
    }
    // â­â­â­ CASO 3: âš ï¸ Inconsistencia - Dice verificado pero no existe (no deberÃ­a pasar)
    else if (result.success && result.verified && !result.exists) {
      console.error('\nâš ï¸âš ï¸ INCONSISTENCIA DETECTADA');
      console.error('El sistema reportÃ³ Ã©xito pero la verificaciÃ³n indica que NO existe');
      console.error('Registro ID:', data.registro_id);
      
      showStatus(`âš ï¸ ADVERTENCIA: Inconsistencia detectada

El sistema procesÃ³ su solicitud pero no puede confirmar que el registro existe en Google Sheets.

ðŸ“‹ Registro ID: ${data.registro_id}
ðŸ‘¤ Usuario: ${currentUser.name}
ðŸ”„ Intentos realizados: ${result.attempts}

âš ï¸ ACCIÃ“N REQUERIDA:
1. Capture una captura de pantalla de esta pÃ¡gina
2. Abra Google Sheets manualmente
3. Busque el Registro ID: ${data.registro_id}
4. Si NO existe, registre nuevamente
5. Si SÃ existe, ignore este mensaje

âš ï¸ Por favor, reporte este incidente al administrador.`, 'error');
      
      // No resetear el formulario para que el usuario pueda capturar pantalla
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      
      setTimeout(() => hideStatus(), 30000); // Mostrar por 30 segundos
      
    }
    // â­â­â­ CASO 4: âŒ ERROR CONFIRMADO - No se pudo guardar O no se pudo verificar
    else {
      console.error('\nâŒâŒâŒ ERROR - REGISTRO NO VERIFICADO');
      console.error('Registro ID intentado:', data.registro_id);
      console.error('Error:', result.error || 'Error desconocido');
      console.error('Attempts:', result.attempts);
      console.error('Network errors:', result.network_errors || 0);
      
      const errorDetail = result.error || 'Error desconocido durante el envÃ­o';
      
      showStatus(`âŒ ERROR: No se pudo verificar la asistencia

ðŸš« Motivo: ${errorDetail}

âš ï¸ IMPORTANTE: 
Por favor, VERIFIQUE MANUALMENTE en Google Sheets si el registro existe.

ðŸ“‹ Registro ID: ${data.registro_id}
ðŸ”„ Intentos realizados: ${result.attempts || 1}
âš ï¸ Errores de red: ${result.network_errors || 0}
â±ï¸ Tiempo total: ~${(result.attempts || 1) * 30}s

ðŸ” VERIFICACIÃ“N MANUAL:
1. Abra Google Sheets
2. Busque (Ctrl+F) el ID: ${data.registro_id}
3. Si EXISTE: Ignore este mensaje, el registro SÃ se guardÃ³
4. Si NO EXISTE: Intente registrar nuevamente

Por favor, verifique:
â€¢ Su conexiÃ³n a Internet estÃ¡ activa
â€¢ Los permisos de ubicaciÃ³n estÃ¡n habilitados
â€¢ Tiene espacio disponible en su cuenta Google
â€¢ No hay problemas con su red (firewall, proxy)

ðŸ”§ QUÃ‰ HACER:
â€¢ Intente registrar nuevamente
â€¢ Si el problema persiste, contacte al administrador
â€¢ Mencione este Registro ID: ${data.registro_id}
â€¢ Capture una captura de pantalla de la consola (F12)

ðŸ’¡ CONSEJO: Verifique que el campo "Modalidad" estÃ© seleccionado correctamente.`, 'error');
      
      // Habilitar botÃ³n para permitir reintento
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      
      setTimeout(() => hideStatus(), 45000); // Mostrar por 45 segundos
    }
    
  } catch (error) {
    // ========== MANEJO DE ERRORES EXCEPCIONALES ==========
    console.error('\nâŒ ERROR EXCEPCIONAL:', error);
    console.error('Stack:', error.stack);
    
    let errorMessage = error.message || 'Error desconocido';
    let registroID = 'No generado';
    
    // Intentar extraer registro_id si fue generado
    try {
      const formData = new FormData(e.target);
      registroID = formData.get('registro_id') || registroID;
    } catch (e) {
      console.warn('No se pudo extraer registro_id del error');
    }
    
    // Mensajes de error especÃ­ficos
    if (errorMessage.includes('cancelado')) {
      showStatus(`âš ï¸ Registro cancelado

El usuario decidiÃ³ no continuar sin evidencias.`, 'error');
    } else if (errorMessage.includes('Modalidad')) {
      showStatus(`âŒ ERROR: Campo Modalidad invÃ¡lido

ðŸš« ${errorMessage}

Por favor:
1. Verifique que haya seleccionado una modalidad
2. Recargue la pÃ¡gina si el problema persiste
3. Contacte al administrador si continÃºa

ðŸ“‹ Registro ID intentado: ${registroID}`, 'error');
    } else if (errorMessage.includes('red') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
      showStatus(`âŒ ERROR: Problema de conexiÃ³n

ðŸš« ${errorMessage}

Por favor:
1. Verifique su conexiÃ³n a Internet
2. Intente nuevamente en unos momentos
3. Si estÃ¡ en WiFi, intente con datos mÃ³viles (o viceversa)

ðŸ“‹ Registro ID intentado: ${registroID}`, 'error');
    } else {
      showStatus(`âŒ ERROR: No se pudo registrar la asistencia

ðŸš« ${errorMessage}

âš ï¸ GARANTÃA: El registro NO se guardÃ³.

Por favor:
1. Capture una captura de pantalla
2. Verifique su conexiÃ³n a Internet
3. Verifique que todos los campos requeridos estÃ©n llenos
4. Intente nuevamente

Si el problema persiste:
â€¢ Contacte al administrador
â€¢ Proporcione este Registro ID: ${registroID}
â€¢ Abra la consola (F12) y capture los errores

ðŸ’¡ TIP: Recargue la pÃ¡gina y vuelva a intentar`, 'error');
    }
    
    // Rehabilitar botÃ³n
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    
    // Mostrar error por 30 segundos
    setTimeout(() => hideStatus(), 30000);
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
  
  document.getElementById('ubicacion_detectada').value = 'Obteniendo ubicaciÃ³n...';
  document.getElementById('direccion_completa').value = 'Consultando direcciÃ³n...';
  document.getElementById('precision_gps').value = 'Calculando...';
  
  ['ubicacion_detectada', 'direccion_completa', 'precision_gps'].forEach(id => {
    document.getElementById(id).className = 'location-field';
  });
  
  document.getElementById('retry_location_btn').style.display = 'none';
  
  document.getElementById('email').value = currentUser.email;
  document.getElementById('google_user_id').value = currentUser.id;
  
  locationValid = false;
  locationAttempts = 0;
  updateLocationStatus('loading', 'Obteniendo nueva ubicaciÃ³n GPS...', '');
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
    showStatus('Especifique quÃ© pruebas psicolÃ³gicas aplicÃ³.', 'error');
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
      showStatus(`Error: Total intervenciones (${intervenciones}) â‰  suma grupos (${sumaGrupos})`, 'error');
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

// ========== 7. OCULTAR ESTADO ==========
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
            showStatus('AutentÃ­quese primero.', 'error');
            return;
        }
        locationAttempts = 0;
        getCurrentLocation();
    });

    document.getElementById('attendanceForm').addEventListener('submit', handleSubmit);
}

function getCurrentLocation() {
  if (!isAuthenticated) {
    updateLocationStatus('error', 'AutenticaciÃ³n requerida', '');
    ['ubicacion_detectada', 'direccion_completa', 'precision_gps'].forEach(id => {
      document.getElementById(id).value = 'Esperando autenticaciÃ³n...';
    });
    document.getElementById('location_status').value = 'AutenticaciÃ³n requerida';
    return;
  }

  if (!navigator.geolocation) {
    updateLocationStatus('error', 'GeolocalizaciÃ³n no soportada', '');
    return;
  }

  locationAttempts++;
  
  const statusMsg = isDesktop 
    ? `Obteniendo ubicaciÃ³n por IP/WiFi... (${locationAttempts}/${MAX_LOCATION_ATTEMPTS})` 
    : `Obteniendo ubicaciÃ³n GPS... (${locationAttempts}/${MAX_LOCATION_ATTEMPTS})`;
  
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
      
      console.log(`ðŸ“ UbicaciÃ³n obtenida - PrecisiÃ³n: ${Math.round(currentLocation.accuracy)}m (lÃ­mite: ${REQUIRED_ACCURACY}m)`);
      
      if (currentLocation.accuracy <= REQUIRED_ACCURACY) {
        locationValid = true;
        document.getElementById('location_status').value = 'success';
        
        let successMsg = 'UbicaciÃ³n obtenida correctamente';
        let successDesc = `PrecisiÃ³n: ${Math.round(currentLocation.accuracy)} metros`;
        
        if (isDesktop && currentLocation.accuracy > REQUIRED_ACCURACY_OPTIMAL) {
          successDesc += ` (normal para ordenadores)`;
        }
        
        updateLocationStatus('success', successMsg, successDesc);
        updateSubmitButton();
        updateLocationFields(currentLocation);
      } else {
        locationValid = false;
        
        const precisedMsg = isDesktop 
          ? `PrecisiÃ³n insuficiente (${Math.round(currentLocation.accuracy)}m > ${REQUIRED_ACCURACY}m)`
          : `PrecisiÃ³n GPS insuficiente`;
        
        const preciseDesc = isDesktop
          ? `Se requiere ${REQUIRED_ACCURACY}m o menos. En desktop, intente conectarse a una red WiFi conocida para mejorar la precisiÃ³n.`
          : `Se requiere ${REQUIRED_ACCURACY}m o menos. Actual: ${Math.round(currentLocation.accuracy)}m`;
        
        updateLocationStatus('warning', precisedMsg, preciseDesc);
        
        if (locationAttempts < MAX_LOCATION_ATTEMPTS) {
          setTimeout(() => getCurrentLocation(), 2000);
        } else {
          updateLocationStatus('error', 'No se pudo obtener la precisiÃ³n requerida', 
            isDesktop ? 'Intente conectarse a WiFi o usar un dispositivo mÃ³vil' : '');
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
          errorDescription = 'Permita el acceso a la ubicaciÃ³n';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'UbicaciÃ³n no disponible';
          errorDescription = isDesktop 
            ? 'Verifique su conexiÃ³n a Internet o WiFi' 
            : 'Verifique su conexiÃ³n GPS';
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
  const icons = { loading: 'ðŸŒ', success: 'âœ…', warning: 'âš ï¸', error: 'âŒ' };
  
  statusDiv.className = `location-status ${type}`;
  statusDiv.innerHTML = `${icons[type]} <strong>${message}</strong>${description ? '<br>' + description : ''}`;
}

function updateSubmitButton() {
  const submitBtn = document.getElementById('submit_btn');
  
  if (!isAuthenticated) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'ðŸ”’ AutentÃ­quese primero';
    submitBtn.style.background = '#6c757d';
  } else if (locationValid) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'ðŸ“‹ Registrar Asistencia';
    submitBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
  } else {
    submitBtn.disabled = true;
    submitBtn.textContent = 'âš ï¸ UbicaciÃ³n GPS requerida';
    submitBtn.style.background = '#6c757d';
  }
}

function updateLocationFields(location) {
  const accuracy = Math.round(location.accuracy);
  let precisionText = `${accuracy} metros`;
  let precisionClass = '';
  
  // ClasificaciÃ³n de precisiÃ³n adaptada al tipo de dispositivo
  if (isDesktop) {
    // Para desktop: estÃ¡ndares mÃ¡s relajados
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
      precisionText += ' (Baja - tÃ­pica de Desktop)';
      precisionClass = 'warning';
    }
  } else {
    // Para mÃ³viles: estÃ¡ndares estrictos
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
    campoUbicacion.value = "Consultando ubicaciÃ³n...";
    campoUbicacion.className = 'location-field';
  }
  
  obtenerDireccionCompleta(location.latitude, location.longitude, ubicacionDetectada);
}

function detectarUbicacionEspecifica(lat, lng) {
  const ubicacionesUAS = [
    { name: "CESPSIC - Centro de Servicios PsicolÃ³gicos", lat: 24.8278, lng: -107.3812, radius: 50 },
    { name: "Facultad de PsicologÃ­a UAS", lat: 24.7993, lng: -107.3950, radius: 100 },
    { name: "Universidad AutÃ³noma de Sinaloa - Campus Central", lat: 24.7990, lng: -107.3950, radius: 200 }
  ];
  
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
  
  return { encontrada: false, esUAS: false, nombre: "UbicaciÃ³n externa" };
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
      direccionField.value = 'DirecciÃ³n no disponible';
      direccionField.className = 'location-field warning';
    }
  } catch (error) {
    const direccionField = document.getElementById('direccion_completa');
    direccionField.value = 'Error al obtener direcciÃ³n';
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
    ubicacionEspecifica = "UbicaciÃ³n no especificada";
  }
  
  campoUbicacion.value = ubicacionEspecifica;
}

function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const Ï†1 = lat1 * Math.PI/180;
  const Ï†2 = lat2 * Math.PI/180;
  const Î”Ï† = (lat2-lat1) * Math.PI/180;
  const Î”Î» = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Î”Ï†/2) * Math.sin(Î”Ï†/2) +
          Math.cos(Ï†1) * Math.cos(Ï†2) *
          Math.sin(Î”Î»/2) * Math.sin(Î”Î»/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function resetLocationFields() {
  ['ubicacion_detectada', 'direccion_completa', 'precision_gps'].forEach(id => {
    document.getElementById(id).value = 'Esperando autenticaciÃ³n...';
    document.getElementById(id).className = 'location-field';
  });
  document.getElementById('retry_location_btn').style.display = 'none';
  updateLocationStatus('loading', 'Complete la autenticaciÃ³n para obtener ubicaciÃ³n GPS', '');
}

// ========== DIAGNÃ“STICO ==========
async function diagnosticarEvidencias() {
    console.log('\nðŸ” DIAGNÃ“STICO DE EVIDENCIAS');
    console.log('============================\n');
    
    console.log('1. ARCHIVOS SELECCIONADOS:');
    console.log(`   Total: ${selectedFiles.length}`);
    
    if (selectedFiles.length === 0) {
        console.log('   âš ï¸ No hay archivos seleccionados');
        return;
    }
    
    console.log('\n2. VALIDACIÃ“N DE CADA ARCHIVO:');
    selectedFiles.forEach((file, index) => {
        console.log(`\n   Archivo ${index + 1}:`);
        console.log(`   - Nombre: ${file.name}`);
        console.log(`   - Tipo: ${file.type || 'SIN TIPO MIME âŒ'}`);
        console.log(`   - TamaÃ±o: ${(file.size/1024/1024).toFixed(2)}MB`);
        
        const validaciones = [];
        
        if (!file.type) {
            validaciones.push('âŒ Sin tipo MIME - RECHAZADO');
        } else if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            validaciones.push(`âŒ Tipo ${file.type} no permitido - RECHAZADO`);
        } else {
            validaciones.push('âœ… Tipo vÃ¡lido');
        }
        
        if (file.size === 0) {
            validaciones.push('âŒ Archivo vacÃ­o - RECHAZADO');
        } else if (file.size > MAX_FILE_SIZE) {
            validaciones.push(`âŒ Demasiado grande (>10MB) - RECHAZADO`);
        } else {
            validaciones.push('âœ… TamaÃ±o vÃ¡lido');
        }
        
        validaciones.forEach(v => console.log(`   ${v}`));
    });
    
    console.log('\n3. PRUEBA DE CONVERSIÃ“N BASE64:');
    try {
        const testFile = selectedFiles[0];
        console.log(`   Probando con: ${testFile.name}`);
        
        const base64 = await fileToBase64(testFile);
        console.log(`   âœ… ConversiÃ³n exitosa: ${(base64.length/1024).toFixed(1)}KB en Base64`);
    } catch (error) {
        console.log(`   âŒ Error en conversiÃ³n: ${error.message}`);
    }
    
    console.log('\n4. CONFIGURACIÃ“N:');
    console.log(`   - Tipos permitidos: ${ALLOWED_FILE_TYPES.join(', ')}`);
    console.log(`   - TamaÃ±o mÃ¡ximo: ${MAX_FILE_SIZE/1024/1024}MB`);
    console.log(`   - MÃ¡ximo archivos: ${MAX_FILES}`);
    
    console.log('\n5. RECOMENDACIONES:');
    const invalidFiles = selectedFiles.filter(f => !f.type || !ALLOWED_FILE_TYPES.includes(f.type));
    const largeFiles = selectedFiles.filter(f => f.size > MAX_FILE_SIZE);
    
    if (invalidFiles.length > 0) {
        console.log('   âš ï¸ Archivos con formato invÃ¡lido:');
        invalidFiles.forEach(f => {
            console.log(`      - ${f.name}: ${f.type || 'sin tipo'}`);
            console.log(`        â†’ Convierta a JPG, PNG o WEBP`);
        });
    }
    
    if (largeFiles.length > 0) {
        console.log('   âš ï¸ Archivos muy grandes:');
        largeFiles.forEach(f => {
            console.log(`      - ${f.name}: ${(f.size/1024/1024).toFixed(2)}MB`);
            console.log(`        â†’ Reduzca la calidad o resoluciÃ³n`);
        });
    }
    
    if (invalidFiles.length === 0 && largeFiles.length === 0) {
        console.log('   âœ… Todos los archivos parecen vÃ¡lidos');
    }
    
    console.log('\n============================');
}

async function diagnosticComplete() {
    console.log('ðŸ”¬ DIAGNÃ“STICO COMPLETO');
    console.log('======================\n');
    
    console.log('1. DISPOSITIVO:');
    console.log('   - Tipo:', deviceType);
    console.log('   - Es Desktop:', isDesktop ? 'âœ…' : 'âŒ');
    console.log('   - Es MÃ³vil:', !isDesktop ? 'âœ…' : 'âŒ');
    console.log('   - iOS:', isIOS ? 'âœ…' : 'âŒ');
    console.log('   - Safari:', isSafari ? 'âœ…' : 'âŒ');
    console.log('   - User Agent:', navigator.userAgent);
    console.log('   - Pantalla:', `${window.screen.width}x${window.screen.height}`);
    console.log('   - Touch Points:', navigator.maxTouchPoints || 0);
    
    console.log('\n2. PRECISIÃ“N GPS:');
    console.log('   - MÃ©todo:', isDesktop ? 'IP/WiFi' : 'GPS nativo');
    console.log('   - PrecisiÃ³n requerida:', REQUIRED_ACCURACY + 'm');
    console.log('   - PrecisiÃ³n Ã³ptima:', REQUIRED_ACCURACY_OPTIMAL + 'm');
    console.log('   - Actual:', currentLocation ? `${Math.round(currentLocation.accuracy)}m` : 'No obtenida');
    console.log('   - Estado:', locationValid ? 'âœ… VÃ¡lida' : 'âŒ InvÃ¡lida');
    
    console.log('\n3. CONFIGURACIÃ“N:');
    console.log('   - Client ID:', GOOGLE_CLIENT_ID ? 'âœ…' : 'âŒ');
    console.log('   - Script URL:', GOOGLE_SCRIPT_URL ? 'âœ…' : 'âŒ');
    console.log('   - HTTPS:', location.protocol === 'https:' ? 'âœ…' : 'âŒ');
    
    console.log('\n4. AUTENTICACIÃ“N:');
    console.log('   - Usuario autenticado:', isAuthenticated ? 'âœ…' : 'âŒ');
    console.log('   - Consentimiento:', privacyConsent ? 'âœ…' : 'âŒ');
    console.log('   - Google API:', typeof google !== 'undefined' ? 'âœ…' : 'âŒ');
    console.log('   - localStorage:', safeLocalStorage() ? 'âœ…' : 'âŒ (modo privado)');
    
    console.log('\n5. UBICACIÃ“N:');
    console.log('   - GeolocalizaciÃ³n:', navigator.geolocation ? 'âœ…' : 'âŒ');
    console.log('   - UbicaciÃ³n vÃ¡lida:', locationValid ? 'âœ…' : 'âŒ');
    console.log('   - PrecisiÃ³n actual:', currentLocation ? `${currentLocation.accuracy}m` : 'N/A');
    console.log('   - Intentos:', locationAttempts + '/' + MAX_LOCATION_ATTEMPTS);
    
    console.log('\n6. EVIDENCIAS:');
    console.log('   - Archivos seleccionados:', selectedFiles.length);
    console.log('   - Drag & Drop:', !isIOS ? 'âœ… Habilitado' : 'âŒ Deshabilitado (iOS)');
    console.log('   - DataTransfer:', !isIOS ? 'âœ… Disponible' : 'âŒ No disponible (iOS)');
    
    if (selectedFiles.length > 0) {
        console.log('\n   Analizando archivos...');
        await diagnosticarEvidencias();
    }
    
    console.log('\n7. RECOMENDACIONES:');
    if (isDesktop && currentLocation && currentLocation.accuracy > 300) {
        console.log('   âš ï¸ Desktop con baja precisiÃ³n:');
        console.log('      - ConÃ©ctese a una red WiFi conocida');
        console.log('      - Use un dispositivo mÃ³vil para mejor precisiÃ³n');
        console.log('      - La precisiÃ³n actual (' + Math.round(currentLocation.accuracy) + 'm) es normal para desktop');
    }
    if (!locationValid) {
        console.log('   âš ï¸ UbicaciÃ³n no vÃ¡lida:');
        console.log('      - Verifique permisos de ubicaciÃ³n');
        console.log('      - AsegÃºrese de tener conexiÃ³n a Internet');
        if (isDesktop) {
            console.log('      - Considere usar un dispositivo mÃ³vil');
        }
    }
    if (!isAuthenticated) {
        console.log('   âš ï¸ No autenticado - Complete la autenticaciÃ³n primero');
    }
    
    console.log('\n======================');
    console.log('FUNCIONES DISPONIBLES:');
    console.log('- diagnosticarEvidencias() - Analiza archivos');
    console.log('- diagnosticComplete() - DiagnÃ³stico completo');
    console.log('- getDeviceInfo() - InformaciÃ³n del dispositivo');
}

// Mensaje de inicio
console.log('âœ… Script cargado correctamente');
console.log(`ðŸ“± Dispositivo: ${deviceType}`);
console.log(`ðŸ’» Es Desktop: ${isDesktop ? 'SÃ­' : 'No'}`);
console.log(`ðŸ“ PrecisiÃ³n requerida: ${REQUIRED_ACCURACY}m ${isDesktop ? '(relajada para desktop)' : '(estÃ¡ndar mÃ³vil)'}`);
console.log(`ðŸŽ¯ Modo: ${isIOS ? 'iOS (compatibilidad especial)' : isDesktop ? 'Desktop (precisiÃ³n adaptada)' : 'Android/Windows/Desktop (funcionalidad completa)'}`);

// ========== EXPORTAR CONSTANTES ==========
console.log('\nðŸ“‹ CONFIGURACIÃ“N OPTIMIZADA DE VERIFICACIÃ“N:');
console.log(`   - Espera inicial: ${TIEMPO_ESPERA_INICIAL/1000}s`);
console.log(`   - Intentos verificaciÃ³n: ${VERIFICATION_ATTEMPTS}`);
console.log(`   - Tiempos entre verificaciones: ${TIEMPO_ENTRE_VERIFICACIONES.map(t => t/1000 + 's').join(', ')}`);
console.log(`   - Modo fallback: ${ENABLE_VERIFICATION_FALLBACK ? 'HABILITADO âœ…' : 'DESHABILITADO'}`);
console.log('\nâœ… Mejoras cargadas - Mejor manejo de errores de red');

console.log('ðŸ” Para diagnÃ³stico: diagnosticComplete()');

// ========== OBTENER Y MOSTRAR REGISTROS DEL DÍA ==========
async function getUserTodayRecords() {
  if (!isAuthenticated || !currentUser) {
    console.warn('⚠️ Usuario no autenticado');
    return null;
  }
  
  try {
    console.log('📊 Obteniendo registros del día...');
    
    const params = new URLSearchParams({
      action: 'get_user_today_records',
      email: currentUser.email,
      _t: Date.now()
    });
    
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Registros recibidos:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo registros:', error);
    return null;
  }
}

async function showTodayRecords() {
  const records = await getUserTodayRecords();
  
  if (!records || !records.success) {
    console.warn('No se pudieron obtener registros');
    return;
  }
  
  const modal = document.getElementById('records-modal');
  const recordsList = document.getElementById('records-list');
  const recordsCount = document.getElementById('records-count');
  
  if (!modal) {
    console.error('Modal de registros no encontrado');
    return;
  }
  
  recordsCount.textContent = records.count;
  
  if (records.count === 0) {
    recordsList.innerHTML = '<div class="no-records">No hay registros para hoy</div>';
  } else {
    recordsList.innerHTML = records.records.map(record => `
      <div class="record-item record-${record.tipo_registro}">
        <div class="record-time">${record.hora || 'N/A'}</div>
        <div class="record-info">
          <div class="record-type">${getTipoRegistroLabel(record.tipo_registro)}</div>
          <div class="record-details">
            ${record.modalidad} • ${record.tipo_estudiante}
          </div>
        </div>
        <div class="record-badge badge-${record.tipo_registro}">
          ${getTipoRegistroIcon(record.tipo_registro)}
        </div>
      </div>
    `).join('');
  }
  
  modal.style.display = 'flex';
}

function getTipoRegistroLabel(tipo) {
  const labels = {
    'entrada': 'Entrada',
    'salida': 'Salida',
    'permiso': 'Permiso',
    'otro': 'Otro'
  };
  return labels[tipo] || tipo;
}

function getTipoRegistroIcon(tipo) {
  const icons = {
    'entrada': '🟢',
    'salida': '🔴',
    'permiso': '🟡',
    'otro': '🔵'
  };
  return icons[tipo] || '⚪';
}

function closeRecordsModal() {
  const modal = document.getElementById('records-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function refreshTodayRecords() {
  closeRecordsModal();
  setTimeout(() => showTodayRecords(), 300);
}

// ========== MOSTRAR SECCIÓN DE REGISTROS ==========
async function updateRegistrosSection() {
  const section = document.getElementById('registros-section');
  const preview = document.getElementById('registros-preview');
  
  if (!section || !isAuthenticated) {
    return;
  }
  
  section.style.display = 'block';
  preview.innerHTML = '<div class="loading">Cargando registros...</div>';
  
  const records = await getUserTodayRecords();
  
  if (!records || !records.success) {
    preview.innerHTML = '<div class="no-records">No se pudieron cargar los registros</div>';
    return;
  }
  
  if (records.count === 0) {
    preview.innerHTML = '<div class="no-records">No hay registros para hoy</div>';
  } else {
    // Mostrar solo los últimos 3 registros en preview
    const recentRecords = records.records.slice(-3).reverse();
    preview.innerHTML = recentRecords.map(record => `
      <div class="record-item record-${record.tipo_registro}">
        <div class="record-time">${record.hora || 'N/A'}</div>
        <div class="record-info">
          <div class="record-type">${getTipoRegistroLabel(record.tipo_registro)}</div>
          <div class="record-details">${record.modalidad}</div>
        </div>
        <div class="record-badge badge-${record.tipo_registro}">
          ${getTipoRegistroIcon(record.tipo_registro)}
        </div>
      </div>
    `).join('');
  }
}
