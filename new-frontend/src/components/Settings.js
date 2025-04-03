import { useState, useEffect, createContext, useContext } from 'react';
import './Settings.css';
import { 
  getAuth, 
  updateProfile as firebaseUpdateProfile, 
  updateEmail as firebaseUpdateEmail,
  deleteUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getStorage, ref, deleteObject, listAll } from 'firebase/storage';

// Create context for settings
const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  // Apply dark mode on mount
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setCurrentUser({
              ...user,
              ...userDoc.data()
            });
          } else {
            const initialData = {
              displayName: user.displayName || '',
              email: user.email || '',
              phoneNumber: '',
              bio: '',
              location: '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            await setDoc(userDocRef, initialData);
            setCurrentUser({
              ...user,
              ...initialData
            });
          }
        } catch (error) {
          console.error('Error fetching or creating user data:', error);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  const updateProfile = async (newProfileData) => {
    if (!currentUser) return { success: false, error: 'No user logged in' };
    
    try {
      setLoading(true);

      if (newProfileData.displayName !== currentUser.displayName) {
        await firebaseUpdateProfile(auth.currentUser, { displayName: newProfileData.displayName });
      }
      if (newProfileData.email && newProfileData.email !== currentUser.email) {
        await firebaseUpdateEmail(auth.currentUser, newProfileData.email);
      }

      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        ...newProfileData,
        updatedAt: serverTimestamp()
      });

      setCurrentUser({ ...currentUser, ...newProfileData });
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteUserData = async () => {
    if (!currentUser) return { success: false, error: 'No user logged in' };
    
    try {
      setLoading(true);
      const userId = currentUser.uid;
      
      const userStorageRef = ref(storage, `users/${userId}`);
      const filesList = await listAll(userStorageRef);
      await Promise.all(filesList.items.map(fileRef => deleteObject(fileRef)));
      
      await deleteDoc(doc(db, 'users', userId));

      await deleteUser(auth.currentUser);
      
      setLoading(false);
      return { success: true, message: 'Account and all data deleted successfully' };
    } catch (error) {
      setLoading(false);
      console.error('Error deleting data:', error);
      return { success: false, error: error.message };
    }
  };

  const toggleDarkMode = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  const value = {
    currentUser,
    loading,
    updateProfile,
    deleteUserData,
    darkMode,
    toggleDarkMode,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const Settings = () => {
  const { currentUser, updateProfile, deleteUserData, toggleDarkMode, darkMode } = useSettings();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isDeleteFormVisible, setIsDeleteFormVisible] = useState(false);
  const [usernameForDelete, setUsernameForDelete] = useState('');
  const [emailForDelete, setEmailForDelete] = useState('');
  const [isDeleteConfirmed, setIsDeleteConfirmed] = useState(false);

  const [showContactDetails, setShowContactDetails] = useState(false); // State to manage visibility of contact details

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setEmail(currentUser.email || '');
      setPhoneNumber(currentUser.phoneNumber || '');
    }
  }, [currentUser]);

  const handleUpdateProfile = async () => {
    const result = await updateProfile({ displayName, email, phoneNumber });
    if (result.success) {
      setSuccessMessage('Profile updated successfully!');
    } else {
      setSuccessMessage('Error updating profile. Please try again.');
    }
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (usernameForDelete === currentUser.displayName && emailForDelete === currentUser.email) {
        const result = await deleteUserData();
        if (result.success) {
          alert('Your account has been deleted.');
        } else {
          alert('Error deleting account.');
        }
      } else {
        alert('Username and email do not match. Please check your details.');
      }
    }
  };

  const toggleDeleteForm = () => {
    setIsDeleteFormVisible(!isDeleteFormVisible);
    setUsernameForDelete('');
    setEmailForDelete('');
    setIsDeleteConfirmed(false);
  };

  const handleSupport = () => {
    setShowContactDetails(!showContactDetails); // Toggle visibility of contact details
  };

  if (!currentUser) return <div>Please log in to access settings.</div>;

  return (
    <div className="settings-container">
      <section className="profile-settings">
        <h2>Profile Settings</h2>

        {isEditing ? (
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
            />
            <label>Phone Number</label>
            <input 
              type="text" 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <button onClick={handleUpdateProfile}>Save Changes</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        ) : (
          <div>
            <button onClick={() => setIsEditing(true)}>Update Profile</button>
          </div>
        )}
      </section>

      <section className="data-management">
        <h2>Manage Data</h2>
        <button className="delete-button" onClick={toggleDeleteForm}>
          {isDeleteFormVisible ? 'Cancel Deletion' : 'Delete Account'}
        </button>

        {isDeleteFormVisible && (
          <div className="delete-form">
            <h3>Confirm Account Deletion</h3>
            <label>Username</label>
            <input
              type="text"
              value={usernameForDelete}
              onChange={(e) => setUsernameForDelete(e.target.value)}
            />
            <label>Email</label>
            <input
              type="email"
              value={emailForDelete}
              onChange={(e) => setEmailForDelete(e.target.value)}
            />
            <button onClick={handleDeleteAccount}>
              Confirm Deletion
            </button>
          </div>
        )}
      </section>

      <section className="support-section">
        <h2>Support</h2>
        <button className="support-button" onClick={handleSupport}>
          Contact Support
        </button>

        {showContactDetails && (
          <div className="contact-details">
            <p>
              For help, please contact us at{' '}
              <a href="mailto:farmhub@gmail.com">farmhub@gmail.com</a>
            </p>
            <p>
              You can also reach us by phone on{' '}
              <a href="tel:+26658090971">+266 58090971 (WhatsApp)</a>
            </p>
          </div>
        )}
      </section>

      <section className="theme-settings">
        <h2>Theme Settings</h2>
        <button className="dark-mode-toggle" onClick={toggleDarkMode}>
          {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </button>
      </section>
    </div>
  );
};

export default Settings;
