import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMyl7pzwV3VmdQpIvFSe-5hq3w0Ywd8O8",
  authDomain: "xomad-e290c.firebaseapp.com",
  databaseURL: "https://xomad-e290c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "xomad-e290c",
  storageBucket: "xomad-e290c.firebasestorage.app",
  messagingSenderId: "708729209088",
  appId: "1:708729209088:web:97b451f51349d92336f3e5",
  measurementId: "G-X2HZ59KMLS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
