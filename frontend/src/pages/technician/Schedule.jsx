import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Home as HomeIcon, Calendar, Wrench, User, MapPin, ClipboardList, Briefcase, CheckCircle } from 'lucide-react';
import techServiceMap from '../../assets/tech_service_map.png';

const Schedule = () => {
  const navigate = useNavigate();

  const [requestsList, setRequestsList] = useState([
    {
      id: 1,
      category: 'Refrigerator',
      title: 'Cooling System Failure',
      distance: '2.4 miles away',
      payout: '$145.00',
    },
    {
      id: 2,
      category: 'AC Unit',
      title: 'Annual Maintenance',
      distance: '5.1 miles away',
      payout: '$85.00',
    },
    {
      id: 3,
      category: 'Washing Machine',
      title: 'Leaking during cycle',
      distance: '1.2 miles away',
      payout: '$110.00',
    },
  ]);

  const [isSuccess, setIsSuccess] = useState(false);
  const [acceptedJob, setAcceptedJob] = useState(null);

  const handleAccept = (id) => {
    const job = requestsList.find(req => req.id === id);
    setAcceptedJob(job);
    setIsSuccess(true);
    setRequestsList(requestsList.filter(req => req.id !== id));
  };

  const handleDecline = (id) => {
    setRequestsList(requestsList.filter(req => req.id !== id));
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Job Accepted!</h1>
            <p className="text-sm text-slate-500 mt-2">
              You have successfully accepted the job. Please proceed to the location.
            </p>
          </div>

          {acceptedJob && (
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                <span className="text-sm text-slate-500">Category</span>
                <span className="text-sm font-semibold text-slate-900">{acceptedJob.category}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                <span className="text-sm text-slate-500">Job</span>
                <span className="text-sm font-semibold text-slate-900">{acceptedJob.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Est. Payout</span>
                <span className="text-sm font-semibold text-[#0D47A1]">{acceptedJob.payout}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full mt-4">
            <button 
              onClick={() => {
                setIsSuccess(false);
                navigate('/technician/dashboard');
              }}
              className="w-full bg-[#0D47A1] text-white font-semibold py-3 rounded-xl hover:bg-blue-800 transition-colors"
            >
              Go to Active Job
            </button>
            <button 
              onClick={() => setIsSuccess(false)}
              className="w-full bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              View Other Requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-semibold text-sm">
            A
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Technician Panel</h1>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* Greeting */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Welcome back, Alex</h2>
          <p className="text-sm text-slate-500 mt-1">You have {requestsList.length} new job requests in your area.</p>
        </div>

        {/* Section Title */}
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold text-slate-900">New Requests</h3>
          <span className="bg-[#E3ECF9] text-[#0D47A1] text-xs font-semibold px-3 py-1 rounded-full">
            Nearby
          </span>
        </div>

        {/* Job Cards */}
        <div className="flex flex-col gap-4">
          {requestsList.map((req) => (
            <div key={req.id} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
              
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-md">
                    {req.category}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-900 mt-1">{req.title}</h4>
                </div>
                <div className="text-right">
                  <span className="text-base font-semibold text-[#0D47A1]">{req.payout}</span>
                  <p className="text-xs text-slate-500">Est. Payout</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
                <MapPin className="h-3.5 w-3.5" />
                <span>{req.distance}</span>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleAccept(req.id)}
                  className="flex-1 bg-[#0D47A1] text-white font-semibold py-2 rounded-xl hover:bg-blue-800 transition-colors text-sm"
                >
                  Accept
                </button>
                <button 
                  onClick={() => handleDecline(req.id)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-2 rounded-xl hover:bg-slate-50 transition-colors text-sm"
                >
                  Decline
                </button>
              </div>

            </div>
          ))}

          {requestsList.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No new requests at the moment.
            </div>
          )}
        </div>

        {/* Service Area Card */}
        <div className="relative w-full h-48 rounded-2xl overflow-hidden group">
          <img src={techServiceMap} alt="Service Area" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-70"></div>
          <div className="absolute bottom-4 left-4 text-white">
            <h4 className="text-base font-semibold">Service Area</h4>
            <p className="text-sm text-slate-200">North Austin District</p>
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
          className="flex flex-col items-center text-[#0D47A1]"
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
          className="flex flex-col items-center text-text-secondary hover:text-[#0D47A1]"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default Schedule;
