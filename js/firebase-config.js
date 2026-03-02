// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCIrd9j-uEwH1V_WOF3VnHqzID9oR8UIVI",
    authDomain: "motormaster-app-999.firebaseapp.com",
    projectId: "motormaster-app-999",
    storageBucket: "motormaster-app-999.firebasestorage.app",
    messagingSenderId: "1080726130196",
    appId: "1:1080726130196:web:6c7fa7492938d46707e101"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Habilitar persistencia offline con soporte multi-pestaña
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code == 'failed-precondition') {
        console.warn("Persistencia fallida: Múltiples pestañas abiertas sin sincronización");
    } else if (err.code == 'unimplemented') {
        console.warn("Persistencia no soportada por el navegador");
    }
});

const storage = firebase.storage();

// Auth helper
function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
}

function logout() {
    return auth.signOut();
}
