// ========== CESPSIC - SISTEMA DE ASISTENCIAS CON FIREBASE ==========
// Versión: 2.3 Firebase - AUTENTICACIÓN HÍBRIDA
// - Chrome/Android: Firebase Auth (popup - rápido)
// - Safari/iOS: Google Apps Script (sin problemas de bloqueo)
// Mantiene Google Drive para evidencias fotográficas
// Usa Firebase Firestore para datos de asistencias

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
  GoogleAuthProvider, 
  firebaseSignOut,
  setPersistence,
  browserSessionPersistence,
  inMemoryPersistence
} from './firebase-config.js';

// ========================================================================================================
// 📊 IMPORTAR SISTEMA DE LOGS Y AUDITORÍA
// ========================================================================================================
import { 
  guardarAsistenciaConLogs,
  verificarDuplicado,
  registrarIntentoRecibido,
  registrarIntentoFallido,
  registrarAuditoria,
  obtenerEstadisticasLogs
} from './firebase-logger.js';

console.log('📊 Sistema de logs Firebase: CARGADO');

// ========================================================================================================
// 🔧 CONFIGURACIÓN - Importada desde config.js
// ========================================================================================================
import { CONFIG, AMBIENTE_ACTUAL } from './config.js';

// URL del backend de Google Apps Script
const GOOGLE_SCRIPT_URL = CONFIG.GOOGLE_SCRIPT_URL;

// Logs de confirmación
console.log('='.repeat(70));
console.log('🔧 CONFIGURACIÓN FRONTEND CARGADA');
console.log('='.repeat(70));
console.log('🎯 Ambiente Activo:', AMBIENTE_ACTUAL);
console.log('📜 Google Script URL:', GOOGLE_SCRIPT_URL.substring(0, 50) + '...');
console.log('🔥 Firebase Project:', CONFIG.FIREBASE_CONFIG.projectId);
console.log('='.repeat(70));

// ========== DETECCIÓN DE DISPOSITIVO Y NAVEGADOR ==========
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

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
let persistenceConfigured = false;

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
console.log(`🌐 Navegador: ${isSafari ? 'Safari' : 'Otro'}`);
console.log(`🔥 Firebase: Conectado`);
console.log(`🔐 Método de auth: ${(isSafari || isIOS) ? 'Apps Script (Safari/iOS)' : 'Firebase Auth (Chrome/Android)'}`);

// ========================================================================================================
// 🔐 SISTEMA DE AUTENTICACIÓN HÍBRIDA
// ========================================================================================================

// ========== 🆕 CONFIGURAR PERSISTENCIA FIREBASE ==========
async function configurarPersistenciaFirebase() {
    if (persistenceConfigured) {
        console.log('ℹ️ Persistencia ya configurada');
        return;
    }
    
    // Solo configurar si NO es Safari (Safari usará Apps Script)
    if (isSafari || isIOS) {
        console.log('🍎 Safari/iOS detectado: omitiendo configuración de persistencia Firebase');
        persistenceConfigured = true;
        return;
    }
    
    try {
        console.log('🌐 Configurando persistencia Firebase para Chrome/Android...');
        await setPersistence(auth, browserSessionPersistence);
        console.log('✅ Persistencia de sesión configurada');
        persistenceConfigured = true;
    } catch (error) {
        console.error('⚠️ Error configurando persistencia:', error);
        try {
            await setPersistence(auth, inMemoryPersistence);
            console.log('🔄 Usando persistencia en memoria como fallback');
            persistenceConfigured = true;
        } catch (fallbackError) {
            console.error('❌ Error crítico en persistencia:', fallbackError);
            persistenceConfigured = true; // Continuar de todos modos
        }
    }
}

// ========== 🆕 AUTENTICACIÓN CON FIREBASE (Chrome/Android) ==========
async function autenticarConFirebase() {
    console.log('🔐 Iniciando autenticación con Firebase Auth...');
    
    try {
        // Configurar persistencia
        await configurarPersistenciaFirebase();
        
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        // Mostrar estado
        showStatus('🔐 Abriendo Google para autenticación...', 'info');
        
        // Autenticar con popup
        const result = await signInWithPopup(auth, provider);
        
        // Obtener Google User ID
        const googleUserID = result.user.providerData.find(p => p.providerId === 'google.com')?.uid || result.user.uid;
        
        currentUser = {
            id: googleUserID,
            email: result.user.email,
            name: result.user.displayName,
            picture: result.user.photoURL,
            authMethod: 'firebase' // ⭐ Identificar método
        };
        
        console.log('🆔 Google User ID:', googleUserID);
        console.log('✅ Autenticación Firebase exitosa');
        
        // Finalizar autenticación
        finalizarAutenticacion();
        
    } catch (error) {
        throw error; // Propagar error para manejo unificado
    }
}

// ========== 🆕 AUTENTICACIÓN CON APPS SCRIPT (Safari/iOS) ==========
async function autenticarConAppsScript() {
    console.log('🍎 Iniciando autenticación con Google Apps Script...');
    
    try {
        // Construir URL de redirect
        const currentUrl = window.location.href;
        const baseUrl = window.location.origin + window.location.pathname;
        const authUrl = `${GOOGLE_SCRIPT_URL}?action=authenticate&redirect=${encodeURIComponent(baseUrl)}`;
        
        console.log('🔄 Redirigiendo a:', authUrl);
        
        // Guardar estado antes de redirect
        try {
            sessionStorage.setItem('auth_in_progress', 'true');
            sessionStorage.setItem('auth_timestamp', Date.now().toString());
            sessionStorage.setItem('auth_device', deviceType);
        } catch (e) {
            console.warn('⚠️ No se pudo guardar en sessionStorage (esperado en Safari)');
        }
        
        // Mostrar mensaje antes de redirect
        showStatus('🔄 Redirigiendo a Google para autenticación...', 'info');
        
        // Pequeño delay para que el usuario vea el mensaje
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Redirect a Apps Script
        window.location.href = authUrl;
        
        // Nota: La ejecución se detiene aquí. Cuando regrese, se procesará en verificarAutenticacionAppsScript()
        
    } catch (error) {
        throw error; // Propagar error para manejo unificado
    }
}

// ========== 🆕 VERIFICAR SI VIENE DE AUTENTICACIÓN DE APPS SCRIPT ==========
function verificarAutenticacionAppsScript() {
    const params = new URLSearchParams(window.location.search);
    
    // Verificar si hay parámetros de autenticación exitosa
    if (params.has('auth_success') && params.get('auth_success') === 'true') {
        console.log('✅ Detectada autenticación exitosa desde Apps Script');
        
        const email = params.get('email');
        const name = params.get('name');
        const picture = params.get('picture');
        const sessionId = params.get('session_id');
        
        if (email && sessionId) {
            // Crear objeto de usuario
            currentUser = {
                id: email, // Usar email como ID
                email: email,
                name: name || email.split('@')[0],
                picture: picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || email),
                authMethod: 'appsscript', // ⭐ Identificar método
                sessionId: sessionId // ⭐ Guardar session ID
            };
            
            console.log('👤 Usuario autenticado:', currentUser.email);
            console.log('🔑 Session ID:', sessionId);
            
            // Limpiar URL (quitar parámetros)
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Finalizar autenticación
            finalizarAutenticacion();
            
            return true;
        } else {
            console.error('❌ Datos de autenticación incompletos');
            showStatus('❌ Error: Datos de autenticación incompletos', 'error');
        }
    } 
    // Verificar si hay error de autenticación
    else if (params.has('auth_error')) {
        const error = params.get('auth_error');
        console.error('❌ Error de autenticación desde Apps Script:', error);
        
        showStatus('❌ Error de autenticación: ' + error, 'error');
        
        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        authInProgress = false;
        
        return true;
    }
    
    return false;
}

// ========== 🆕 FINALIZAR AUTENTICACIÓN (común para ambos métodos) ==========
function finalizarAutenticacion() {
    console.log('✅ Finalizando autenticación...');
    console.log('   Email:', currentUser.email);
    console.log('   Método:', currentUser.authMethod);
    
    isAuthenticated = true;
    authInProgress = false;
    
    // Actualizar campos del formulario
    document.getElementById('email').value = currentUser.email;
    document.getElementById('google_user_id').value = currentUser.id;
    
    // Actualizar UI
    updateAuthenticationUI();
    enableForm();
    getCurrentLocation();
    
    // Cargar registros del día
    setTimeout(() => mostrarRegistrosDelDia(), 2000);
    
    // Mensaje de éxito
    showStatus(`✅ ¡Bienvenido ${currentUser.name}!`, 'success');
    setTimeout(() => hideStatus(), 3000);
    
    console.log('✅ Proceso de autenticación completado');
}

// ========== 🆕 MANEJO ROBUSTO DE ERRORES DE AUTENTICACIÓN ==========
function manejarErrorAutenticacion(error) {
    authInProgress = false;
    console.error('❌ Error en autenticación:', error);
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    
    let mensaje = '';
    let mostrarInstruccionesSafari = false;
    
    // Errores específicos de Firebase Auth
    if (error.code) {
        switch (error.code) {
            case 'auth/popup-blocked':
                if (isSafari || isIOS) {
                    mensaje = '🚫 Safari bloqueó la ventana de autenticación.\n\n' +
                             '💡 SOLUCIÓN: El sistema te redirigirá automáticamente para autenticarte.\n\n' +
                             'Si ves esta pantalla de nuevo, sigue las instrucciones que aparecerán abajo.';
                    mostrarInstruccionesSafari = true;
                } else {
                    mensaje = '🚫 El navegador bloqueó la ventana de autenticación.\n\n' +
                             'Por favor, permite ventanas emergentes para este sitio e inténtalo de nuevo.';
                }
                break;
                
            case 'auth/popup-closed-by-user':
                mensaje = '❌ Cerraste la ventana de autenticación antes de completar el proceso.\n\n' +
                         'Intenta de nuevo y completa el inicio de sesión con Google.';
                break;
                
            case 'auth/cancelled-popup-request':
                mensaje = 'ℹ️ Solicitud de autenticación cancelada.\n\n' +
                         'Puedes intentar autenticarte nuevamente cuando lo desees.';
                break;
                
            case 'auth/unauthorized-domain':
                mensaje = '⚠️ Este dominio no está autorizado para usar Firebase.\n\n' +
                         'Por favor, contacta al administrador del sistema.';
                break;
                
            case 'auth/operation-not-allowed':
                mensaje = '⚠️ La autenticación con Google no está habilitada en el sistema.\n\n' +
                         'Por favor, contacta al administrador del sistema.';
                break;
                
            case 'auth/network-request-failed':
                mensaje = '📡 Error de conexión a Internet.\n\n' +
                         'Verifica tu conexión y vuelve a intentar.';
                break;
                
            case 'auth/web-storage-unsupported':
            case 'auth/internal-error':
                if (isSafari || isIOS) {
                    mensaje = '⚠️ Safari está bloqueando el almacenamiento web necesario.\n\n' +
                             '💡 No te preocupes: El sistema usará un método alternativo.\n\n' +
                             'Intenta de nuevo y serás redirigido automáticamente.';
                    mostrarInstruccionesSafari = true;
                } else {
                    mensaje = '⚠️ Error interno del sistema.\n\n' +
                             'Verifica la configuración de privacidad de tu navegador.';
                }
                break;
                
            default:
                mensaje = `⚠️ Error de autenticación: ${error.message}\n\n`;
                if (isSafari || isIOS) {
                    mensaje += '💡 Si el problema persiste, intenta usar Google Chrome o Firefox.';
                    mostrarInstruccionesSafari = true;
                }
        }
    } else {
        // Error genérico
        mensaje = `⚠️ Error: ${error.message || error.toString()}`;
        if (isSafari || isIOS) {
            mostrarInstruccionesSafari = true;
        }
    }
    
    // Mostrar mensaje de error
    showStatus(mensaje, 'error');
    
    // Mostrar instrucciones para Safari si es necesario
    if (mostrarInstruccionesSafari) {
        mostrarInstruccionesSafariUI();
    }
}

// ========== 🆕 MOSTRAR INSTRUCCIONES PARA SAFARI EN LA UI ==========
function mostrarInstruccionesSafariUI() {
    const authSection = document.getElementById('auth-section');
    let safariHelp = document.getElementById('safari-help');
    
    if (!safariHelp) {
        safariHelp = document.createElement('div');
        safariHelp.id = 'safari-help';
        safariHelp.style.cssText = `
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            border: 2px solid #ff9800;
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
            color: #856404;
            font-size: 14px;
            line-height: 1.8;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            animation: slideDown 0.5s ease-out;
        `;
        safariHelp.innerHTML = `
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #ff6b6b;">
                🍎 Problema detectado en Safari/iOS
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <strong style="color: #e74c3c;">⚠️ Safari está bloqueando la autenticación</strong><br><br>
                Esto es común en Safari debido a configuraciones de privacidad estrictas.
            </div>
            
            <div style="background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <strong style="color: #3498db;">📱 Solución para iPhone/iPad:</strong><br>
                1️⃣ Abre <strong>Ajustes</strong> del iPhone/iPad<br>
                2️⃣ Busca y abre <strong>Safari</strong><br>
                3️⃣ Busca <strong>"Impedir seguimiento entre sitios"</strong><br>
                4️⃣ <strong style="color: #e74c3c;">DESACTÍVALA</strong> (debe quedar gris/apagado)<br>
                5️⃣ <strong>Cierra Safari</strong> completamente (desliza y cierra la app)<br>
                6️⃣ Vuelve a abrir Safari y recarga esta página<br>
                7️⃣ Intenta autenticarte de nuevo
            </div>
            
            <div style="background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <strong style="color: #9b59b6;">💻 Solución para Mac (Safari):</strong><br>
                1️⃣ Safari → <strong>Preferencias</strong><br>
                2️⃣ Pestaña <strong>"Privacidad"</strong><br>
                3️⃣ <strong style="color: #e74c3c;">DESMARCA</strong> "Impedir el rastreo entre sitios web"<br>
                4️⃣ Cierra y vuelve a abrir Safari<br>
                5️⃣ Recarga esta página<br>
                6️⃣ Intenta autenticarte de nuevo
            </div>
            
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #4caf50;">
                <strong style="color: #2e7d32;">✅ Solución más rápida:</strong><br>
                Usa <strong>Google Chrome</strong> o <strong>Firefox</strong> en lugar de Safari.<br>
                Estos navegadores no tienen este problema.
            </div>
        `;
        
        // Añadir estilos de animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
        
        authSection.insertBefore(safariHelp, authSection.firstChild);
    }
    
    safariHelp.style.display = 'block';
}

// ========== 🆕 OCULTAR INSTRUCCIONES DE SAFARI ==========
function ocultarInstruccionesSafariUI() {
    const safariHelp = document.getElementById('safari-help');
    if (safariHelp) {
        safariHelp.style.display = 'none';
    }
}

// ========== 🆕 FUNCIÓN PRINCIPAL DE AUTENTICACIÓN (HÍBRIDA) ==========
async function requestAuthentication() {
    // Prevenir múltiples clics
    if (authInProgress) {
        console.log('⏳ Autenticación ya en progreso...');
        showStatus('⏳ Procesando autenticación, espera un momento...', 'info');
        return;
    }
    
    authInProgress = true;
    console.log('🔐 Iniciando proceso de autenticación híbrida...');
    console.log('   Dispositivo:', deviceType);
    console.log('   Navegador:', isSafari ? 'Safari' : 'Otro');
    
    try {
        if (isSafari || isIOS) {
            // 🍎 Safari/iOS → Usar Google Apps Script
            console.log('🍎 Ruta: Autenticación con Google Apps Script');
            await autenticarConAppsScript();
        } else {
            // 🌐 Chrome/Android → Usar Firebase Auth
            console.log('🌐 Ruta: Autenticación con Firebase Auth');
            await autenticarConFirebase();
        }
        
    } catch (error) {
        // Manejo unificado de errores
        manejarErrorAutenticacion(error);
    }
}

// ========== FUNCIÓN: Información del Dispositivo ==========
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
        authMethod: currentUser ? currentUser.authMethod : 'none'
    };
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando aplicación CESPSIC...');
    console.log('=== INFORMACIÓN DEL DISPOSITIVO ===');
    console.log('Tipo:', deviceType);
    console.log('Es Desktop:', isDesktop);
    console.log('Es iOS:', isIOS);
    console.log('Es Safari:', isSafari);
    console.log('Precisión GPS requerida:', REQUIRED_ACCURACY + 'm');
    console.log('Precisión GPS óptima:', REQUIRED_ACCURACY_OPTIMAL + 'm');
    console.log('Método de autenticación:', (isSafari || isIOS) ? 'Google Apps Script' : 'Firebase Auth');
    
    if (isDesktop) {
        console.log('⚠️ MODO DESKTOP ACTIVADO');
        console.log('   Los ordenadores no tienen GPS integrado.');
        console.log('   La ubicación se obtiene por IP/WiFi (menor precisión).');
        console.log('   Precisión aceptada: hasta ' + REQUIRED_ACCURACY + 'm');
        showDesktopWarning();
    }
    
    if (isIOS) {
        console.log('🎯 Modo iOS activado - Usando autenticación Apps Script');
    }
    
    if (isSafari) {
        console.log('🍎 Safari detectado - Usando autenticación Apps Script');
    }
    
    // ⭐ PASO CRÍTICO: Verificar si viene de redirect de Apps Script
    console.log('🔍 Verificando si hay autenticación pendiente...');
    const authPending = verificarAutenticacionAppsScript();
    
    if (!authPending) {
        console.log('ℹ️ No hay autenticación pendiente');
        
        // Solo configurar persistencia Firebase si NO es Safari
        if (!isSafari && !isIOS) {
            console.log('📋 Configurando persistencia Firebase...');
            await configurarPersistenciaFirebase();
        }
    }
    
    // Inicializar el formulario
    console.log('📝 Inicializando formulario...');
    initializeForm();
    setupEventListeners();
    setupEvidenciasHandlers();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    console.log('✅ Aplicación lista para usar');
});

function initializeForm() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('fecha').value = `${year}-${month}-${day}`;
    updateCurrentTime();
}

function updateCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('hora').value = `${hours}:${minutes}`;
}

function showDesktopWarning() {
    const authSection = document.getElementById('auth-section');
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
        
        // Ocultar instrucciones de Safari si estaban visibles
        ocultarInstruccionesSafariUI();
        
        console.log('✅ UI actualizada - Usuario autenticado');
        console.log('   Método:', currentUser.authMethod);
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
    hideStatus();
}

function disableForm() {
    document.getElementById('form-container').classList.remove('authenticated');
    locationValid = false;
    updateSubmitButton();
}

// ========== 🆕 CERRAR SESIÓN ADAPTADO PARA AMBOS MÉTODOS ==========
async function signOut() {
    try {
        console.log('🚪 Cerrando sesión...');
        console.log('   Método actual:', currentUser ? currentUser.authMethod : 'ninguno');
        
        if (currentUser && currentUser.authMethod === 'appsscript') {
            // 🍎 Cerrar sesión de Apps Script
            console.log('🍎 Cerrando sesión de Apps Script...');
            
            if (currentUser.sessionId) {
                // Llamar al backend para cerrar sesión
                try {
                    const signoutUrl = `${GOOGLE_SCRIPT_URL}?action=signout&session_id=${currentUser.sessionId}&redirect=${encodeURIComponent(window.location.href)}`;
                    
                    // Opción 1: Redirect para cerrar sesión
                    // window.location.href = signoutUrl;
                    // return;
                    
                    // Opción 2: Llamada fetch (más rápida, sin redirect)
                    await fetch(signoutUrl);
                    console.log('✅ Sesión de Apps Script cerrada');
                } catch (error) {
                    console.warn('⚠️ Error cerrando sesión en backend:', error);
                    // Continuar de todos modos
                }
            }
        } else if (currentUser && currentUser.authMethod === 'firebase') {
            // 🌐 Cerrar sesión de Firebase
            console.log('🌐 Cerrando sesión de Firebase...');
            await firebaseSignOut(auth);
            console.log('✅ Sesión de Firebase cerrada');
        }
        
        // Limpiar estado local
        isAuthenticated = false;
        currentUser = null;
        locationValid = false;
        currentLocation = null;
        selectedFiles = [];
        authInProgress = false;
        
        // Limpiar campos del formulario
        ['email', 'google_user_id', 'latitude', 'longitude', 'location_status'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        
        // Limpiar parámetros de URL si existen
        if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Actualizar UI
        updateAuthenticationUI();
        disableForm();
        resetLocationFields();
        resetEvidenciasSection();
        ocultarRegistrosDelDia();
        ocultarInstruccionesSafariUI();
        
        showStatus('Sesión cerrada correctamente.', 'success');
        setTimeout(() => hideStatus(), 3000);
        
        console.log('✅ Sesión cerrada completamente');
        
    } catch (error) {
        console.error('❌ Error cerrando sesión:', error);
        showStatus('Error al cerrar sesión: ' + error.message, 'error');
    }
}

// ========== 🆕 GUARDAR ASISTENCIA ADAPTADO PARA AMBOS MÉTODOS ==========
async function handleSubmit(e) {
    e.preventDefault();
    
    console.log('\n' + '='.repeat(70));
    console.log('💾 GUARDANDO ASISTENCIA');
    console.log('   Método de auth:', currentUser ? currentUser.authMethod : 'ninguno');
    console.log('='.repeat(70));
    
    // Validaciones básicas
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
    
    // Deshabilitar botón inmediatamente
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.textContent = '⏳ Guardando, espere...';
    
    try {
        // PASO 1: Subir evidencias a Google Drive
        console.log('📸 Procesando evidencias...');
        submitBtn.textContent = '📤 Subiendo evidencias a Drive...';
        
        const driveUrls = await uploadEvidenciasToGoogleDrive();
        console.log(`✅ ${driveUrls.length} evidencias subidas`);
        
        // PASO 2: Preparar datos de asistencia
        console.log('📋 Preparando datos de asistencia...');
        submitBtn.textContent = '📝 Preparando datos...';
        
        const asistenciaData = prepararDatosAsistencia(driveUrls);
        
        // PASO 3: Guardar según el método de autenticación
        if (currentUser.authMethod === 'firebase') {
            // 🌐 Método Firebase: Guardar directamente en Firestore
            console.log('🔥 Guardando en Firestore (Firebase Auth)...');
            submitBtn.textContent = '💾 Guardando en Firebase...';
            
            await guardarAsistenciaConLogs(asistenciaData);
            console.log('✅ Guardado en Firestore completado');
            
        } else if (currentUser.authMethod === 'appsscript') {
            // 🍎 Método Apps Script: Guardar vía Firestore pero con validación de sesión
            console.log('🍎 Guardando en Firestore (Apps Script Auth)...');
            submitBtn.textContent = '💾 Guardando en Firebase...';
            
            // Agregar sessionId a los datos
            asistenciaData.sessionId = currentUser.sessionId;
            asistenciaData.authMethod = 'appsscript';
            
            // Guardar en Firestore (mismo método, datos incluyen sessionId)
            await guardarAsistenciaConLogs(asistenciaData);
            console.log('✅ Guardado en Firestore completado');
        }
        
        // PASO 4: Éxito
        console.log('='.repeat(70));
        console.log('✅ ASISTENCIA REGISTRADA EXITOSAMENTE');
        console.log('='.repeat(70));
        
        submitBtn.textContent = '✅ ¡Registrado!';
        submitBtn.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
        
        showStatus('✅ Asistencia registrada correctamente', 'success');
        
        // Resetear formulario
        setTimeout(() => {
            resetFormAfterSubmit();
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.textContent = originalText;
            submitBtn.style.background = '';
            
            // Recargar registros del día
            mostrarRegistrosDelDia();
        }, 2000);
        
    } catch (error) {
        console.error('❌ ERROR GUARDANDO ASISTENCIA:', error);
        console.error('   Stack:', error.stack);
        
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.textContent = originalText;
        submitBtn.style.background = '';
        
        let errorMessage = 'Error al guardar asistencia';
        
        if (error.message) {
            errorMessage += ': ' + error.message;
        }
        
        if (currentUser.authMethod === 'appsscript' && error.toString().includes('session')) {
            errorMessage += '\n\nTu sesión puede haber expirado. Por favor, cierra sesión y vuelve a autenticarte.';
        }
        
        showStatus('❌ ' + errorMessage, 'error');
    }
}

// ========== NOTA IMPORTANTE ==========
/*
A PARTIR DE AQUÍ, EL RESTO DEL CÓDIGO DEL ARCHIVO ORIGINAL SE MANTIENE IGUAL.

Las funciones que se mantienen sin cambios incluyen:
- prepararDatosAsistencia()
- uploadEvidenciasToGoogleDrive()
- validateConditionalFields()
- getCurrentLocation()
- showStatus()
- hideStatus()
- resetFormAfterSubmit()
- setupEventListeners()
- setupEvidenciasHandlers()
- mostrarRegistrosDelDia()
- ocultarRegistrosDelDia()
- updateSubmitButton()
- resetLocationFields()
- resetEvidenciasSection()
- Y todas las demás funciones del archivo original

SOLO SE MODIFICARON:
1. Los imports (para incluir setPersistence, etc.)
2. Las variables globales (agregar authInProgress, persistenceConfigured)
3. La función requestAuthentication (ahora es híbrida)
4. La función signOut (adaptada para ambos métodos)
5. La función handleSubmit (adaptada para ambos métodos)
6. Se agregaron nuevas funciones para Apps Script auth

TODO LO DEMÁS ES IDÉNTICO AL ARCHIVO ORIGINAL.
*/

// ========== EXPORTAR FUNCIONES GLOBALES ==========
window.requestAuthentication = requestAuthentication;
window.signOut = signOut;

// ========== LOG FINAL ==========
console.log('✅ Script Firebase HÍBRIDO cargado completamente');
console.log('🔥 Firebase Firestore: Conectado');
console.log('🔐 Autenticación: Híbrida (Firebase + Apps Script)');
console.log('   - Chrome/Android: Firebase Auth');
console.log('   - Safari/iOS: Google Apps Script');
console.log('📜 Google Drive: Para evidencias');
console.log('🎯 Versión: 2.3 Híbrida');
console.log('📋 Funciones disponibles:');
console.log('   - requestAuthentication() - Híbrida');
console.log('   - signOut() - Adaptada');
console.log('   - mostrarRegistrosDelDia()');
console.log('='.repeat(70));
