import React, { createContext, useContext, useState, useCallback } from 'react';

const BookingContext = createContext(null);

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used inside BookingProvider');
  return ctx;
};

const INITIAL_STATE = {
  category: '',       // 'AC', 'Washing Machine', etc.
  productType: '',    // 'Split AC', 'Front Load', etc.
  service: '',        // 'Repair', 'Deep Clean', etc.
  brand: '',          // 'Voltas', 'LG', etc.
  timeSlot: null,     // { date: 'Thu 28', time: '10:00 AM' }
  address: null,      // { house, landmark, name, saveAs }
  price: 0,
};

export const BookingProvider = ({ children }) => {
  const [booking, setBooking] = useState(INITIAL_STATE);

  const updateBooking = useCallback((updates) => {
    setBooking(prev => ({ ...prev, ...updates }));
  }, []);

  const resetBooking = useCallback(() => {
    setBooking(INITIAL_STATE);
  }, []);

  return (
    <BookingContext.Provider value={{ booking, updateBooking, resetBooking }}>
      {children}
    </BookingContext.Provider>
  );
};

export default BookingContext;
