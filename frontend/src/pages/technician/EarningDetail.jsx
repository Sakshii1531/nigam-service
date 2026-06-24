import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Zap, FileText, CheckCircle, Clock, AlertCircle, ShieldCheck,
  Calendar, Briefcase, User, MapPin, CreditCard, Building2, Copy, ChevronRight
} from 'lucide-react';

const ALL_EARNINGS = [
  {
    id: '1',
    title: 'Electrician Repair',
    tag: 'QuickPayout',
    date: '16 May 2026, 02:20 PM',
    amount: 400,
    status: 'Credited',
    icon: 'zap',
    jobId: '#EC-2026-001',
    customer: 'Rohit Sharma',
    address: 'Sector 15, Gomti Nagar, Lucknow',
    category: 'Electrician',
    description: 'Electrical wiring repair and switchboard replacement',
    baseAmount: 380,
    platformFee: 20,
    netAmount: 400,
    payoutType: 'QuickPayout',
    payoutNote: 'Instant credit after job completion',
    creditedTo: 'Wallet',
    transactionId: 'TXN202605161001',
    timeline: [
      { label: 'Job Assigned', time: '16 May 2026, 10:00 AM', done: true },
      { label: 'Job Completed', time: '16 May 2026, 01:45 PM', done: true },
      { label: 'Payout Initiated', time: '16 May 2026, 01:50 PM', done: true },
      { label: 'Amount Credited', time: '16 May 2026, 02:20 PM', done: true },
    ],
  },
  {
    id: '2',
    title: 'Plumbing Service',
    tag: 'QuickPayout',
    date: '16 May 2026, 11:15 AM',
    amount: 350,
    status: 'Credited',
    icon: 'zap',
    jobId: '#PL-2026-002',
    customer: 'Neha Verma',
    address: 'Hazratganj, Lucknow',
    category: 'Plumbing',
    description: 'Kitchen sink blockage and pipe repair',
    baseAmount: 330,
    platformFee: 20,
    netAmount: 350,
    payoutType: 'QuickPayout',
    payoutNote: 'Instant credit after job completion',
    creditedTo: 'Wallet',
    transactionId: 'TXN202605160902',
    timeline: [
      { label: 'Job Assigned', time: '16 May 2026, 08:00 AM', done: true },
      { label: 'Job Completed', time: '16 May 2026, 10:50 AM', done: true },
      { label: 'Payout Initiated', time: '16 May 2026, 10:55 AM', done: true },
      { label: 'Amount Credited', time: '16 May 2026, 11:15 AM', done: true },
    ],
  },
  {
    id: '3',
    title: 'LG Refrigerator – Warranty Claim',
    tag: 'InvoicePayout',
    date: '17 May 2026, 04:20 PM',
    amount: 450,
    status: 'Approval Pending',
    icon: 'file',
    jobId: '#WC-2026-003',
    customer: 'Anil Mehta',
    address: 'Alambagh, Lucknow',
    category: 'Refrigerator Repair',
    description: 'Warranty repair — compressor cooling issue, in-warranty claim',
    baseAmount: 450,
    platformFee: 0,
    netAmount: 450,
    payoutType: 'InvoicePayout',
    payoutNote: 'Settled after NCC approval. Usually within 3–5 business days.',
    creditedTo: 'Bank Account (SBI ••••4521)',
    transactionId: 'INV202605170033',
    timeline: [
      { label: 'Job Assigned', time: '17 May 2026, 11:00 AM', done: true },
      { label: 'Job Completed', time: '17 May 2026, 03:30 PM', done: true },
      { label: 'Invoice Submitted', time: '17 May 2026, 03:45 PM', done: true },
      { label: 'Approval Pending', time: '17 May 2026, 04:20 PM', done: true },
      { label: 'Amount Credited', time: 'Awaiting approval', done: false },
    ],
  },
  {
    id: '4',
    title: 'NCC AMC – Quarterly Visit',
    tag: 'InvoicePayout',
    date: '17 May 2026, 10:30 AM',
    amount: 250,
    status: 'Approved',
    icon: 'file',
    jobId: '#AMC-2026-004',
    customer: 'Sunita Gupta',
    address: 'Indira Nagar, Lucknow',
    category: 'AMC Service',
    description: 'NCC AMC quarterly preventive maintenance visit — AC servicing',
    baseAmount: 250,
    platformFee: 0,
    netAmount: 250,
    payoutType: 'InvoicePayout',
    payoutNote: 'Approved. Credit will be initiated in 1–2 business days.',
    creditedTo: 'Bank Account (SBI ••••4521)',
    transactionId: 'INV202605170024',
    timeline: [
      { label: 'Job Assigned', time: '17 May 2026, 08:00 AM', done: true },
      { label: 'Job Completed', time: '17 May 2026, 09:45 AM', done: true },
      { label: 'Invoice Submitted', time: '17 May 2026, 09:50 AM', done: true },
      { label: 'Approved by NCC', time: '17 May 2026, 10:30 AM', done: true },
      { label: 'Amount Credited', time: 'Scheduled', done: false },
    ],
  },
  {
    id: '5',
    title: 'Voltas AC Service (Partner Brand)',
    tag: 'InvoicePayout',
    date: '16 May 2026, 03:45 PM',
    amount: 600,
    status: 'Verification',
    icon: 'file',
    jobId: '#PB-2026-005',
    customer: 'Ramesh Yadav',
    address: 'Vikas Nagar, Lucknow',
    category: 'AC Service',
    description: 'Partner brand service — Voltas AC deep cleaning and gas top-up',
    baseAmount: 600,
    platformFee: 0,
    netAmount: 600,
    payoutType: 'InvoicePayout',
    payoutNote: 'Under verification by NCC team. Payout after verification.',
    creditedTo: 'Bank Account (SBI ••••4521)',
    transactionId: 'INV202605160055',
    timeline: [
      { label: 'Job Assigned', time: '16 May 2026, 12:00 PM', done: true },
      { label: 'Job Completed', time: '16 May 2026, 03:00 PM', done: true },
      { label: 'Invoice Submitted', time: '16 May 2026, 03:15 PM', done: true },
      { label: 'Under Verification', time: '16 May 2026, 03:45 PM', done: true },
      { label: 'Amount Credited', time: 'Pending verification', done: false },
    ],
  },
];

const statusConfig = {
  'Credited':          { color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200', icon: <CheckCircle className="h-4 w-4 text-green-600" /> },
  'Approved':          { color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200', icon: <CheckCircle className="h-4 w-4 text-green-600" /> },
  'Approval Pending':  { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: <Clock className="h-4 w-4 text-orange-500" /> },
  'Verification':      { color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',  icon: <ShieldCheck className="h-4 w-4 text-blue-500" /> },
};

const EarningDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const earning = ALL_EARNINGS.find(e => e.id === id);

  if (!earning) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center max-w-md mx-auto">
        <div className="text-center p-6">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600">Earning record not found.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-xs text-[#0D47A1] font-semibold underline">Go Back</button>
        </div>
      </div>
    );
  }

  const sc = statusConfig[earning.status] || statusConfig['Credited'];
  const isQuick = earning.tag === 'QuickPayout';

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex flex-col pb-8 max-w-md mx-auto border-x border-slate-200 shadow-xl font-sans">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-semibold text-[#052355] flex-1">Earning Detail</h1>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold ${sc.bg} ${sc.border} ${sc.color}`}>
          {sc.icon}
          {earning.status}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3 p-3.5">

        {/* Amount Card */}
        <div className={`rounded-2xl p-4 ${isQuick ? 'bg-[#0A2D6E]' : 'bg-[#0A2D6E]'} shadow-lg`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${isQuick ? 'bg-amber-400/20' : 'bg-white/10'}`}>
              {isQuick
                ? <Zap className="h-4 w-4 text-amber-400 fill-amber-300" />
                : <FileText className="h-4 w-4 text-blue-200" />
              }
            </div>
            <div>
              <p className={`text-[10px] font-semibold ${isQuick ? 'text-amber-300' : 'text-blue-300'}`}>{earning.tag}</p>
              <p className="text-[9px] text-blue-300/70">{earning.payoutNote}</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">₹{earning.netAmount}</p>
          <p className="text-[10px] text-blue-300 mt-1">{earning.date}</p>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-blue-300">Transaction ID</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-white">{earning.transactionId}</span>
              <button
                onClick={() => navigator.clipboard?.writeText(earning.transactionId)}
                className="p-1 bg-white/10 rounded-md hover:bg-white/20 transition-colors"
              >
                <Copy className="h-3 w-3 text-blue-200" />
              </button>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-3.5 pb-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-[#052355]">Job Details</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0 mt-0.5">
                <Briefcase className="h-4 w-4 text-[#0D47A1]" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400">Job ID</p>
                <p className="text-xs font-semibold text-[#052355]">{earning.jobId}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0 mt-0.5">
                <Briefcase className="h-4 w-4 text-[#0D47A1]" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400">Service</p>
                <p className="text-xs font-semibold text-[#052355]">{earning.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{earning.description}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-green-50 rounded-lg flex-shrink-0 mt-0.5">
                <User className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400">Customer</p>
                <p className="text-xs font-semibold text-[#052355]">{earning.customer}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-orange-50 rounded-lg flex-shrink-0 mt-0.5">
                <MapPin className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400">Location</p>
                <p className="text-xs font-semibold text-[#052355]">{earning.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-slate-50 rounded-lg flex-shrink-0 mt-0.5">
                <Calendar className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400">Date & Time</p>
                <p className="text-xs font-semibold text-[#052355]">{earning.date}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payout Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-3.5 pb-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-[#052355]">Payout Breakdown</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Service Amount</span>
              <span className="text-[11px] font-semibold text-[#052355]">₹{earning.baseAmount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Platform Fee</span>
              <span className={`text-[11px] font-semibold ${earning.platformFee === 0 ? 'text-green-600' : 'text-red-500'}`}>
                {earning.platformFee === 0 ? '₹0 (Free)' : `-₹${earning.platformFee}`}
              </span>
            </div>
            <div className="h-px bg-slate-100 my-0.5" />
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#052355]">Net Payout</span>
              <span className="text-sm font-bold text-[#0D47A1]">₹{earning.netAmount}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="p-1 bg-white border border-slate-200 rounded-lg">
                {earning.creditedTo.includes('Wallet')
                  ? <CreditCard className="h-3.5 w-3.5 text-[#0D47A1]" />
                  : <Building2 className="h-3.5 w-3.5 text-[#0D47A1]" />
                }
              </div>
              <div>
                <p className="text-[9px] text-slate-400">Credited To</p>
                <p className="text-[11px] font-semibold text-[#052355]">{earning.creditedTo}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-3.5 pb-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-[#052355]">Status Timeline</p>
          </div>
          <div className="px-4 py-3">
            {earning.timeline.map((step, idx) => (
              <div key={idx} className="flex gap-3 relative">
                {/* Vertical line */}
                {idx < earning.timeline.length - 1 && (
                  <div className={`absolute left-[14px] top-6 w-0.5 h-full -translate-x-1/2 ${step.done ? 'bg-[#0D47A1]' : 'bg-slate-200'}`} />
                )}
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center z-10 border-2 ${
                  step.done
                    ? 'bg-[#0D47A1] border-[#0D47A1]'
                    : 'bg-white border-slate-300'
                }`}>
                  {step.done
                    ? <CheckCircle className="h-3.5 w-3.5 text-white fill-white" />
                    : <div className="w-2 h-2 rounded-full bg-slate-300" />
                  }
                </div>
                <div className={`pb-5 flex-1 ${idx === earning.timeline.length - 1 ? 'pb-0' : ''}`}>
                  <p className={`text-[11px] font-semibold ${step.done ? 'text-[#052355]' : 'text-slate-400'}`}>{step.label}</p>
                  <p className={`text-[10px] mt-0.5 ${step.done ? 'text-slate-500' : 'text-slate-400'}`}>{step.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help CTA */}
        <button
          onClick={() => navigate('/technician/technical-support')}
          className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="text-left">
            <p className="text-xs font-semibold text-[#052355]">Need help with this payout?</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Contact NCC support team</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>

      </div>
    </div>
  );
};

export default EarningDetailPage;
