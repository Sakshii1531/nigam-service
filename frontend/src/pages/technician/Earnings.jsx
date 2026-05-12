import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Shield, Calendar, TrendingUp, ChevronDown, Check, Clock, Briefcase, ClipboardList, User } from 'lucide-react';

const EarningsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Technician Panel</h1>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* Available Balance Card */}
        <div className="bg-[#0A192F] text-white rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Available Balance</span>
          <p className="text-3xl font-semibold mt-1">$4,280.50</p>
          <div className="flex items-center gap-1 mt-1 text-slate-400 text-xs">
            <Shield className="h-3.5 w-3.5" />
            <span>Secured & Verified Funds</span>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button 
              onClick={() => alert('Withdrawal request of $4,280.50 submitted!')}
              className="w-full bg-[#FFD600] text-[#0D47A1] font-semibold py-3 rounded-xl hover:bg-yellow-400 transition-colors"
            >
              Withdraw Funds
            </button>
            <button 
              onClick={() => alert('Report downloading...')}
              className="w-full bg-transparent border border-slate-700 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Download Report
            </button>
          </div>
        </div>

        {/* Today's Earnings */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Today's Earnings</span>
          <p className="text-2xl font-semibold text-slate-900 mt-1">$345.00</p>
          <div className="flex items-center gap-1 mt-2 text-green-600 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            <span>+12.5% from yesterday</span>
          </div>
        </div>

        {/* Weekly Average */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Weekly Average</span>
          <p className="text-2xl font-semibold text-slate-900 mt-1">$1,890.20</p>
          <div className="flex items-center gap-1 mt-2 text-slate-500 text-sm">
            <Calendar className="h-4 w-4" />
            <span>Target: $2,000.00</span>
          </div>
        </div>

        {/* Jobs Completed */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Jobs Completed (Mo)</span>
          <p className="text-2xl font-semibold text-slate-900 mt-1">48</p>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-[#0D47A1] rounded-full" style={{ width: '70%' }}></div>
          </div>
        </div>

        {/* Pending Payouts */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Pending Payouts</span>
          <p className="text-2xl font-semibold text-slate-900 mt-1">$120.00</p>
          <p className="text-xs text-slate-500 mt-1">2 items awaiting review</p>
        </div>

        {/* Income Trends */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-semibold text-slate-900">Income Trends</h3>
            <div className="relative">
              <select className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 focus:outline-none pr-8">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
          
          {/* Bar Chart Placeholder */}
          <div className="flex justify-between items-end h-40 gap-2 px-2">
            {[
              { day: 'Mon', val: 40 },
              { day: 'Tue', val: 20 },
              { day: 'Wed', val: 60 },
              { day: 'Thu', val: 30 },
              { day: 'Fri', val: 80 },
              { day: 'Sat', val: 10 },
              { day: 'Sun', val: 50 },
            ].map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-[#E3ECF9] rounded-t-md hover:bg-[#0D47A1] transition-colors" 
                  style={{ height: `${d.val}%` }}
                ></div>
                <span className="text-xs text-slate-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payouts */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 flex justify-between items-center border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Recent Payouts</h3>
            <button 
              onClick={() => alert('Viewing all payouts...')}
              className="text-sm text-[#0D47A1] font-semibold hover:text-blue-800 transition-colors"
            >
              View All
            </button>
          </div>

          <div className="flex flex-col">
            {[
              { id: 1, job: '#88219', date: 'Nov 14, 2023', amount: '+$185.00', status: 'SETTLED' },
              { id: 2, job: '#88204', date: 'Nov 13, 2023', amount: '+$95.50', status: 'SETTLED' },
              { id: 3, job: '#88195', date: 'Nov 12, 2023', amount: '+$210.00', status: 'PENDING' },
              { id: 4, job: '#88188', date: 'Nov 11, 2023', amount: '+$120.00', status: 'SETTLED' },
            ].map((p) => (
              <div key={p.id} className="p-4 flex justify-between items-center border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    p.status === 'SETTLED' ? 'bg-green-50' : 'bg-yellow-50'
                  }`}>
                    {p.status === 'SETTLED' ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Job {p.job}</h4>
                    <p className="text-xs text-slate-500">{p.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-900">{p.amount}</span>
                  <div className="mt-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.status === 'SETTLED' 
                        ? 'bg-green-50 text-green-600' 
                        : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#E3ECF9] border-t border-border-color p-4 flex justify-around items-center z-10">
        <button 
          onClick={() => navigate('/technician/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <Briefcase className="h-6 w-6" />
          <span className="text-xs font-medium">Jobs</span>
        </button>
        <button 
          onClick={() => navigate('/technician/schedule')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <ClipboardList className="h-6 w-6" />
          <span className="text-xs font-medium">Requests</span>
        </button>
        <button 
          onClick={() => navigate('/technician/active-job')}
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Schedule</span>
        </button>
        <button 
          onClick={() => navigate('/technician/profile')}
          className="flex flex-col items-center text-[#0D47A1]"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default EarningsPage;
