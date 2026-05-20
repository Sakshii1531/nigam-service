import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Check, Sparkles, Building, Landmark } from 'lucide-react';

const FinanceDetails = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  
  // Dynamic contents based on the sub-route type
  const isPersonalLoan = type === 'personal-loan';
  const isEMI = type === 'emi';
  const isCreditCard = type === 'credit-card';
  const isSuperCard = type === 'supercard';

  // Calculator states
  const [sliderVal, setSliderVal] = useState(isPersonalLoan ? 500000 : 50000);
  const [term, setTerm] = useState(isPersonalLoan ? 24 : 6);
  const [applied, setApplied] = useState(false);

  const getTitle = () => {
    if (isPersonalLoan) return 'Nigam Personal Loan';
    if (isEMI) return 'Nigam Easy EMI';
    if (isCreditCard) return 'Nigam Axis Credit Card';
    return 'superCard (BNPL)';
  };

  const getSubTitle = () => {
    if (isPersonalLoan) return 'Pre-approved loan up to ₹10,00,000 in 5 minutes';
    if (isEMI) return 'Convert high-cost home appliance bills into 0% interest EMIs';
    if (isCreditCard) return 'Unlimited 5% cashback on all Nigam home services';
    return 'Activate Buy Now Pay Later in 3 interest-free payments';
  };

  const handleApply = (e) => {
    e.preventDefault();
    setApplied(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col h-[700px] border border-slate-100 relative">
        
        {/* Header */}
        <div className="p-5 flex items-center border-b border-slate-100 flex-shrink-0">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <h1 className="text-base font-extrabold text-[#0D47A1] ml-3">{getTitle()}</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto pb-10">
          
          {/* Main Visual Banner */}
          <div className="bg-gradient-to-br from-[#072C63] via-[#0A3D80] to-[#0D47A1] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col gap-2">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#FFD400]/10 rounded-full blur-2xl"></div>
            
            <span className="text-[8px] bg-[#FFD400] text-black font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider self-start">
              {isPersonalLoan && 'Instant Disbursal'}
              {isEMI && 'No Cost* EMI'}
              {isCreditCard && 'Zero Joining Fee'}
              {isSuperCard && '3% Cashback Active'}
            </span>
            
            <h2 className="text-sm font-extrabold leading-snug mt-1">{getSubTitle()}</h2>
            
            <div className="border-t border-white/10 pt-3 mt-1 flex justify-between items-center text-[10px] font-bold text-white/90">
              <span>Security Protocol: SSL</span>
              <span className="text-[#FFD400]">Nigam Verified Finance</span>
            </div>
          </div>

          {!applied ? (
            <>
              {/* Specialized Calculators */}
              {(isPersonalLoan || isEMI) && (
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-4">
                  <h3 className="text-xs font-extrabold text-text-primary uppercase tracking-wider">
                    {isPersonalLoan ? 'LOAN AMOUNT CALCULATOR' : 'CREDIT LIMIT SELECTOR'}
                  </h3>
                  
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-text-secondary mb-1">
                      <span>Selected Amount</span>
                      <span className="text-[#0D47A1]">₹{sliderVal.toLocaleString('en-IN')}</span>
                    </div>
                    <input 
                      type="range"
                      min={isPersonalLoan ? 50000 : 10000}
                      max={isPersonalLoan ? 1000000 : 150000}
                      step={5000}
                      value={sliderVal}
                      onChange={(e) => setSliderVal(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D47A1]"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-text-secondary block mb-2 uppercase">CHOOSE REPAYMENT TERM</span>
                    <div className="grid grid-cols-3 gap-2">
                      {isPersonalLoan ? (
                        [12, 24, 36].map(t => (
                          <button 
                            key={t}
                            onClick={() => setTerm(t)}
                            className={`py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                              term === t ? 'border-[#0D47A1] bg-blue-50/20 text-[#0D47A1]' : 'border-slate-200 bg-white text-text-secondary'
                            }`}
                          >
                            {t} Months
                          </button>
                        ))
                      ) : (
                        [3, 6, 9].map(t => (
                          <button 
                            key={t}
                            onClick={() => setTerm(t)}
                            className={`py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                              term === t ? 'border-[#0D47A1] bg-blue-50/20 text-[#0D47A1]' : 'border-slate-200 bg-white text-text-secondary'
                            }`}
                          >
                            {t} Months
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 border-dashed pt-3 flex justify-between items-center text-xs font-bold text-text-primary">
                    <span>Estimated Monthly Payment:</span>
                    <span className="text-emerald-600">
                      ₹{Math.round((sliderVal / term) * 1.085).toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                </div>
              )}

              {/* Benefits list for Credit Card & superCard */}
              {(isCreditCard || isSuperCard) && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider">Premium Rewards & Perks</h3>
                  <div className="flex flex-col gap-2.5">
                    {[
                      isCreditCard ? 'Complimentary domestic airport lounge access (4/year)' : '100% interest-free payments spread across 3 equal months',
                      isCreditCard ? '5% unlimited cashback on Nigam appliances & smart services' : 'Flat 3% instant cashback credited to Nigam SuperCoin wallet',
                      isCreditCard ? 'Zero joining fee & lifetime free membership benefits' : 'One-click activation with zero paperwork or documentation check'
                    ].map((benefit, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl flex items-start gap-3 shadow-sm">
                        <div className="p-1 bg-emerald-50 text-emerald-600 rounded-md mt-0.5">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-text-primary leading-relaxed">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fast Application Form */}
              <form onSubmit={handleApply} className="flex flex-col gap-3">
                <h3 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider">KYC Eligibility</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-text-secondary block mb-1">PAN CARD NUMBER</label>
                    <input 
                      type="text"
                      placeholder="ABCDE1234F"
                      required
                      maxLength={10}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-text-primary focus:border-[#0D47A1] focus:bg-white outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-text-secondary block mb-1">MONTHLY SALARY</label>
                    <input 
                      type="number"
                      placeholder="e.g. 45000"
                      required
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-text-primary focus:border-[#0D47A1] focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="bg-blue-50/40 border border-blue-50 p-2.5 rounded-xl flex items-center gap-2 mt-1">
                  <ShieldCheck className="h-4.5 w-4.5 text-[#0D47A1] flex-shrink-0" />
                  <span className="text-[9px] font-bold text-[#0D47A1] leading-normal">
                    By submitting, you authorize Nigam Finance to pull credit records via CIBIL securely.
                  </span>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#FFD600] text-[#0D47A1] font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-1.5 hover:bg-yellow-400 active:scale-[0.99] transition-all shadow-md mt-2 cursor-pointer text-xs"
                >
                  <Sparkles className="h-4 w-4" /> Check Approval Status
                </button>
              </form>
            </>
          ) : (
            /* Congratulations / Approved Screen */
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-[scaleIn_0.35s_ease-out]">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                <Check className="h-8 w-8" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#212121] text-base">Congratulations, Sakshi!</h3>
                <p className="text-xs text-text-secondary mt-1 max-w-[280px] mx-auto leading-relaxed">
                  Your eligibility is pre-approved by our CIBIL validation system!
                </p>
              </div>

              <div className="bg-[#F8FAFC] border border-[#BACBE7]/80 rounded-2xl p-4 w-full text-left flex flex-col gap-2 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Approved Limit:</span>
                  <span className="font-extrabold text-[#0D47A1]">
                    {isPersonalLoan ? '₹8,50,000' : isEMI ? '₹1,20,000' : isCreditCard ? '₹1,50,000' : '₹45,000'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Interest Rate:</span>
                  <span className="font-extrabold text-emerald-600">
                    {isPersonalLoan ? '10.5% p.a.' : '0% Interest'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Processing Time:</span>
                  <span className="font-bold text-text-primary">Instant Disbursal</span>
                </div>
              </div>

              <button 
                onClick={() => navigate('/profile')}
                className="w-full bg-[#0D47A1] text-white font-extrabold py-3.5 rounded-2xl hover:bg-blue-900 active:scale-[0.99] transition-all shadow-md mt-4 cursor-pointer text-xs"
              >
                Return to Account Details
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default FinanceDetails;
