"use client";

import { useEffect, useMemo, useState } from "react";

import Alert from "../../components/ui/Alert";
import Field from "../../components/ui/Field";
import GlassCard from "../../components/ui/GlassCard";
import Spinner from "../../components/ui/Spinner";
import { ArrowRightIcon, RefreshIcon } from "../../components/ui/Icons";



function validateMobile10(value) {
  if (!value) return "";
  if (!/^\d*$/.test(value)) return "Only digits allowed.";
  if (value.length !== 10) return "Exactly 10 digits required.";
  return "";
}

function validateOtp6(value) {
  if (!value) return "";
  if (!/^\d*$/.test(value)) return "Only digits allowed.";
  if (value.length !== 6) return "Exactly 6 digits required.";
  return "";
}

export default function SmsVerificationPage() {
  const [step, setStep] = useState(1); // 1: mobile, 2: otp

  const [stats, setStats] = useState({ verified: 0, pending: 0, not_verified: 0 });

  const [mobile, setMobile] = useState("");
  const [mobileTouched, setMobileTouched] = useState(false);

  const [otp, setOtp] = useState("");
  const [otpTouched, setOtpTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null); // {type,title,message}
  const [result, setResult] = useState(null);

  const [countdown, setCountdown] = useState(30);
  const [resendEnabled, setResendEnabled] = useState(true);

  const mobileError = useMemo(() => {
    if (!mobileTouched) return "";
    return validateMobile10(mobile);
  }, [mobile, mobileTouched]);

  const otpError = useMemo(() => {
    if (!otpTouched) return "";
    return validateOtp6(otp);
  }, [otp, otpTouched]);

  const canSend = /^\d{10}$/.test(mobile) && !loading;
  const canVerify = /^\d{6}$/.test(otp) && !loading;

  // Prevent leaking OTP length: don't provide any client-side validation message.
  // Backend still enforces the real OTP match/TTL.


  useEffect(() => {
    if (step !== 2) return;
    // Start timer after first OTP send.
  }, [step]);

  useEffect(() => {
    if (!resendEnabled || step !== 2) return;
    setCountdown(30);
  }, [resendEnabled, step]);

  useEffect(() => {
    if (step !== 2) return;
    if (resendEnabled) return;

    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          setResendEnabled(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [resendEnabled, step]);

  function handleResetToStep1() {
    setStep(1);
    setMobile("");
    setMobileTouched(false);
    setOtp("");
    setOtpTouched(false);
    setLoading(false);
    setAlert(null);
    setResult(null);
    setCountdown(30);
    setResendEnabled(true);
  }

  async function handleSendOtp() {
    setAlert(null);
    setResult(null);

    setMobileTouched(true);
    if (!/^\d{10}$/.test(mobile)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        setAlert({
          type: "error",
          title: "OTP sending failed",
          message: data?.error || "Please try again.",
        });
        return;
      }

      setStep(2);
      setOtp("");
      setOtpTouched(false);
      setCountdown(30);
      setResendEnabled(false);
      setAlert({
        type: "success",
        title: "OTP sent",
        message: "Enter the 6-digit code to verify your account.",
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

  async function handleVerifyOtp() {
    setAlert(null);
    setResult(null);

    setOtpTouched(true);
    if (!/^\d{6}$/.test(otp)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        setAlert({
          type: "error",
          title: "Verification failed",
          message: data?.error || "❌ Invalid OTP",
        });
        setResult("failure");
        return;
      }

      setResult("success");
      setAlert({
        type: "success",
        title: "Verified",
        message: "✅ User Verified Successfully",
      });
    } catch {
      setAlert({
        type: "error",
        title: "Network error",
        message: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!resendEnabled) return;
    setAlert(null);
    setResult(null);

    setLoading(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        setAlert({
          type: "error",
          title: "Resend failed",
          message: data?.error || "Please try again.",
        });
        return;
      }

      setOtp("");
      setOtpTouched(false);
      setCountdown(30);
      setResendEnabled(false);
      setAlert({
        type: "success",
        title: "OTP resent",
        message: "A new OTP has been generated. Check your messages.",
      });
    } catch {
      setAlert({
        type: "error",
        title: "Network error",
        message: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyMobile() {
    try {
      await navigator.clipboard.writeText(mobile);
      setAlert({ type: "success", title: "Copied", message: "Mobile number copied." });
    } catch {
      setAlert({
        type: "error",
        title: "Copy failed",
        message: "Your browser blocked clipboard access.",
      });
    }
  }

  const [latestRows, setLatestRows] = useState([]); // [{ mobile, status, created_at }]

  // Load OTP verification stats + latest per-phone status
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [statsRes, latestRes] = await Promise.all([
          fetch("/api/otp-stats", { method: "GET" }),
          fetch("/api/latest-otp-status", { method: "GET" }),
        ]);

        const statsData = await statsRes.json().catch(() => null);
        const latestData = await latestRes.json().catch(() => null);

        if (!alive) return;
        if (statsRes.ok && statsData?.ok && statsData?.stats) setStats(statsData.stats);
        if (latestRes.ok && latestData?.ok && Array.isArray(latestData?.rows)) {
          setLatestRows(latestData.rows);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, []);


  return (
    <div className="min-h-screen overflow-hidden">
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
            <span className="tracking-wide">SECURE SMS OTP VERIFICATION</span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Verify in seconds
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Premium validation + secure backend verification. OTP expires after 5 minutes.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassCard className="p-6 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {step === 1 ? "Mobile Number" : "Enter OTP"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                    {step === 1
                    ? "Enter your mobile number to receive a verification code."
                    : "Use the code from your SMS. Verification is performed server-side."}
                </p>
              </div>
            </div>

            <form
              className="space-y-5"
              aria-busy={loading}
              onSubmit={(e) => {
                e.preventDefault();
                if (step === 1) handleSendOtp();
                else handleVerifyOtp();
              }}
            >
              {alert ? (
                <Alert type={alert.type} title={alert.title} message={alert.message} />
              ) : null}

              {result === "success" ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-semibold text-emerald-200">✅ User Verified Successfully</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Your phone number has been verified. You can safely proceed.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleResetToStep1}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-200 hover:bg-white/10 hover:border-white/20"
                    >
                      Verify Another Number
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {step === 1 ? (
                    <>
                      <Field
                        label="Mobile Number"
                        name="mobile"
                        value={mobile}
                        onChange={(name, val) => {
                          if (name === "mobile") setMobile(val);
                        }}
                        placeholder="7217609916"
                        error={mobileTouched ? mobileError : ""}
                        maxLen={10}
                        minLen={10}
                        disabled={loading}
                        autoComplete="off"
                      />

                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setMobile("");
                            setMobileTouched(false);
                            setAlert(null);
                          }}
                          disabled={loading}
                          className={
                            "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-200 hover:bg-white/10 hover:border-white/20 " +
                            (loading ? " opacity-60 cursor-not-allowed" : "")
                          }
                        >
                          <RefreshIcon />
                          Clear
                        </button>

                        <button
                          type="submit"
                          disabled={!canSend}
                          className={
                            "group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/10 " +
                            "border border-white/10 bg-white/10 text-white hover:-translate-y-0.5 hover:bg-white/15 hover:border-white/20 " +
                            (!canSend ? " opacity-50 cursor-not-allowed" : "")
                          }
                        >
                          {loading ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner />
                              Sending...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              Send OTP
                              <ArrowRightIcon className="opacity-80 group-hover:opacity-100 transition-opacity" />
                            </span>
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-slate-400">
                        Validation: digits only, exactly 10 digits. Submission is disabled until valid.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-semibold text-slate-100">Mobile Number</p>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={handleCopyMobile}
                              className={
                                "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition-all duration-200 hover:bg-white/10 hover:border-white/20 " +
                                (loading ? " opacity-60 cursor-not-allowed" : "")
                              }
                            >
                              Copy
                            </button>
                          </div>
                          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold tracking-wide text-white">
                            {mobile}
                          </div>
                        </div>

                        <Field
                          label="OTP"
                          name="otp"
                          value={otp}
                          onChange={(name, val) => {
                            if (name === "otp") setOtp(val);
                          }}
                          placeholder="••••••"
                          error={otpTouched ? otpError : ""}
                          maxLen={6}
                          minLen={6}
                          disabled={loading}
                          autoComplete="off"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="submit"
                          disabled={!canVerify}
                          className={
                            "group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/10 " +
                            "border border-white/10 bg-white/10 text-white hover:-translate-y-0.5 hover:bg-white/15 hover:border-white/20 " +
                            (!canVerify ? " opacity-50 cursor-not-allowed" : "")
                          }
                        >
                          {loading ? (
                            <span className="inline-flex items-center gap-2">
                              <Spinner />
                              Verifying...
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              Verify OTP
                              <ArrowRightIcon className="opacity-80 group-hover:opacity-100 transition-opacity" />
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={!resendEnabled || loading}
                          onClick={handleResendOtp}
                          className={
                            "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-200 hover:bg-white/10 hover:border-white/20 " +
                            ((!resendEnabled || loading) ? " opacity-50 cursor-not-allowed" : "")
                          }
                        >
                          <RefreshIcon />
                          Resend OTP
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-xs text-slate-400">
                          OTP expires after 5 minutes. Countdown below controls resend availability.
                        </p>
                        <p className="text-xs text-slate-300">
                          {resendEnabled ? (
                            <span className="font-semibold text-emerald-200">You can resend now.</span>
                          ) : (
                            <span>
                              Resend available in <span className="font-semibold">{countdown}s</span>
                            </span>
                          )}
                        </p>
                      </div>

                      <p className="text-xs text-slate-400">
                          Tip: Enter the code exactly as received.
                      </p>
                    </>
                  )}
                </>
              )}

              {result === "failure" ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                  <p className="text-sm font-semibold text-red-200">❌ Invalid OTP</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Please confirm the digits and try again. You can also resend a new OTP.
                  </p>
                </div>
              ) : null}
            </form>
          </GlassCard>

          <div className="space-y-6">
            <GlassCard className="p-6 sm:p-7">
              <p className="text-sm font-semibold text-slate-200">Security</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  SMS provider is called from <span className="font-semibold">/api/send-otp</span> only.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  OTP expiry enforced server-side (5 minutes).
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  SQL injection protection using prepared statements.
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-6 sm:p-7">
              <p className="text-sm font-semibold text-slate-200">How it works</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">1) Send OTP</p>
                  <p className="mt-1 text-sm font-semibold text-white">Backend generates and stores OTP</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">2) Verify</p>
                  <p className="mt-1 text-sm font-semibold text-white">Latest OTP matched & verified</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500">
          Built with Next.js 15 • Tailwind • Secure SMS OTP Verification
        </footer>

        {/* Latest per-phone status rows (shows phone + status, not OTP values) */}
        <div className="mx-auto mt-6 max-w-5xl px-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-200">Verification Details</p>

            <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
              <table className="w-full border-collapse">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestRows && latestRows.length ? (
                    latestRows.map((r, idx) => (
                      <tr key={`${r.mobile}-${idx}`} className="border-t border-white/10">
                        <td className="px-4 py-3 text-sm text-slate-200">{r.mobile}</td>
                        <td
                          className={
                            "px-4 py-3 text-sm font-semibold " +
                            (r.status === "verified"
                              ? "text-emerald-200"
                              : r.status === "not_verified"
                              ? "text-rose-200"
                              : "text-slate-200")
                          }
                        >
                          {r.status === "not_verified" ? "not verified" : r.status}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm text-slate-400">
                        No OTP rows yet.
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
          </div>
        </div>



      </main>
    </div>
  );
}


