import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => {
        set({ 
          user, 
          token, 
          isAuthenticated: true 
        });
      },
      
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });
      },
      
      getToken: () => get().token,
    }),
    {
      name: 'intelliscalesim-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;
