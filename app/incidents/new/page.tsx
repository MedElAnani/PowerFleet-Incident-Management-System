"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Car, AlertTriangle, MapPin, AlignLeft, Info, Search, Check } from "lucide-react";
import Link from "next/link";
import RunActionButton, { type RunActionState } from "@/components/ui/RunActionButton";

// Incident Types
const INCIDENT_TYPES = [
  "GPS Device", "Vehicle", "Driver", "Client Complaint", 
  "Accident", "Fuel", "Mission", "Maintenance", 
  "Payment", "System Bug", "Other"
];

interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  imei: string;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function NewIncidentPage() {
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState(INCIDENT_TYPES[0]);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [vehicleId, setVehicleId] = useState<number | "">("");

  // Address Search State
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Button State
  const [btnState, setBtnState] = useState<RunActionState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVehicles() {
      try {
        const res = await axios.get<Vehicle[]>("/api/vehicles");
        setVehicles(res.data);
      } catch (err) {
        console.error("Failed to fetch vehicles:", err);
      } finally {
        setLoadingVehicles(false);
      }
    }
    fetchVehicles();
  }, []);

  // Handle Address Search using OpenStreetMap Nominatim
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (address.length > 3 && showDropdown) {
        setIsSearching(true);
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5`);
          setSearchResults(res.data);
        } catch (error) {
          console.error("Geocoding error", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [address, showDropdown]);

  const selectAddress = (result: SearchResult) => {
    setAddress(result.display_name);
    setLatitude(parseFloat(result.lat));
    setLongitude(parseFloat(result.lon));
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (btnState === "loading") return;

    setErrorMsg(null);
    setBtnState("loading");

    try {
      await axios.post("/api/incidents", {
        title,
        description,
        type,
        address,
        latitude,
        longitude,
        vehicleId: Number(vehicleId),
      });

      setBtnState("success");
      setTimeout(() => {
        router.push("/incidents/dashboard");
      }, 1500);
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        setErrorMsg(err.response?.data?.error || "Failed to create incident");
      } else {
        setErrorMsg("Failed to create incident");
      }
      setBtnState("error");
      setTimeout(() => {
        setBtnState("idle");
      }, 3000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link 
            href="/incidents/dashboard"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-1 size-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Report New Incident
          </h1>
          <p className="text-slate-500 text-sm">
            Please provide accurate details so our technicians can assist you quickly.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="size-4" />
          {errorMsg}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column (Primary Details) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm">
            
            <div className="space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Info className="size-4 text-emerald-500" />
                  Incident Title
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Engine failure on Route 40"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlignLeft className="size-4 text-emerald-500" />
                  Detailed Description
                </label>
                <textarea
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail. What happened? Are there any immediate risks?"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* Address / Location with Autocomplete */}
              <div className="space-y-2 relative">
                <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="size-4 text-emerald-500" />
                  Location / Address
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setShowDropdown(true);
                      setLatitude(undefined); // reset lat/long if they type manually
                      setLongitude(undefined);
                    }}
                    onFocus={() => {
                      if (address.length > 3) setShowDropdown(true);
                    }}
                    placeholder="Search for an address..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 pl-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                  {isSearching && (
                    <div className="absolute right-3.5 top-3">
                      <div className="size-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.place_id}
                        type="button"
                        onClick={() => selectAddress(result)}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors line-clamp-2"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Coordinates Indicator */}
                {latitude && longitude && (
                  <p className="text-[11px] text-emerald-500 font-medium px-1 flex items-center gap-1.5">
                    <Check className="size-3" /> Address mapped to GPS coordinates ({latitude.toFixed(4)}, {longitude.toFixed(4)})
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Right Column (Classification & Submit) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm">
            
            <div className="space-y-5">
              
              {/* Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="size-4 text-emerald-500" />
                  Classification
                </label>
                <select
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center'
                  }}
                >
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Vehicle Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Car className="size-4 text-emerald-500" />
                  Target Vehicle
                </label>
                
                {loadingVehicles ? (
                  <div className="h-[46px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 animate-pulse flex items-center px-4">
                    <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs text-center font-medium">
                    No vehicles found in your account.
                  </div>
                ) : (
                  <select
                    required
                    value={vehicleId}
                    onChange={(e) => setVehicleId(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 16px center'
                    }}
                  >
                    <option value="" disabled>Select a vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.licensePlate})
                      </option>
                    ))}
                  </select>
                )}
              </div>

            </div>

            {/* Run Action Button (Submit) */}
            <div className="mt-8 flex justify-end">
              <RunActionButton 
                status={btnState} 
                idleText="Create Incident" 
                successText="Submitted!"
                errorText="Retry"
              />
            </div>
            
          </div>
        </div>

      </form>

    </div>
  );
}
