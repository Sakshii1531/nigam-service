import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Wrench, Home as HomeIcon, User, ShoppingCart, LayoutGrid } from 'lucide-react';

const Bookings = () => {
  const navigate = useNavigate();

  const bookings = [
    {
      id: 'NC-98234',
      service: 'Refrigerator Service',
      date: '12 May 2026',
      time: '10:00 AM',
      status: 'Ongoing',
      price: '₹499'
    },
    {
      id: 'NC-98122',
      service: 'AC Repair',
      date: '10 May 2026',
      time: '02:30 PM',
      status: 'Completed',
      price: '₹299'
    }
  ];

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20">
      
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">My Bookings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
        
        {bookings.map((booking) => (
          <div 
            key={booking.id}
            className="bg-white p-4 rounded-2xl shadow-sm border border-border-color flex flex-col gap-3"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-[#2E7D32]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{booking.service}</h3>
                  <span className="text-xs text-text-secondary">ID: {booking.id}</span>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${booking.status === 'Ongoing' ? 'bg-[#E3ECF9] text-[#0D47A1]' : 'bg-[#E8F5E9] text-[#2E7D32]'}`}>
                {booking.status}
              </span>
            </div>

            <div className="border-t border-border-color pt-3 flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{booking.date}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{booking.time}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-[#0D47A1]">{booking.price}</span>
                {booking.status === 'Ongoing' && (
                  <span className="mt-1 text-xs font-semibold text-[#2E7D32]">In Progress</span>
                )}
              </div>
            </div>
          </div>
        ))}

      </div>

      {/* Bottom Navigation (Reused) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-10 overflow-visible">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-medium">Categories</span>
        </button>

        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-medium">Buy</span>
        </button>

        <button className="flex flex-col items-center text-[#0D47A1]">
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Account</span>
        </button>
      </div>

    </div>
  );
};

export default Bookings;
