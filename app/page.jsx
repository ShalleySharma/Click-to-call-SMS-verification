"use client";

import { useEffect, useMemo, useState } from "react";

import Alert from "../components/ui/Alert";
import CodeBlock from "../components/ui/CodeBlock";
import Field from "../components/ui/Field";
import GlassCard from "../components/ui/GlassCard";
import Spinner from "../components/ui/Spinner";
import { ArrowRightIcon, RefreshIcon } from "../components/ui/Icons";


function validateDigits10(value) {
  if (!value) return "";
  if (!/^\d{0,10}$/.test(value)) return "Only numeric digits are allowed.";
  if (value.length !== 10) return "Must be exactly 10 digits.";
  return "";
}

export default function Page() {
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");

  const [fromTouched, setFromTouched] = useState(false);
  const [toTouched, setToTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null); // {type,title,message}
  const [response, setResponse] = useState(null);
  const [copied, setCopied] = useState(false);

  const fromError = useMemo(() => {
    const msg = validateDigits10(fromNumber);
    if (!fromTouched) return msg && msg.length ? msg : "";
    return msg;
  }, [fromNumber, fromTouched]);

  const toError = useMemo(() => {
    const msg = validateDigits10(toNumber);
    if (!toTouched) return msg && msg.length ? msg : "";
    return msg;
  }, [toNumber, toTouched]);

  const isValid =
    /^\d{10}$/.test(fromNumber) && /^\d{10}$/.test(toNumber) && !loading;

  async function handleSubmit(e) {
    e.preventDefault();

    setAlert(null);
    setResponse(null);
    setCopied(false);

    setFromTouched(true);
    setToTouched(true);

    const fromMsg = validateDigits10(fromNumber);
    const toMsg = validateDigits10(toNumber);

    if (fromMsg || toMsg) {
      setAlert({
        type: "error",
        title: "Fix the highlighted fields",
        message: "Both numbers must be exactly 10 digits.",
      });
      return;
    }

    if (!isValid) return;

    setLoading(true);
    try {
      // store current click-to-call tracking reference in sessionStorage
      // so the UI can fetch the report after the call is cut.
      const existingCache = typeof window !== "undefined" ? window.sessionStorage : null;
      const trackingRef = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      existingCache?.setItem("ctc_tracking_ref", trackingRef);

      const res = await fetch("/api/click-to-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_number: fromNumber, to_number: toNumber, tracking_ref: trackingRef }),
      });

      const data = await res.json().catch(() => null);

      // keep whatever provider/backend returns; but ensure we always have trackingRef
      if (data?.trackingRef && !existingCache?.getItem("ctc_tracking_ref")) {
        existingCache?.setItem("ctc_tracking_ref", data.trackingRef);
      }

      setResponse(data);

      if (!res.ok || data?.ok === false) {
        setAlert({
          type: "error",
          title: "Initiation failed",
          message: data?.error || "The provider rejected the request.",
        });
        return;
      }

      setAlert({
        type: "success",
        title: "Call initiated",
        message: "Your click-to-call request was successfully sent.",
      });
    } catch {
      setAlert({
        type: "error",
        title: "Network error",
        message: "Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFromNumber("");
    setToNumber("");
    setFromTouched(false);
    setToTouched(false);
    setAlert(null);
    setResponse(null);
    setCopied(false);
  }

  function handleCopy() {
    if (!response) return;
    const text = typeof response === "string" ? response : JSON.stringify(response, null, 2);
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {
        setAlert({
          type: "error",
          title: "Copy failed",
          message: "Your browser blocked clipboard access.",
        });
      });
  }

  const [latestCalls, setLatestCalls] = useState([]);
  const [latestLoading, setLatestLoading] = useState(true);
  const [latestError, setLatestError] = useState(null);

  const [activeCallReport, setActiveCallReport] = useState(null);
  const [activeCallLoading, setActiveCallLoading] = useState(false);
  const [activeCallError, setActiveCallError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLatestLoading(true);
        setLatestError(null);
        const res = await fetch("/api/latest-call-reports");
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to load call reports");
        setLatestCalls(Array.isArray(data.rows) ? data.rows : []);
      } catch (e) {
        if (!alive) return;
        setLatestError(e instanceof Error ? e.message : String(e));
        setLatestCalls([]);
      } finally {
        if (!alive) return;
        setLatestLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // after successful initiation, listen for the callback report (SSE)
  useEffect(() => {
    if (alert?.type !== "success") return;

    let alive = true;
    let es;

    try {
      setActiveCallError(null);
      setActiveCallLoading(true);
      setActiveCallReport(null);

      const trackingRef = window.sessionStorage?.getItem("ctc_tracking_ref");
      if (!trackingRef) throw new Error("Missing call tracking reference in cache.");

      const url = `/api/call-callback-stream?trackingRef=${encodeURIComponent(trackingRef)}`;
      es = new EventSource(url);

      es.addEventListener("ready", (ev) => {
        try {
          console.log("SSE ready event data:", ev.data);
          const payload = JSON.parse(ev.data);
          if (!alive) return;

          // Show tracking correlation values in UI too.
          const trackingRefInCallback = payload?.tracking_ref || payload?.trackingRef || null;
          console.log("trackingRef in callback:", trackingRefInCallback);


          // Store browser-only report.
          // Keep same shape fields used by UI/table where possible.
          const report = {
            id: payload.uniqueid || null,
            campaign_id: payload.campaign_id || payload.campaignId || null,
            from_number: payload.from_number || null,
            to_number: payload.to_number || null,
            call_time: payload.call_time || payload.start_time || null,
            from_status: payload.from_number_status || payload.status || null,
            answer_time: payload.answer_time || null,
            recording_url: payload.recording_url || null,
            raw_payload: payload,
            // keep a copy of trackingRef so debugging is easy
            trackingRef: payload.tracking_ref || payload.trackingRef || null,
          };


          window.sessionStorage?.setItem("ctc_last_call_report", JSON.stringify(report));
          setActiveCallReport(report);
        } catch (e) {
          if (!alive) return;
          setActiveCallError(e instanceof Error ? e.message : String(e));
        } finally {
          if (!alive) return;
          setActiveCallLoading(false);
          es?.close();
        }
      });


      es.addEventListener("timeout", (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (!alive) return;
          setActiveCallError(data?.error || "No callback received in time.");
        } catch {
          if (!alive) return;
          setActiveCallError("No callback received in time.");
        } finally {
          if (!alive) return;
          setActiveCallLoading(false);
          es?.close();
        }
      });

      es.onerror = () => {
        // EventSource error can happen transiently; don’t immediately fail.
      };
    } catch (e) {
      if (!alive) return;
      setActiveCallError(e instanceof Error ? e.message : String(e));
      setActiveCallLoading(false);
      es?.close();
    }

    return () => {
      alive = false;
      es?.close();
    };
  }, [alert]);


  // also refresh latest calls after you initiate a click-to-call successfully
  useEffect(() => {
    if (alert?.type !== "success") return;
    (async () => {
      try {
        const res = await fetch("/api/latest-call-reports");
        const data = await res.json().catch(() => null);
        if (data?.ok && Array.isArray(data.rows)) setLatestCalls(data.rows);
      } catch {
        // ignore
      }
    })();
  }, [alert]);

  return (

    <div className="min-h-screen overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-hero-gradient opacity-90" />
        <div className="absolute -top-40 left-1/2 h-[540px] w-[740px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-[30%] -left-24 h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <header className="mb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-glow" />
            <span className="tracking-wide">ENTERPRISE CLICK-TO-CALL PORTAL</span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Initiate calls in seconds
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Premium, secure request forwarding—client never touches the external provider.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassCard className="p-6 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-200">Request Details</p>
                <p className="mt-1 text-xs text-slate-400">
                  Enter both numbers (exactly 10 digits) to initiate a click-to-call session.
                </p>
              </div>
              <div className="hidden sm:block">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs text-slate-400">Routing</p>
                  <p className="mt-1 text-sm font-semibold text-white">Secure API Bridge</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading}>
              {alert ? (
                <Alert type={alert.type} title={alert.title} message={alert.message} />
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="From Number"
                  name="from"
                  value={fromNumber}
                  onChange={(name, val) => {
                    if (name === "from") setFromNumber(val);
                  }}
                  placeholder="7217609916"
                  error={fromTouched ? fromError : ""}
                  maxLen={10}
                  minLen={10}
                  disabled={loading}
                  autoComplete="off"
                />

                <Field
                  label="To Number"
                  name="to"
                  value={toNumber}
                  onChange={(name, val) => {
                    if (name === "to") setToNumber(val);
                  }}
                  placeholder="8873487374"
                  error={toTouched ? toError : ""}
                  maxLen={10}
                  minLen={10}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-center">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className={
                    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold " +
                    "text-slate-100 transition-all duration-200 hover:bg-white/10 hover:border-white/20 " +
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/10 " +
                    (loading ? " opacity-60 cursor-not-allowed" : "")
                  }
                >
                  <RefreshIcon />
                  Reset
                </button>

                <a
                  href="/call-reports"
                  className={
                    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold " +
                    "text-slate-100 transition-all duration-200 hover:bg-white/10 hover:border-white/20 " +
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/10"
                  }
                >
                  View Reports
                </a>

                <button
                  type="submit"
                  disabled={!isValid}
                  className={
                    "group inline-flex items-center justify-center gap-2 rounded-xl " +
                    "px-5 py-3 text-sm font-semibold transition-all duration-200 " +
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/10 " +
                    "border border-white/10 bg-white/10 text-white " +
                    "hover:-translate-y-0.5 hover:bg-white/15 hover:border-white/20 " +
                    (!isValid ? " opacity-50 cursor-not-allowed" : "")
                  }
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner />
                      Initiating...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Initiate Call
                      <ArrowRightIcon className="opacity-80 group-hover:opacity-100 transition-opacity" />
                    </span>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Validation: digits only, maximum 10 digits, minimum 10 digits. Submission is disabled until both fields are valid.
              </p>
            </form>
          </GlassCard>

          <div className="space-y-6">
            <GlassCard className="p-6 sm:p-7">
              <p className="text-sm font-semibold text-slate-200">API Response</p>
              <p className="mt-1 text-xs text-slate-400">
                View what the secure backend returns.
              </p>

              <div className="mt-4">
                {response ? (
                  <CodeBlock value={response} onCopy={handleCopy} copied={copied} />
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="text-sm font-semibold text-slate-100">No response yet</div>
                    <p className="mt-1 text-xs text-slate-400">
                      Submit the form to see the result from the click-to-call provider.
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-6 sm:p-7">
              <p className="text-sm font-semibold text-slate-200">Call Reports Details</p>
              <p className="mt-1 text-xs text-slate-400">Latest call rows stored in the database.</p>

              <div className="mt-5">
                <div className="text-xs text-slate-400 mb-2">Active call (from browser cache)</div>
                {activeCallError ? (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
                    {activeCallError}
                  </div>
                ) : activeCallLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100 inline-flex items-center gap-2">
                    <Spinner /> Waiting for call result...
                  </div>
                ) : activeCallReport ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-slate-100">Call Report Ready</div>
                    <div className="mt-2 text-xs text-slate-300">
                      <div>ID: <span className="text-slate-100 font-semibold">{activeCallReport.id}</span></div>
                      <div>From: {activeCallReport.from_number} → To: {activeCallReport.to_number}</div>
                      <div>Status: {activeCallReport.from_status}</div>
                      <div>Time: {activeCallReport.call_time ? String(activeCallReport.call_time).replace('T',' ').slice(0,19) : ''}</div>
                    </div>
                    <div className="mt-3">
                      {activeCallReport.recording_url ? (
                        <a
                          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
                          href={activeCallReport.recording_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ▶ Play
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">No Recording</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">No active call report yet.</div>
                )}
              </div>

              <div className="mt-4">
                {latestLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <Spinner /> Loading...
                    </div>
                  </div>
                ) : latestError ? (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-200">
                    {latestError}
                  </div>
                ) : latestCalls && latestCalls.length ? (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    <table className="w-full border-collapse">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Campaign</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">From</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">To</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Time</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Recording</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestCalls.map((r) => (
                          <tr key={r.id} className="border-t border-white/10">
                            <td className="px-4 py-3 text-sm text-slate-200">{r.id}</td>
                            <td className="px-4 py-3 text-sm text-slate-200">{r.campaign_id}</td>
                            <td className="px-4 py-3 text-sm text-slate-200">{r.from_number}</td>
                            <td className="px-4 py-3 text-sm text-slate-200">{r.to_number}</td>
                            <td className="px-4 py-3 text-sm text-slate-300">
                              {r.call_time ? String(r.call_time).replace('T', ' ').slice(0, 19) : ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-100 font-semibold">
                              {r.from_status}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {r.recording_url ? (
                                <a
                                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
                                  href={r.recording_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  ▶ Play
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">No Recording</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
                    No call reports yet.
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-6 sm:p-7">
              <p className="text-sm font-semibold text-slate-200">Security</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Token and CLI number are read server-side only.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  External API is called from <span className="font-semibold">/api/click-to-call</span>.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Inputs are validated both in the UI and on the server.
                </li>
              </ul>
            </GlassCard>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500">
          Built with Next.js 15 App Router • Tailwind CSS • Secure API Bridge
        </footer>
      </main>
    </div>
  );
}


