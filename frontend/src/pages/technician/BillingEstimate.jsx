import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Shield, ShieldCheck } from 'lucide-react';
import { useTech } from '../../context/TechContext';

const WhatsAppIcon = () => (
  <svg className="h-4 w-4 fill-green-600" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.803-4.394 9.806-9.799.002-2.617-1.008-5.078-2.848-6.92C16.39 2.043 13.934.802 12.01.802c-5.409 0-9.81 4.403-9.813 9.811-.001 1.51.393 2.986 1.14 4.3l-.38 1.396 1.432-.375c1.233.67 2.455.992 3.633.992.003 0 .004 0 .006 0zm9.734-7.273c-.299-.149-1.767-.872-2.04-.972-.272-.1-.471-.149-.669.149-.198.299-.768.972-.942 1.171-.173.199-.348.224-.647.075-.3-.15-1.267-.467-2.414-1.491-.892-.797-1.495-1.782-1.67-2.08-.174-.299-.018-.461.13-.61.134-.133.3-.348.449-.522.15-.174.199-.299.299-.498.1-.199.05-.374-.025-.523-.075-.15-.669-1.612-.917-2.209-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.299-1.04 1.018-1.04 2.485 0 1.467 1.067 2.882 1.216 3.081.149.199 2.099 3.205 5.086 4.495.71.307 1.265.49 1.696.627.713.227 1.363.195 1.876.118.571-.085 1.767-.722 2.015-1.418.248-.696.248-1.293.173-1.418-.074-.125-.272-.199-.57-.348z"/>
  </svg>
);

// ── Helper: generate a print-friendly PDF window ──────────────────────────────
const openPDF = (html) => {
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
};

const BillingEstimate = () => {
  const navigate = useNavigate();
  const { activeJob, selectJobForDetails, setActiveStep, collectPayment, decrementAmcVisit, decrementEwClaim } = useTech();

  const isAMC = activeJob?.type === 'AMC Visit' || activeJob?.type === 'AMC VISIT';
  const isBrandWarranty = activeJob?.type === 'Brand Warranty' || activeJob?.type === 'BRAND WARRANTY';
  const isExtendedWarranty = activeJob?.type === 'NCC Extended Warranty' || activeJob?.type === 'NCC EXTENDED WARRANTY';
  const isPaid = !isAMC && !isBrandWarranty && !isExtendedWarranty;

  // The line items are whatever the technician actually recorded on this job at
  // the spare-parts step; only checked items are billable.
  const billing = activeJob?.billingEstimate || {};
  const billedParts = (activeJob?.spareParts || []).filter((i) => i.checked);
  const billedServices = (activeJob?.additionalServices || []).filter((i) => i.checked);
  const gstPercent = billing.gstPercent ?? 18;

  // For AMC/warranty jobs the base visit is covered, so the customer only pays
  // for extras beyond scope.
  const extrasTotal = billedServices.reduce((sum, i) => sum + (i.price || 0), 0)
    + billedParts.reduce((sum, i) => sum + (i.price || 0), 0);
  const gst = Math.round(extrasTotal * (gstPercent / 100));
  const extrasGrandTotal = extrasTotal + gst;

  const serviceCharge = billing.serviceCharge || 0;
  const paidSubtotal = serviceCharge + extrasTotal;
  const paidTax = Math.round(paidSubtotal * (gstPercent / 100));
  const paidTotal = billing.total != null ? Math.round(billing.total) : paidSubtotal + paidTax;

  const money = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

  const handleCollectPayment = () => {
    if (activeJob) {
      collectPayment();
      if (isAMC && activeJob?.id) decrementAmcVisit(activeJob.id);
      if (isExtendedWarranty && activeJob?.id) decrementEwClaim(activeJob.id);
    } else {
      selectJobForDetails('8842');
      setActiveStep('completed');
    }
    navigate('/technician/active-job');
  };

  // ── AMC: Service Report PDF ───────────────────────────────────────────────
  const generateAMCReport = () => {
    openPDF(`
      <html>
        <head>
          <title>AMC Service Report — Visit ${activeJob?.amcVisitNumber || 2}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; max-width: 600px; margin: auto; }
            .header { border-bottom: 2px solid #FFA000; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
            .brand { font-size: 20px; color: #052355; font-weight: bold; }
            .badge { font-size: 10px; background: #FFF3E0; color: #E65100; padding: 4px 10px; border-radius: 4px; font-weight: bold; letter-spacing: 1px; }
            .section-title { font-size: 11px; text-transform: uppercase; color: #888; font-weight: bold; letter-spacing: 1px; margin-bottom: 10px; margin-top: 20px; }
            .task-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 13px; }
            .check { color: #00C853; font-weight: bold; }
            .followup { color: #E65100; font-weight: bold; }
            .total-row { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; }
            .grand-total { font-size: 16px; font-weight: bold; color: #052355; border-top: 2px solid #FFA000; padding-top: 12px; margin-top: 8px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">NCC AMC Service Report</div>
              <div style="font-size: 11px; color: #666; margin-top: 3px;">
                Plan: ${activeJob?.amcPlanName || 'AMC Gold Plan'} · ID: ${activeJob?.amcId || 'NCCAMC289412'}
              </div>
            </div>
            <div class="badge">VISIT ${activeJob?.amcVisitNumber || 2} OF ${activeJob?.amcVisitsTotal || 4}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; margin-bottom: 20px;">
            <div><span style="color:#888; text-transform:uppercase; font-size:10px; font-weight:bold;">Customer</span><br/><strong>${activeJob?.customerName}</strong></div>
            <div><span style="color:#888; text-transform:uppercase; font-size:10px; font-weight:bold;">Date</span><br/><strong>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
            <div><span style="color:#888; text-transform:uppercase; font-size:10px; font-weight:bold;">Appliance</span><br/><strong>${activeJob?.brand} ${activeJob?.model}</strong></div>
            <div><span style="color:#888; text-transform:uppercase; font-size:10px; font-weight:bold;">Next Visit</span><br/><strong>September 2026</strong></div>
          </div>
          <div class="section-title">Tasks Completed</div>
          <div class="task-row"><span class="check">✓</span> Carbon Filter Checked & OK</div>
          <div class="task-row"><span class="check">✓</span> TDS Level: 180 ppm (Normal Range)</div>
          <div class="task-row"><span class="followup">↻</span> Water Flow Verified — Follow-up Clear</div>
          <div class="section-title" style="margin-top: 24px;">Additional Charges (Beyond AMC Scope)</div>
          ${[...billedServices, ...billedParts].map((i) => `<div class="total-row"><span>${i.name}</span><span>₹${i.price}</span></div>`).join('')}
          <div class="total-row"><span>GST (${gstPercent}%)</span><span>₹${gst}</span></div>
          <div class="grand-total"><span>Customer Payable</span><span>₹${extrasGrandTotal}</span></div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
  };

  // ── Warranty (Brand / EW): Split Invoice PDF ──────────────────────────────
  const generateWarrantyInvoice = () => {
    const isEW = isExtendedWarranty;
    openPDF(`
      <html>
        <head>
          <title>${isEW ? 'NCC Extended Warranty' : 'Brand Warranty'} Invoice</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; max-width: 600px; margin: auto; }
            .header { border-bottom: 2px solid ${isEW ? '#7C4DFF' : '#1E6BDB'}; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
            .brand { font-size: 20px; color: #052355; font-weight: bold; }
            .badge { font-size: 10px; background: ${isEW ? '#EDE7F6' : '#E3F2FD'}; color: ${isEW ? '#7C4DFF' : '#1E6BDB'}; padding: 4px 10px; border-radius: 4px; font-weight: bold; letter-spacing: 1px; }
            .section-title { font-size: 11px; text-transform: uppercase; color: #888; font-weight: bold; letter-spacing: 1px; margin: 18px 0 8px 0; }
            .line-row { display: flex; justify-content: space-between; font-size: 13px; padding: 7px 0; border-bottom: 1px solid #eee; }
            .covered { font-size: 11px; background: #E8F5E9; color: #2E7D32; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
            .grand-total { font-size: 16px; font-weight: bold; color: #052355; border-top: 2px solid ${isEW ? '#7C4DFF' : '#1E6BDB'}; padding-top: 12px; margin-top: 8px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">NCC Partner Service Invoice</div>
              <div style="font-size: 11px; color: #666; margin-top: 3px;">Invoice: #INV-${activeJob?.id}</div>
            </div>
            <div class="badge">${isEW ? 'EW CLAIM' : 'BRAND WARRANTY'}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; margin-bottom: 20px;">
            <div><span style="color:#888; text-transform:uppercase; font-size:10px; font-weight:bold;">Customer</span><br/><strong>${activeJob?.customerName}</strong></div>
            <div><span style="color:#888; text-transform:uppercase; font-size:10px; font-weight:bold;">Date</span><br/><strong>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
            <div><span style="color:#888; text-transform:uppercase; font-size:10px; font-weight:bold;">Product</span><br/><strong>${activeJob?.brand} ${activeJob?.product}</strong></div>
            <div><span style="color:#888; text-transform:uppercase; font-size:10px; font-weight:bold;">Coverage</span><br/><strong>${isEW ? activeJob?.ewPlanName || 'NCC Protect Plus' : 'Brand Warranty'}</strong></div>
          </div>
          <div class="section-title">Warranty Coverage (Covered at ₹0)</div>
          <div class="line-row">
            <span>${activeJob?.complaint || 'Primary Repair'}</span>
            <span class="covered">₹0 — COVERED</span>
          </div>
          <div class="section-title">Additional Chargeable Services</div>
          ${[...billedServices, ...billedParts].map((i) => `<div class="line-row"><span>${i.name}</span><span>₹${i.price}</span></div>`).join('')}
          <div class="line-row"><span>GST (${gstPercent}%)</span><span>₹${gst}</span></div>
          <div class="grand-total"><span>Customer Payable</span><span>₹${extrasGrandTotal}</span></div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] flex flex-col justify-between pb-6 relative font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-slate-700 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">
          {isAMC ? 'Service Report' : 'Billing & Estimate'}
        </h1>
      </div>

      {/* Main Billing Card Area */}
      <div className="flex-1 p-3.5 flex flex-col gap-5 justify-start">

        {/* ── AMC: Service Report Card ───────────────────── */}
        {isAMC && (
          <>
            {/* Service Report Card */}
            <div className="bg-amber-50 rounded-[2rem] border border-amber-200 shadow-sm p-4 text-left flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">AMC Visit Service Report</span>
                  <h3 className="text-sm font-semibold text-[#052355] mt-0.5">
                    Visit {activeJob?.amcVisitNumber || 2} of {activeJob?.amcVisitsTotal || 4}
                  </h3>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-xl border border-amber-200">
                  {activeJob?.amcVisitsRemaining ?? 3} visits left
                </span>
              </div>

              <div className="flex flex-col gap-2 text-xs border-t border-amber-200 pt-3">
                <div className="flex items-center gap-2 text-green-700">
                  <span className="font-bold text-green-500">✓</span> Carbon Filter Checked & OK
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <span className="font-bold text-green-500">✓</span> TDS Level: 180 ppm (Normal)
                </div>
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="font-bold text-amber-500">↻</span> Water Flow Verified — Follow-up Clear
                </div>
              </div>

              <div className="bg-white rounded-xl border border-amber-100 px-3 py-2 flex justify-between items-center text-xs mt-1">
                <span className="text-slate-500 font-normal">Next Scheduled Visit</span>
                <span className="font-semibold text-[#052355]">September 2026 (Visit 3)</span>
              </div>
            </div>

            {/* Extras Charges Card (if any) */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 text-left flex flex-col gap-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Charges</h4>
              <div className="flex flex-col gap-3.5 text-xs font-normal text-slate-600">
                <div className="flex justify-between items-center">
                  <span>AMC Base Visit</span>
                  <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-md">₹0 (Covered)</span>
                </div>
                {[...billedServices, ...billedParts].length === 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">No chargeable extras</span>
                    <span className="text-[#052355] font-medium">₹0</span>
                  </div>
                )}
                {[...billedServices, ...billedParts].map((item, i) => (
                  <div key={`${item.name}-${i}`} className="flex justify-between items-center">
                    <span>{item.name}</span>
                    <span className="text-[#052355] font-medium">{money(item.price)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span>GST ({gstPercent}%)</span>
                  <span className="text-[#052355] font-medium">{money(gst)}</span>
                </div>
              </div>
              <div className="border-t border-dashed border-slate-200 my-1" />
              <div className="flex justify-between items-center py-1">
                <span className="text-xs font-normal text-[#0D47A1]">Customer Payable (Extras Only)</span>
                <span className="text-xl font-medium text-[#00C853]">₹{extrasGrandTotal}</span>
              </div>
            </div>

            {/* Technician Earnings */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-3.5 py-3.5 text-left flex justify-between items-center">
              <span className="text-xs font-normal text-slate-800">Technician Earnings (Extras)</span>
              <span className="text-base font-medium text-[#052355]">₹{Math.round(extrasTotal * 0.3)}</span>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4 mt-1">
              <button
                onClick={generateAMCReport}
                className="bg-[#E8F0FE]/70 hover:bg-[#E8F0FE] text-[#0D47A1] font-normal py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm border border-transparent"
              >
                <FileText className="h-4 w-4 text-[#0D47A1]" />
                Generate Report PDF
              </button>
              <button
                onClick={() => alert('Sharing over WhatsApp is not available yet — use the print/PDF option.')}
                className="bg-[#E6F4EA]/70 hover:bg-[#E6F4EA] text-green-700 font-normal py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm border border-transparent"
              >
                <WhatsAppIcon />
                Send on WhatsApp
              </button>
            </div>
          </>
        )}

        {/* ── BRAND WARRANTY / EXTENDED WARRANTY: Split Invoice ─── */}
        {(isBrandWarranty || isExtendedWarranty) && (
          <>
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 text-left flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                {isExtendedWarranty
                  ? <ShieldCheck className="h-4 w-4 text-[#7C4DFF]" />
                  : <Shield className="h-4 w-4 text-[#1E6BDB]" />}
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isExtendedWarranty ? 'text-[#7C4DFF]' : 'text-[#1E6BDB]'}`}>
                    {isExtendedWarranty ? 'NCC Extended Warranty' : 'Brand Warranty'}
                  </span>
                  <p className="text-[11px] text-slate-600 font-normal mt-0.5">Invoice for {activeJob?.customerName}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3.5 text-xs font-normal text-slate-600">
                {/* Warranty line — ₹0 */}
                <div className="flex justify-between items-center">
                  <span>{activeJob?.complaint || 'Primary Repair (Warranty)'}</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${isExtendedWarranty ? 'text-purple-700 bg-purple-50' : 'text-blue-700 bg-blue-50'}`}>
                    ₹0 — COVERED
                  </span>
                </div>
                {/* Extras */}
                {[...billedServices, ...billedParts].length === 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">No chargeable extras</span>
                    <span className="text-[#052355] font-medium">₹0</span>
                  </div>
                )}
                {[...billedServices, ...billedParts].map((item, i) => (
                  <div key={`${item.name}-${i}`} className="flex justify-between items-center">
                    <span>{item.name}</span>
                    <span className="text-[#052355] font-medium">{money(item.price)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span>GST ({gstPercent}% on extras)</span>
                  <span className="text-[#052355] font-medium">{money(gst)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-1" />

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-normal text-[#0D47A1]">Customer Payable (Extras Only)</span>
                  <span className="text-xl font-medium text-[#00C853]">₹{extrasGrandTotal}</span>
                </div>
                {isExtendedWarranty && (
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-xs font-normal text-slate-500">NCC Claim Payout (to Technician)</span>
                    <span className="text-base font-medium text-[#7C4DFF]">₹{activeJob?.estEarnings || 0}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Technician Earnings */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-3.5 py-3.5 text-left flex justify-between items-center">
              <span className="text-xs font-normal text-slate-800">Technician Earnings</span>
              <span className="text-base font-medium text-[#052355]">₹{Math.round(extrasTotal * 0.3)}</span>
            </div>

            {/* File Actions */}
            <div className="grid grid-cols-2 gap-4 mt-1">
              <button
                onClick={generateWarrantyInvoice}
                className="bg-[#E8F0FE]/70 hover:bg-[#E8F0FE] text-[#0D47A1] font-normal py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm border border-transparent"
              >
                <FileText className="h-4 w-4 text-[#0D47A1]" />
                Generate PDF
              </button>
              <button
                onClick={() => alert('Sharing over WhatsApp is not available yet — use the print/PDF option.')}
                className="bg-[#E6F4EA]/70 hover:bg-[#E6F4EA] text-green-700 font-normal py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm border border-transparent"
              >
                <WhatsAppIcon />
                Send on WhatsApp
              </button>
            </div>
          </>
        )}

        {/* ── NCC PAID SERVICE: Original Layout ─────────── */}
        {isPaid && (
          <>
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 text-left flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-medium text-[#052355]">D2C Paid Service</h3>
                <p className="text-[11px] text-slate-600 font-normal mt-0.5">Estimate for Customer</p>
              </div>

              <div className="flex flex-col gap-3.5 text-xs font-normal text-slate-600 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-normal">Service Charge</span>
                  <span className="text-[#052355] font-medium">{money(serviceCharge)}</span>
                </div>
                {[...billedParts, ...billedServices].map((item, i) => (
                  <div key={`${item.name}-${i}`} className="flex justify-between items-center">
                    <span className="text-slate-600 font-normal">{item.name}</span>
                    <span className="text-[#052355] font-medium">{money(item.price)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-normal">Tax ({gstPercent}%)</span>
                  <span className="text-[#052355] font-medium">{money(paidTax)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              <div className="flex justify-between items-center py-1">
                <span className="text-xs font-normal text-[#0D47A1]">Customer Payable</span>
                <span className="text-xl font-medium text-[#00C853]">{money(paidTotal)}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-3.5 py-3.5 text-left flex justify-between items-center">
              <span className="text-xs font-normal text-slate-800">Technician Earnings</span>
              <span className="text-base font-medium text-[#052355]">₹{activeJob?.estEarnings || 850}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-1">
              <button
                onClick={() => window.print()}
                className="bg-[#E8F0FE]/70 hover:bg-[#E8F0FE] text-[#0D47A1] font-normal py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm border border-transparent"
              >
                <FileText className="h-4.5 w-4.5 text-[#0D47A1]" />
                Generate PDF
              </button>
              <button
                onClick={() => alert('Sharing over WhatsApp is not available yet — use the print/PDF option.')}
                className="bg-[#E6F4EA]/70 hover:bg-[#E6F4EA] text-green-700 font-normal py-3.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm border border-transparent"
              >
                <WhatsAppIcon />
                Send on WhatsApp
              </button>
            </div>
          </>
        )}

      </div>

      {/* Collect Payment Bottom Button */}
      <div className="px-3.5 pb-6">
        <button
          onClick={handleCollectPayment}
          className={`w-full font-medium py-4 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center ${
            isAMC
              ? 'bg-[#FFA000] hover:bg-amber-500 text-white'
              : isExtendedWarranty
                ? 'bg-[#7C4DFF] hover:bg-purple-600 text-white'
                : isBrandWarranty
                  ? 'bg-[#1E6BDB] hover:bg-blue-700 text-white'
                  : 'bg-[#0D47A1] hover:bg-[#0A3F91] text-white'
          }`}
        >
          {isAMC
            ? 'Close Visit & Mark Complete'
            : isExtendedWarranty
              ? 'Close Claim & Mark Complete'
              : isBrandWarranty
                ? 'Close Warranty Job'
                : 'Collect Payment'}
        </button>
      </div>

    </div>
  );
};

export default BillingEstimate;
