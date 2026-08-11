import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL;

const UserContext = createContext({
  user: null,
  setUser: () => {},
  refetchUser: () => {},
  loading: true
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const rawToken = localStorage.getItem('token');
      if (!rawToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      const savedUserStr = localStorage.getItem('user');
      let userId = localStorage.getItem('user_id');
      if (!userId && savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          userId = parsed._id || parsed.id;
        } catch (e) {}
      }

      if (!userId) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/v1/users/${userId}`, {
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setUser(data.data);
        }
      }
    } catch (err) {
      console.error("UserContext: Error fetching live user profile:", err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <UserContext.Provider value={{ user, setUser, refetchUser: fetchCurrentUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
