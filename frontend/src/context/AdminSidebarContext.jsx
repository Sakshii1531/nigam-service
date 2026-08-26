import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminSidebarContext = createContext();

export const AdminSidebarProvider = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('admin_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    if (!isSidebarOpen) {
      document.documentElement.classList.add('admin-sidebar-collapsed');
    } else {
      document.documentElement.classList.remove('admin-sidebar-collapsed');
    }
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_open', String(next));
      return next;
    });
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    localStorage.setItem('admin_sidebar_open', 'false');
  };

  const openSidebar = () => {
    setIsSidebarOpen(true);
    localStorage.setItem('admin_sidebar_open', 'true');
  };

  return (
    <AdminSidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, openSidebar, closeSidebar }}>
      {children}
    </AdminSidebarContext.Provider>
  );
};

export const useAdminSidebar = () => {
  const ctx = useContext(AdminSidebarContext);
  if (!ctx) {
    return {
      isSidebarOpen: true,
      toggleSidebar: () => {},
      openSidebar: () => {},
      closeSidebar: () => {},
    };
  }
  return ctx;
};
