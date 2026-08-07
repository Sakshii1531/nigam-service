import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';

const CmsDocViewer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine slug based on URL path
  const slug = location.pathname.includes('privacy')
    ? 'privacy-policy'
    : 'terms-and-conditions';

  const title = slug === 'privacy-policy' ? 'Privacy Policy' : 'Terms & Conditions';

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');

  const fetchDoc = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/cms/pages/${slug}`);
      const pageData = res?.data || res || {};
      setContent(pageData.body || '');
    } catch (err) {
      console.warn(`Error loading ${slug}:`, err);
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoc();
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-12 text-left">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100">
        <button
          onClick={() => navigate('/about-ncc', { replace: true })}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900">{title}</h1>
      </div>

      <div className="flex flex-col gap-5 px-4 sm:px-6 pt-6 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-[#0D47A1]" />
            <span className="text-xs font-semibold">Loading document...</span>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs whitespace-pre-line text-xs font-medium text-slate-700 leading-relaxed">
            {content ? (
              content
            ) : (
              <div className="text-center text-slate-400 py-8">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <span>No content published for this page yet.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CmsDocViewer;
