import { createContext, useContext } from 'react';

// The signed-in user ({ id, name, email, role }), provided by AppShell
export const UserContext = createContext(null);

// Role-aware UI: admin-only actions are hidden only when the role is known and is not admin, so an
// admin never loses a button because of a missing field. The API enforces the roles regardless.
export const useIsAdmin = () => {
  const user = useContext(UserContext);
  return !user?.role || user.role === 'admin';
};
