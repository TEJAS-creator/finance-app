import { auth } from '../firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

export const authService = {
  // 0. Sign in with Google using Firebase Authentication popup
  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      // Enforce clean session selection if desired
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      return userCredential.user;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      let message = 'Google sign-in was cancelled or failed. Please try again.';
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Google sign-in popup was closed before completion.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = 'Google sign-in popup request was cancelled.';
      }
      throw new Error(message);
    }
  },
  // 1. Sign Up a new user using Firebase Authentication
  async signup(name, email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Attach the display name to the Firebase Auth profile
      await updateProfile(userCredential.user, { displayName: name });
      return userCredential.user;
    } catch (error) {
      // Map standard Firebase error codes to clean user-friendly messages
      let message = 'An error occurred during registration. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists.';
      } else if (error.code === 'auth/weak-password') {
        message = 'The password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please provide a valid email address.';
      }
      throw new Error(message);
    }
  },

  // 2. Log in an existing user using Firebase Authentication
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      let message = 'Invalid email or password combination.';
      if (error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password combination.';
      } else if (error.code === 'auth/user-not-found') {
        message = 'No account associated with this email exists.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password. Please try again.';
      }
      throw new Error(message);
    }
  },

  // 3. Log out the user
  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // 4. Get currently logged in session synchronously (if hydrated)
  getCurrentUser() {
    return auth.currentUser;
  },

  // 5. Subscribe to real-time authentication state updates
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
};