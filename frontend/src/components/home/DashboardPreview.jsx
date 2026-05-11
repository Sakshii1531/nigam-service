import React from 'react';
import { BarChart3, Users, ClipboardCheck, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardPreview = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block text-xs font-semibold text-yellow-600 uppercase tracking-wider bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">Management</span>
          <h2 className="mt-3 text-3xl font-bold text-[#0d47a1] sm:text-4xl">Powerful Dashboards</h2>
          <p className="mt-1 text-lg text-text-secondary">
            Dedicated panels for brands, technicians, and admins to manage operations seamlessly.
          </p>
        </div>

        <div className="mt-12 bg-bg-light p-6 md:p-8 rounded-3xl border border-border-color shadow-sm overflow-hidden">
          {/* Mock Dashboard Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-color pb-6">
            <div>
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Brand Partner Portal</p>
              <h3 className="text-xl font-bold text-text-primary mt-1">Analytics Overview</h3>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white text-text-primary text-sm rounded-full font-medium border border-border-color shadow-sm cursor-pointer hover:bg-slate-50">Monthly</span>
              <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full font-medium shadow-sm cursor-pointer">Live</span>
            </div>
          </div>

          {/* Mock Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {/* Card 1 */}
            <div className="bg-white p-6 rounded-2xl border border-border-color hover:shadow-lg hover:border-blue-100 transition-all duration-300 cursor-pointer group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-text-secondary font-medium">Active Requests</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">1,284</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <ClipboardCheck className="h-5 w-5 text-brand-blue group-hover:text-white transition-colors duration-300" />
                </div>
              </div>
              <div className="mt-4 text-xs text-emerald-600 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>+12% from last month</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-6 rounded-2xl border border-border-color hover:shadow-lg hover:border-blue-100 transition-all duration-300 cursor-pointer group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-text-secondary font-medium">Active Techs</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">56</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <Users className="h-5 w-5 text-brand-blue group-hover:text-white transition-colors duration-300" />
                </div>
              </div>
              <div className="mt-4 text-xs text-text-secondary font-medium flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>Currently online</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-6 rounded-2xl border border-border-color hover:shadow-lg hover:border-blue-100 transition-all duration-300 cursor-pointer group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-text-secondary font-medium">Completion Rate</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">94.2%</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <BarChart3 className="h-5 w-5 text-brand-blue group-hover:text-white transition-colors duration-300" />
                </div>
              </div>
              <div className="mt-4 text-xs text-emerald-600 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Above target (90%)</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-6 rounded-2xl border border-border-color hover:shadow-lg hover:border-blue-100 transition-all duration-300 cursor-pointer group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-text-secondary font-medium">Revenue</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">₹4.2L</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <TrendingUp className="h-5 w-5 text-brand-blue group-hover:text-white transition-colors duration-300" />
                </div>
              </div>
              <div className="mt-4 text-xs text-emerald-600 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>+8% growth</span>
              </div>
            </div>
          </div>

          {/* Mock Chart Area */}
          <div className="mt-8 bg-white p-6 rounded-2xl border border-border-color">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h4 className="text-base font-semibold text-text-primary">Performance Trend</h4>
                <p className="text-xs text-text-secondary mt-0.5">Showing data for the last 7 days</p>
              </div>
              <div className="flex gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-text-primary">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span>
                  This Week
                </span>
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <span className="w-2.5 h-2.5 bg-slate-200 rounded-full"></span>
                  Last Week
                </span>
              </div>
            </div>
            
            <div className="relative h-[220px] w-full">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-400">
                <div className="border-t border-dashed w-full pt-1">10,000</div>
                <div className="border-t border-dashed w-full pt-1">5,000</div>
                <div className="border-t border-dashed w-full pt-1">2,500</div>
                <div className="border-t border-dashed w-full pt-1">0</div>
              </div>
              
              {/* SVG Chart */}
              <svg className="absolute inset-0 w-full h-full pt-6" viewBox="0 0 800 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* Area under curve */}
                <path d="M 0 150 C 200 50, 200 180, 400 100 C 600 20, 600 150, 800 50 L 800 200 L 0 200 Z" fill="url(#chart-gradient)" />
                
                {/* Line */}
                <motion.path 
                  d="M 0 150 C 200 50, 200 180, 400 100 C 600 20, 600 150, 800 50" 
                  fill="none" 
                  stroke="#2563eb" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
                
                {/* Dots on line */}
                <circle cx="200" cy="115" r="5" fill="#2563eb" stroke="white" strokeWidth="2" />
                <circle cx="400" cy="100" r="5" fill="#2563eb" stroke="white" strokeWidth="2" />
                <circle cx="600" cy="85" r="5" fill="#2563eb" stroke="white" strokeWidth="2" />
              </svg>
              
              {/* X-Axis Labels */}
              <div className="absolute bottom-[-24px] left-0 right-0 flex justify-between text-xs font-medium text-text-secondary px-2">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;
