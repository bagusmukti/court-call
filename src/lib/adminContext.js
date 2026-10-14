'use client'

import { createContext, useContext } from 'react'

// The logged-in admin's `users` row, provided by src/app/admin/layout.js
// once the session and role have been verified.
export const AdminContext = createContext(null)

export function useAdmin() {
  return useContext(AdminContext)
}
