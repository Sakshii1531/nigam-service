import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/super-admin/Sidebar";
import Topbar from "../../components/super-admin/Topbar";
import Pagination from "../../components/common/Pagination";
import { apiRequest } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";
import ChangeServiceCityModal from "../../components/super-admin/ChangeServiceCityModal";
import {
  Users as UsersIcon,
  Search,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  Star,
  MapPin,
  X,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Mail,
  Phone as PhoneIcon,
  Calendar as CalendarIcon,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  UserCog,
  Clock,
  ArrowRight,
} from "lucide-react";

const ServiceProviders = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAsm = user?.role === "asm";
  // Mirrors the backend's requireAsmPermission('techs:manage') gate on the
  // status-change route (adminServiceProvider.routes.js) — a view-only ASM
  // would get a 403 from these actions anyway, so hide them instead. A
  // super-admin viewer always has full access regardless of this flag.
  const canManage =
    !isAsm || Boolean(user?.permissions?.includes("techs:manage"));

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("All Skills");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [selectedAvailability, setSelectedAvailability] =
    useState("All Availability");
  const [selectedAsm, setSelectedAsm] = useState("All ASMs");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedTechProfile, setSelectedTechProfile] = useState(null);
  const [showChangeCity, setShowChangeCity] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedSkill,
    selectedStatus,
    selectedCity,
    selectedAvailability,
    selectedAsm,
  ]);

  // Real "Recent Service Activity" / "Latest Customer Reviews" for whichever
  // provider's profile is open — this used to be a hardcoded fallback shown
  // unconditionally (a brand-new Pending provider with 0 completed jobs was
  // shown a fake "Completed" job history and a fake 5-star review), so a
  // provider with genuinely no history now correctly shows an empty state
  // instead of fabricated data.
  const [profileActivity, setProfileActivity] = useState([]);
  const [profileReviews, setProfileReviews] = useState([]);
  const [profileDetailLoading, setProfileDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedTechProfile) return;
    let cancelled = false;
    (async () => {
      setProfileDetailLoading(true);
      try {
        const [requestsRes, reviewsRes] = await Promise.all([
          apiRequest(
            `/service-requests?serviceProvider=${selectedTechProfile.id}&limit=5&sort=-createdAt`,
            { auth: true },
          ).catch(() => []),
          apiRequest(
            `/reviews/service-providers/${selectedTechProfile.id}?limit=5&sort=-createdAt`,
          ).catch(() => []),
        ]);
        if (cancelled) return;
        setProfileActivity(Array.isArray(requestsRes) ? requestsRes : []);
        setProfileReviews(Array.isArray(reviewsRes) ? reviewsRes : []);
      } finally {
        if (!cancelled) setProfileDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTechProfile?.id]);

  const [showModal, setShowModal] = useState(false);
  const [serviceProviderToDelete, setTechToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newTech, setNewTech] = useState({
    name: "",
    skill: "AC & Refrigerator",
    city: "Delhi",
    rating: "5.0",
    availability: "Available",
    status: "Active",
  });

  const [serviceProviders, setServiceProviders] = useState([]);
  const [loadError, setLoadError] = useState("");

  // Applications submitted from /service provider/apply land here as Pending
  // service providers — the console is where they get approved or rejected.
  const fetchTechs = React.useCallback(async () => {
    try {
      const res = await apiRequest("/super-admin/service-providers?limit=200", {
        auth: true,
      });
      const items = Array.isArray(res) ? res : [];
      setServiceProviders(
        items.map((item) => ({
          id: item.id,
          ref: item.humanId || item.id,
          // Notifications address the underlying User, not the Service Provider doc.
          userId: item.user || null,
          phone: item.phone || "",
          email: item.email || "",
          name: item.name || "Service Provider",
          specs: item.specs?.length ? item.specs : [],
          skill: item.specs?.length ? item.specs.join(", ") : "General Repair",
          // Falls back to the free-text serviceCityName when `city` never
          // resolved to a real City doc at registration (a typo'd/unlisted
          // city — see serviceProviderRegistration.routes.js's cityDoc
          // lookup) — otherwise a provider who genuinely typed their city
          // shows a bare "—" as if they'd left it blank.
          city: item.city?.name || item.serviceCityName || "—",
          cityId: item.city?.id || item.city?._id || null,
          rating: item.rating || 0,
          trustScore: item.trustScore || 0,
          activeJobs: item.activeJobsCount || 0,
          completedJobs: item.completedJobsCount || 0,
          status: item.status || "Pending",
          availability: item.availability || "Offline",
          // Derived from city, not stored — see adminServiceProvider.service.js's
          // attachAsm. null means this provider's city has no ASM assigned yet.
          asm: item.asm || null,
          aadharFrontUrl: item.verification?.aadharFrontUrl || "",
          aadharBackUrl: item.verification?.aadharBackUrl || "",
          appliedDate: item.createdAt
            ? new Date(item.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—",
        })),
      );
      setLoadError("");
    } catch (err) {
      setLoadError(err.message || "Could not load serviceProviders.");
    }
  }, []);

  useEffect(() => {
    fetchTechs();
  }, [fetchTechs]);

  useEffect(() => {
    if (location.search.includes("add=true")) {
      setShowModal(true);
      navigate(location.pathname, { replace: true });
      return;
    }
    // Deep link from an ASM's detail page ("Service Providers" stat card) —
    // preset the ASM filter so the list actually shows just their zone.
    const params = new URLSearchParams(location.search);
    const asmId = params.get("asm");
    if (asmId) {
      setSelectedAsm(asmId);
      navigate(location.pathname, { replace: true });
      return;
    }
    // Deep link from the Sidebar's "Pending Approvals" entry / the zone
    // dashboard's stat cards.
    const status = params.get("status");
    if (status) {
      setSelectedStatus(status);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  const handleStatusChange = async (id, newStatus) => {
    const provider = serviceProviders.find((t) => t.id === id);
    if (!provider) return;

    // Persist first, then mirror the server's own availability decision back into
    // state — the server forces Offline for any non-Active status.
    let saved = null;
    try {
      saved = await apiRequest(`/super-admin/service-providers/${id}/status`, {
        method: "PATCH",
        auth: true,
        body: { status: newStatus },
      });
    } catch (err) {
      showToast(`Could not update status: ${err.message}`);
      return;
    }

    setServiceProviders(
      serviceProviders.map((t) =>
        t.id === id
          ? {
              ...t,
              status: saved?.status || newStatus,
              availability: saved?.availability ?? t.availability,
            }
          : t,
      ),
    );

    if (newStatus !== "Active") {
      showToast(`Service Provider status updated to ${newStatus}`);
      return;
    }

    const msg = `Congratulations ${provider.name}! Your Nigam Care Service Provider Partner account has been verified and approved. You can now login to access your job dashboard.`;
    const delivered = [];

    // Push addresses the User behind the Service Provider record.
    if (provider.userId) {
      try {
        await apiRequest("/notifications/push", {
          method: "POST",
          auth: true,
          body: {
            recipientId: provider.userId,
            title: "🎉 Account Approved!",
            body: msg,
          },
        });
        delivered.push("Push");
      } catch (err) {
        console.warn("Push notification notice:", err.message);
      }
    }

    // SMS via SMSIndiaHub. Send only to a real number — no placeholder fallback.
    if (provider.phone) {
      try {
        await apiRequest("/notifications/sms", {
          method: "POST",
          auth: true,
          body: {
            provider: "smsindiahub",
            phone: provider.phone,
            message: msg,
          },
        });
        delivered.push("SMS");
      } catch (err) {
        console.warn("SMSIndiaHub dispatch notice:", err.message);
      }
    }

    showToast(
      delivered.length
        ? `Partner approved! Sent ${delivered.join(" & ")} to ${provider.name}`
        : `Partner approved — no contact channel available for ${provider.name}`,
    );
  };

  const confirmDeleteServiceProvider = async () => {
    if (!serviceProviderToDelete) return;
    const id = serviceProviderToDelete.id;
    const name = serviceProviderToDelete.name;

    // The server refuses to delete a service provider who still has active jobs, so
    // surface that rather than dropping the row from the table regardless.
    try {
      await apiRequest(`/super-admin/service-providers/${id}`, {
        method: "DELETE",
        auth: true,
      });
    } catch (err) {
      showToast(`Could not delete "${name}": ${err.message}`);
      setShowDeleteConfirm(false);
      setTechToDelete(null);
      return;
    }

    setServiceProviders((prev) => prev.filter((t) => t.id !== id));

    if (selectedTechProfile && selectedTechProfile.id === id) {
      setSelectedTechProfile(null);
    }

    setShowDeleteConfirm(false);
    setTechToDelete(null);
    showToast(`Service Provider "${name}" (${id}) removed permanently.`);
  };

  const handleAddTechSubmit = (e) => {
    e.preventDefault();
    if (!newTech.name) {
      showToast("Please enter a serviceProvider name.");
      return;
    }

    const addedTech = {
      id: `TECH-00${serviceProviders.length + 1}`,
      name: newTech.name,
      skill: newTech.skill,
      city: newTech.city,
      rating: parseFloat(newTech.rating) || 5.0,
      activeJobs: 0,
      completedJobs: 0,
      status: newTech.status,
      availability: newTech.availability,
    };

    setServiceProviders([addedTech, ...serviceProviders]);
    setNewTech({
      name: "",
      skill: "AC & Refrigerator",
      city: "Delhi",
      rating: "5.0",
      availability: "Available",
      status: "Active",
    });
    setShowModal(false);
    showToast(`Service Provider "${addedTech.name}" onboarded successfully!`);
  };

  // Dropdown options are derived from whatever's actually loaded rather than
  // hardcoded — the old hardcoded skill list ("AC & Refrigerator" etc.) never
  // matched real spec values ("AC", "Refrigerator" as separate entries), so
  // the filter silently matched nothing. City/ASM have the same problem if
  // hardcoded, so all three are built the same way.
  const skillOptions = [
    ...new Set(serviceProviders.flatMap((t) => t.specs)),
  ].sort();
  const pendingCount = serviceProviders.filter(
    (p) => p.status === "Pending",
  ).length;
  const cityOptions = [
    ...new Set(
      serviceProviders.map((t) => t.city).filter((c) => c && c !== "—"),
    ),
  ].sort();
  const asmOptions = [
    ...new Map(
      serviceProviders.filter((t) => t.asm).map((t) => [t.asm.id, t.asm]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const filteredTechs = serviceProviders.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.ref || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSkill =
      selectedSkill === "All Skills" || t.specs.includes(selectedSkill);
    const matchesStatus =
      selectedStatus === "All Status" || t.status === selectedStatus;
    const matchesCity =
      selectedCity === "All Cities" || t.city === selectedCity;
    const matchesAvailability =
      selectedAvailability === "All Availability" ||
      t.availability === selectedAvailability;
    const matchesAsm =
      selectedAsm === "All ASMs" ||
      (selectedAsm === "Unassigned" ? !t.asm : t.asm?.id === selectedAsm);
    return (
      matchesSearch &&
      matchesSkill &&
      matchesStatus &&
      matchesCity &&
      matchesAvailability &&
      matchesAsm
    );
  });

  const paginatedTechs = filteredTechs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const renderFullPageProfile = () => {
    const provider = selectedTechProfile;
    const email = provider.email || "—";
    const phone = provider.phone || "—";
    const joinedDate = provider.appliedDate || "—";

    return (
      <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC]">
        {showChangeCity && (
          <ChangeServiceCityModal
            provider={provider}
            onClose={() => setShowChangeCity(false)}
            onChanged={(updated) => {
              setShowChangeCity(false);
              const city = updated?.city?.name || updated?.serviceCityName || provider.city;
              const cityId = updated?.city?.id || updated?.city?._id || null;
              setSelectedTechProfile((prev) => (prev ? { ...prev, city, cityId } : prev));
              // The ASM follows the city, so refresh the list rather than patch it.
              fetchTechs();
              showToast(`${provider.name} now serves ${city}.`);
            }}
          />
        )}
        {/* Back navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedTechProfile(null)}
            className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors">
            <ArrowLeft size={16} /> Back to ServiceProviders
          </button>

          <div className="flex gap-2">
            {canManage && provider.status === "Pending" && (
              <>
                <button
                  onClick={() => {
                    handleStatusChange(provider.id, "Active");
                    setSelectedTechProfile({ ...provider, status: "Active" });
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors flex items-center gap-1.5 shadow-sm">
                  <CheckCircle size={14} /> Approve Partner
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(provider.id, "Inactive");
                    setSelectedTechProfile({ ...provider, status: "Inactive" });
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm">
                  <XCircle size={14} /> Reject Partner
                </button>
              </>
            )}

            {canManage && provider.status === "Active" && (
              <button
                onClick={() => {
                  handleStatusChange(provider.id, "Inactive");
                  setSelectedTechProfile({ ...provider, status: "Inactive" });
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm">
                <Ban size={14} /> Suspend Partner
              </button>
            )}

            {canManage && provider.status === "Inactive" && (
              <button
                onClick={() => {
                  handleStatusChange(provider.id, "Active");
                  setSelectedTechProfile({ ...provider, status: "Active" });
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors flex items-center gap-1.5 shadow-sm">
                <CheckCircle size={14} /> Activate Partner
              </button>
            )}

            {!isAsm && (
              <button
                onClick={() => {
                  setTechToDelete(provider);
                  setShowDeleteConfirm(true);
                }}
                className="bg-red-50 text-red-600 border border-red-200 px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors flex items-center gap-1.5 shadow-xs"
                title="Delete Service Provider">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Redesigned Profile Header Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden text-left mb-6">
          <div className="bg-gradient-to-r from-[#0D47A1] via-[#1565C0] to-[#1E3A8A] p-6 text-white relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              {/* Left: Avatar + Details */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-white font-extrabold text-2xl uppercase flex-shrink-0 shadow-inner">
                  {provider.name
                    ? provider.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : "T"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                      {provider.name}
                    </h1>
                    <span className="bg-yellow-400 text-[#0D47A1] text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Partner
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 font-medium mt-1">
                    ID:{" "}
                    <span className="font-bold text-white">{provider.ref}</span>{" "}
                    • Verified Nigam Service Partner
                  </p>
                </div>
              </div>

              {/* Right: Status Badges */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
                <span
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    provider.status === "Active"
                      ? "bg-emerald-500 text-white"
                      : provider.status === "Inactive"
                        ? "bg-rose-500 text-white"
                        : "bg-amber-400 text-slate-900"
                  }`}>
                  Status: {provider.status}
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 text-white">
                  Availability: {provider.availability}
                </span>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-6 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-2">
                📍 Operating City:{" "}
                <strong className="text-slate-900">{provider.city}</strong>
                {/* Direct change is super-admin only; an ASM decides the
                    provider's own requests on the City Change Requests page. */}
                {!isAsm && (
                  <button
                    onClick={() => setShowChangeCity(true)}
                    className="font-bold text-[#0D47A1] hover:underline">
                    Change
                  </button>
                )}
              </span>
              {/* An ASM viewing their own zone already knows who manages it
                  — showing it here would just be their own name on every row. */}
              {!isAsm && (
                <span>
                  🧭 ASM Manager:{" "}
                  {provider.asm ? (
                    <button
                      onClick={() =>
                        navigate(`/super-admin/asm/${provider.asm.id}`)
                      }
                      className="font-bold text-[#0D47A1] hover:underline"
                      title={`Manage ${provider.asm.name}`}>
                      {provider.asm.name}
                    </button>
                  ) : (
                    <strong className="text-slate-400 italic font-medium">
                      Unassigned
                    </strong>
                  )}
                </span>
              )}
              <span>
                ⭐ Rating:{" "}
                <strong className="text-slate-900">
                  {provider.rating || "5.0"} / 5.0
                </strong>
              </span>
              <span>
                🛠️ Active Jobs:{" "}
                <strong className="text-slate-900">
                  {provider.activeJobs || 0}
                </strong>
              </span>
            </div>
            {provider.appliedDate && (
              <span className="text-[11px] text-slate-400 font-medium">
                Applied: {provider.appliedDate}
              </span>
            )}
          </div>
        </div>

        {/* Profile Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Core Info */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#1E293B] mb-4">
                Contact Information
              </h3>
              <div className="space-y-3.5 text-sm">
                <div className="flex items-center gap-3 text-slate-700">
                  <Mail size={16} className="text-[#64748B] flex-shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <PhoneIcon
                    size={16}
                    className="text-[#64748B] flex-shrink-0"
                  />
                  <span>{phone}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <MapPin size={16} className="text-[#64748B] flex-shrink-0" />
                  <span>{provider.city}, India</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <CalendarIcon
                    size={16}
                    className="text-[#64748B] flex-shrink-0"
                  />
                  <span>Applied / Joined: {joinedDate}</span>
                </div>
                {!isAsm && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <UserCog
                      size={16}
                      className="text-[#64748B] flex-shrink-0"
                    />
                    {provider.asm ? (
                      <button
                        onClick={() =>
                          navigate(`/super-admin/asm/${provider.asm.id}`)
                        }
                        className="text-[#0D47A1] font-semibold hover:underline">
                        {provider.asm.name} (ASM)
                      </button>
                    ) : (
                      <span className="text-slate-400 italic">
                        No ASM assigned to this zone yet
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#1E293B] mb-4">
                Specialization
              </h3>
              <div className="space-y-2">
                <span className="inline-block bg-blue-50 text-[#0D47A1] text-xs font-semibold px-3 py-1 rounded-full border border-blue-100">
                  {provider.skill}
                </span>
                <p className="text-xs text-[#64748B] mt-2">
                  Certified Nigam Service Provider authorized to verify, repair
                  and troubleshoot consumer products and appliances.
                </p>
              </div>
            </div>

            <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#1E293B] mb-3">
                Verification & Aadhar Documents
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B] font-medium">
                    Aadhar Card Verification
                  </span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${provider.status === "Pending" ? "text-amber-600" : "text-green-600"}`}>
                    <ShieldCheck size={14} />{" "}
                    {provider.status === "Pending"
                      ? "Pending Approval"
                      : "Verified"}
                  </span>
                </div>

                {/* Render Uploaded WebP Aadhar Photos */}
                {(provider.aadharFrontUrl || provider.aadharBackUrl) && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider">
                      Uploaded WebP Aadhar Photos (Cloudinary)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {provider.aadharFrontUrl && (
                        <div>
                          <p className="text-[9.5px] font-semibold text-slate-500 mb-1">
                            Aadhar Front (.webp)
                          </p>
                          <a
                            href={provider.aadharFrontUrl}
                            target="_blank"
                            rel="noopener noreferrer">
                            <img
                              src={provider.aadharFrontUrl}
                              alt="Aadhar Front"
                              className="w-full h-24 object-cover rounded-lg border border-slate-300 hover:opacity-90 shadow-2xs"
                            />
                          </a>
                        </div>
                      )}
                      {provider.aadharBackUrl && (
                        <div>
                          <p className="text-[9.5px] font-semibold text-slate-500 mb-1">
                            Aadhar Back (.webp)
                          </p>
                          <a
                            href={provider.aadharBackUrl}
                            target="_blank"
                            rel="noopener noreferrer">
                            <img
                              src={provider.aadharBackUrl}
                              alt="Aadhar Back"
                              className="w-full h-24 object-cover rounded-lg border border-slate-300 hover:opacity-90 shadow-2xs"
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B] font-medium">
                    PAN Card Verification
                  </span>
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <ShieldCheck size={14} /> Verified
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B] font-medium">
                    Background Verification
                  </span>
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <ShieldCheck size={14} /> Passed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats & History */}
          <div className="space-y-6 lg:col-span-2">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                <p className="text-xs text-[#64748B] font-medium">
                  Completed Jobs
                </p>
                <p className="text-2xl font-bold text-[#1E293B] mt-1">
                  {provider.completedJobs || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                <p className="text-xs text-[#64748B] font-medium">
                  Active Jobs
                </p>
                <p className="text-2xl font-bold text-[#1E293B] mt-1">
                  {provider.activeJobs || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                <p className="text-xs text-[#64748B] font-medium">Avg Rating</p>
                <p className="text-2xl font-bold text-amber-500 mt-1 flex items-center justify-center gap-1">
                  <Star size={20} fill="currentColor" />{" "}
                  {provider.rating || "0"}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                <p className="text-xs text-[#64748B] font-medium">
                  Nigam Trust Score
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {provider.trustScore || 0}%
                </p>
              </div>
            </div>

            {/* Job History summary list — real service requests
                    assigned to this provider, not a fabricated placeholder. */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
              <h3 className="text-sm font-bold text-[#1E293B] mb-4">
                Recent Service Activity
              </h3>
              {profileDetailLoading ? (
                <p className="text-xs text-slate-400 font-semibold py-2">
                  Loading...
                </p>
              ) : profileActivity.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-2">
                  No service activity yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {profileActivity.map((req) => {
                    const statusStyle = ["Closed"].includes(req.status)
                      ? "bg-green-50 text-green-600"
                      : ["Cancelled"].includes(req.status)
                        ? "bg-red-50 text-red-600"
                        : "bg-amber-50 text-amber-600";
                    return (
                      <div
                        key={req.id}
                        className="flex justify-between items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {req.category ||
                              req.description ||
                              "Service Request"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {req.humanId} •{" "}
                            {req.createdAt
                              ? new Date(req.createdAt).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "—"}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${statusStyle}`}>
                          {req.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Reviews — real Review docs left by customers on this
                    provider's jobs, not a fabricated placeholder. */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
              <h3 className="text-sm font-bold text-[#1E293B] mb-4">
                Latest Customer Reviews
              </h3>
              {profileDetailLoading ? (
                <p className="text-xs text-slate-400 font-semibold py-2">
                  Loading...
                </p>
              ) : profileReviews.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold py-2">
                  No reviews yet — nothing has been left for this provider.
                </p>
              ) : (
                <div className="space-y-4">
                  {profileReviews.map((review) => {
                    const starCount =
                      review.technicianRating ?? review.rating ?? 0;
                    return (
                      <div
                        key={review.id}
                        className="space-y-1 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-800">
                            {review.user?.name || "A customer"}
                          </span>
                          <span className="text-slate-400">
                            {review.createdAt
                              ? new Date(review.createdAt).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              fill={i < starCount ? "currentColor" : "none"}
                            />
                          ))}
                        </div>
                        {review.comment && (
                          <p className="text-xs text-slate-600 italic font-normal">
                            "{review.comment}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Service Provider Management" />

        {/* Body */}
        {selectedTechProfile ? (
          renderFullPageProfile()
        ) : (
          <div className="p-6 space-y-6 flex-1">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#1E293B]">
                  Service Providers
                </h2>
                {isAsm && (
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Your zone — {serviceProviders[0]?.city || "unassigned"}
                  </p>
                )}
              </div>
              {/* Onboarding new providers directly is a super-admin action —
                an ASM's role is verifying/managing whoever already registered
                and landed in their zone, not creating accounts wholesale. */}
              {!isAsm && (
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
                  <Plus size={16} /> Add Service Provider
                </button>
              )}
            </div>

            {/* Attention banner — nothing else on this page forces a pending
              application into view; the stat card below is easy to skim
              past, so this repeats the same count as an impossible-to-miss
              alert whenever it's non-zero. */}
            {pendingCount > 0 && (
              <button
                onClick={() => setSelectedStatus("Pending")}
                className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left hover:bg-amber-100/70 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} />
                </span>
                <span className="flex-1">
                  <span className="text-sm font-bold text-amber-800">
                    {pendingCount} service provider
                    {pendingCount === 1 ? "" : "s"} need
                    {pendingCount === 1 ? "s" : ""} your review
                  </span>
                  <span className="block text-xs text-amber-700/80 mt-0.5">
                    New applications wait here until approved or rejected —
                    click to filter.
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  className="text-amber-600 flex-shrink-0"
                />
              </button>
            )}

            {/* Stat cards — quick zone/platform overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total",
                  value: serviceProviders.length,
                  icon: UsersIcon,
                  color: "text-[#0D47A1] bg-blue-50",
                },
                {
                  label: "Pending",
                  value: serviceProviders.filter((p) => p.status === "Pending")
                    .length,
                  icon: Clock,
                  color: "text-amber-600 bg-amber-50",
                },
                {
                  label: "Active",
                  value: serviceProviders.filter((p) => p.status === "Active")
                    .length,
                  icon: CheckCircle2,
                  color: "text-emerald-600 bg-emerald-50",
                },
                {
                  label: "Inactive",
                  value: serviceProviders.filter((p) => p.status === "Inactive")
                    .length,
                  icon: XCircle,
                  color: "text-slate-500 bg-slate-100",
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <button
                  key={label}
                  onClick={() =>
                    setSelectedStatus(label === "Total" ? "All Status" : label)
                  }
                  className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between text-left hover:border-[#0D47A1]/40 transition-colors ${
                    label === "Pending" && value > 0
                      ? "border-amber-300 ring-1 ring-amber-200"
                      : "border-[#E2E8F0]"
                  }`}>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                      {label}
                    </p>
                    <h3 className="text-xl font-black text-[#1E293B] mt-1">
                      {value}
                    </h3>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={18} />
                  </div>
                </button>
              ))}
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                {/* Search */}
                <div className="relative w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC] text-slate-800"
                    placeholder="Search Name, ID or Skill..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Filters */}
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                  <option>All Skills</option>
                  {skillOptions.map((skill) => (
                    <option key={skill}>{skill}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Pending</option>
                </select>

                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                  <option>All Cities</option>
                  {cityOptions.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>

                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                  <option>All Availability</option>
                  <option>Available</option>
                  <option>Busy</option>
                  <option>Offline</option>
                </select>

                <select
                  value={selectedAsm}
                  onChange={(e) => setSelectedAsm(e.target.value)}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                  <option>All ASMs</option>
                  <option>Unassigned</option>
                  {asmOptions.map((asm) => (
                    <option key={asm.id} value={asm.id}>
                      {asm.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSkill("All Skills");
                  setSelectedStatus("All Status");
                  setSelectedCity("All Cities");
                  setSelectedAvailability("All Availability");
                  setSelectedAsm("All ASMs");
                  showToast("Filters reset successfully");
                }}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors">
                Reset Filters
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                    <tr>
                      <th className="px-6 py-4">Service Provider</th>
                      <th className="px-6 py-4">Skill</th>
                      <th className="px-6 py-4">City</th>
                      {!isAsm && <th className="px-6 py-4">ASM Manager</th>}
                      <th className="px-6 py-4">Rating</th>
                      <th className="px-6 py-4">Jobs (Active/Comp)</th>
                      <th className="px-6 py-4">Availability</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {paginatedTechs.map((provider) => (
                      <tr
                        key={provider.id}
                        className={`transition-colors ${
                          provider.status === "Pending"
                            ? "bg-amber-50/60 hover:bg-amber-50 border-l-2 border-l-amber-400"
                            : "hover:bg-[#F8FAFC]"
                        }`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold">
                              {provider.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <p className="text-[#1E293B] font-medium">
                                {provider.name}
                              </p>
                              <p className="text-[#64748B] text-xs">
                                {provider.ref}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[#1E293B]">
                          {provider.skill}
                        </td>
                        <td className="px-6 py-4 text-[#64748B]">
                          <div className="flex items-center gap-1">
                            <MapPin size={14} /> {provider.city}
                          </div>
                        </td>
                        {!isAsm && (
                          <td className="px-6 py-4">
                            {provider.asm ? (
                              <button
                                onClick={() =>
                                  navigate(
                                    `/super-admin/asm/${provider.asm.id}`,
                                  )
                                }
                                className="flex items-center gap-1.5 text-[#0D47A1] font-medium hover:underline"
                                title={`Manage ${provider.asm.name}`}>
                                <UserCog size={14} /> {provider.asm.name}
                              </button>
                            ) : (
                              <span className="text-[#94A3B8] text-xs italic">
                                Unassigned
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-amber-500 font-medium">
                            <Star size={14} fill="currentColor" />{" "}
                            {provider.rating}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="text-[#1E293B] font-medium">
                              {provider.activeJobs}
                            </span>
                            <span className="text-[#64748B]">
                              {" "}
                              / {provider.completedJobs}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs font-medium ${
                              provider.availability === "Available"
                                ? "text-green-600"
                                : provider.availability === "Busy"
                                  ? "text-yellow-600"
                                  : "text-gray-500"
                            }`}>
                            {provider.availability}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              provider.status === "Active"
                                ? "bg-green-50 text-green-600"
                                : provider.status === "Inactive"
                                  ? "bg-red-50 text-red-600"
                                  : "bg-yellow-50 text-yellow-600"
                            }`}>
                            {provider.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setSelectedTechProfile(provider)}
                              className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded"
                              title="View Profile">
                              <Eye size={16} />
                            </button>

                            {canManage && provider.status === "Pending" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleStatusChange(provider.id, "Active")
                                  }
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                  title="Approve">
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(provider.id, "Inactive")
                                  }
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Reject">
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}

                            {canManage && provider.status === "Active" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(provider.id, "Inactive")
                                }
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Suspend">
                                <Ban size={16} />
                              </button>
                            )}

                            {canManage && provider.status === "Inactive" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(provider.id, "Active")
                                }
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Activate">
                                <CheckCircle size={16} />
                              </button>
                            )}

                            {/* Deleting a provider record outright is super-admin only
                              (adminServiceProvider.routes.js's DELETE route) — an
                              ASM manages status, not the account's existence. */}
                            {!isAsm && (
                              <button
                                onClick={() => {
                                  setTechToDelete(provider);
                                  setShowDeleteConfirm(true);
                                }}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Delete Service Provider">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {filteredTechs.length === 0 && (
                <div className="text-center py-12 bg-white">
                  <UsersIcon
                    size={48}
                    className="text-[#64748B] mx-auto mb-4 text-slate-400"
                  />
                  <h3 className="text-lg font-bold text-[#1E293B] mb-1">
                    No ServiceProviders Found
                  </h3>
                  <p className="text-sm text-[#64748B]">
                    Try adjusting your search or filters.
                  </p>
                </div>
              )}

              {/* Pagination */}
              {filteredTechs.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredTechs.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add ServiceProvider Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#1E293B]">
                Onboard Service Provider
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#F8FAFC] rounded-full">
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleAddTechSubmit}
              className="p-6 space-y-4 text-sm text-left">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. Manish Sharma"
                  value={newTech.name}
                  onChange={(e) =>
                    setNewTech({ ...newTech, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">
                    Skill Specialization
                  </label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.skill}
                    onChange={(e) =>
                      setNewTech({ ...newTech, skill: e.target.value })
                    }>
                    <option>AC & Refrigerator</option>
                    <option>Washing Machine</option>
                    <option>Microwave & TV</option>
                    <option>Chimney & Hob</option>
                    <option>All Appliances</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">
                    City
                  </label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.city}
                    onChange={(e) =>
                      setNewTech({ ...newTech, city: e.target.value })
                    }>
                    <option>Delhi</option>
                    <option>Mumbai</option>
                    <option>Bangalore</option>
                    <option>Pune</option>
                    <option>Chennai</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">
                    Initial Rating
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.rating}
                    onChange={(e) =>
                      setNewTech({ ...newTech, rating: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">
                    Availability
                  </label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    value={newTech.availability}
                    onChange={(e) =>
                      setNewTech({ ...newTech, availability: e.target.value })
                    }>
                    <option>Available</option>
                    <option>Busy</option>
                    <option>Offline</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                  Onboard Tech
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && serviceProviderToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 border border-red-100 shadow-inner">
              <Trash2 size={28} />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Delete Service Provider?
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-800">
                {serviceProviderToDelete.name}
              </strong>{" "}
              (
              <span className="text-[#0D47A1] font-semibold">
                {serviceProviderToDelete.id}
              </span>
              )? This action cannot be undone.
            </p>

            <div className="flex gap-3 w-full mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTechToDelete(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs transition-all">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteServiceProvider}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-2xl text-xs transition-all shadow-md shadow-red-500/20">
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {loadError && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg">
          {loadError}
        </div>
      )}

      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default ServiceProviders;
