// src/hooks/useAuth.js
import { useEffect, useState } from "react";
import { auth } from "../FirebaseConfig"; // Import Firebase auth
import { onAuthStateChanged } from "firebase/auth";

const useAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        localStorage.setItem("user", JSON.stringify(user)); // Store session
      } else {
        setUser(null);
        localStorage.removeItem("user"); // Clear session
      }
    });

    return () => unsubscribe();
  }, []);

  return user;
};

export default useAuth;
