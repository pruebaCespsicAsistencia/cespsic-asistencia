// ========== CONFIGURACIÓN FIREBASE ==========
const firebaseConfig = {
  apiKey: "AIzaSyBINCTkXd77-SKnCAlcT1wU6d-kpEkEAHs",
  authDomain: "cespsic-asistencias.firebaseapp.com",
  projectId: "cespsic-asistencias",
  storageBucket: "cespsic-asistencias.firebasestorage.app",
  messagingSenderId: "249910813853",
  appId: "1:249910813853:web:f0764208f9db7727046074",
  measurementId: "G-TXEEEQGY1X"
};

// Inicializar Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

console.log('✅ Firebase inicializado correctamente');
console.log('📊 Proyecto:', firebaseConfig.projectId);

// Exportar para usar en otros archivos
export { db, auth, storage, collection, addDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp, signInWithPopup, GoogleAuthProvider, firebaseSignOut, ref, uploadBytes, getDownloadURL };
