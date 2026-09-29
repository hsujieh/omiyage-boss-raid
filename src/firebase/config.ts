import type { FirebaseApp } from 'firebase/app'
import type { Firestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(
  config.apiKey &&
    config.authDomain &&
    config.projectId &&
    config.appId,
)

let app: FirebaseApp | null = null
let db: Firestore | null = null
let initPromise: Promise<Firestore> | null = null

export async function getDb(): Promise<Firestore> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase 尚未設定')
  }
  if (db) return db
  if (!initPromise) {
    initPromise = (async () => {
      const { initializeApp } = await import('firebase/app')
      const { getFirestore } = await import('firebase/firestore')
      app = initializeApp(config)
      db = getFirestore(app)
      return db
    })()
  }
  return initPromise
}
