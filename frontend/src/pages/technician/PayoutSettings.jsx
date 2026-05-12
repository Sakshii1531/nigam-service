import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Briefcase, ClipboardList, Calendar, User, CreditCard, Plus } from 'lucide-react';

const PayoutSettings = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([
    { id: 1, type: 'bank', name: 'HDFC Bank', detail: '•••• •••• 4321', primary: true },
    { id: 2, type: 'upi', name: 'alex.rod@okaxis', detail: 'Verified', primary: false },
  ]);

  const addMethod = () => {
    setAccounts([
      ...accounts,
      { id: accounts.length + 1, type: 'bank', name: 'ICICI Bank', detail: '•••• •••• 9876', primary: false }
    ]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Payout Settings</h1>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* Payment Methods */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Payment Methods</h3>
          
          <div className="flex flex-col gap-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E3ECF9] rounded-full flex items-center justify-center">
                    {acc.type === 'bank' ? (
                      <CreditCard className="h-5 w-5 text-[#0D47A1]" />
                    ) : (
                      <div className="font-bold text-[#0D47A1] text-sm">UPI</div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{acc.name}</h4>
                    <p className="text-xs text-slate-500">{acc.detail}</p>
                  </div>
                </div>
                {acc.primary && (
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Primary</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add New Method */}
        <button 
          onClick={addMethod}
          className="w-full border border-dashed border-slate-300 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New Payment Method
        </button>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#E3ECF9] border-t border-border-color p-4 flex justify-around items-center z-10">
        <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]">
          <Briefcase className="h-6 w-6" />
          <span className="text-xs font-medium">Jobs</span>
        </button>
        <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]">
          <ClipboardList className="h-6 w-6" />
          <span className="text-xs font-medium">Requests</span>
        </button>
        <button onClick={() => navigate('/technician/active-job')} className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]">
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Schedule</span>
        </button>
        <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center text-[#0D47A1]">
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default PayoutSettings;
