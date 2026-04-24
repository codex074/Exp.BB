import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDvYvz_oWV9KwKpfr0basPtLEldAdvX8zU',
  authDomain: 'expmanage-bb738.firebaseapp.com',
  projectId: 'expmanage-bb738',
  storageBucket: 'expmanage-bb738.firebasestorage.app',
  messagingSenderId: '1090238248807',
  appId: '1:1090238248807:web:d1453b7dbeb429cda921c2',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
