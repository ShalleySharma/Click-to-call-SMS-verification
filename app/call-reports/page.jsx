"use client";

import { useEffect, useMemo, useState } from "react";

import GlassCard from "../../components/ui/GlassCard";
import Spinner from "../../components/ui/Spinner";
import Alert from "../../components/ui/Alert";
import { ArrowRightIcon, RefreshIcon } from "../../components/ui/Icons";

function toCsv(rows) {
  const headers = [
    "id",
    "campaign_id",
    "from_number",
    "to_number",
    "call_time",
    "from_status",
    "answer_time",
    "recording_url",
  ];

  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    // quote if needed
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.campaign_id,
        r.from_number,
        r.to_number,
        r.call_time,
        r.from_status,
        r.answer_time,
        r.recording_url,
      ].map(escape).join(",")
    );
  }
  return lines.join("\n");
}

function formatStatus(status) {
  if (!status) return "";
  return String(status);
}

function statusColor(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("answered") || s.includes("success") || s === "verified") return "text-emerald-200";
  if (s.includes("miss") || s.includes("failed")) return "text-rose-200";
  if (s.includes("busy")) return "text-amber-200";
  return "text-slate-200";
}

export default function CallReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [campaignId, setCampaignId] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  async function fetchReports({ pageOverride } = {}) {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(pageOverride || page));
      params.set("pageSize", String(pageSize));
      if (campaignId) params.set("campaignId", campaignId);
      if (fromNumber) params.set("fromNumber", fromNumber);
      if (toNumber) params.set("toNumber", toNumber);
      if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);

      // const res = await fetch(`/api/call-reports?${params.toString()}`);
      // const data = await res.json().catch(() => null);

      // if (!res.ok || !data?.ok) {
      //   throw new Error(data?.error || "Failed to load call reports");
      // }

      // setRows(Array.isArray(data.rows) ? data.rows : []);
      // setTotal(Number(data.total || 0));
      const res = await fetch(`/api/call-reports?${params.toString()}`);

console.log("STATUS:", res.status);

const data = await res.json().catch(() => null);

console.log("API RESPONSE:", data);

setRows(Array.isArray(data.rows) ? data.rows : []);
setTotal(Number(data.total || 0));

console.log("ROWS SET:", data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports({ pageOverride: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // refetch when filters change
    fetchReports({ pageOverride: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, fromNumber, toNumber, statusFilter]);

  const stats = useMemo(() => {
    const totalCalls = total;
    const answered = rows.filter((r) => String(r.from_status || "").toLowerCase().includes("answer")).length;
    const missed = rows.filter((r) => String(r.from_status || "").toLowerCase().includes("miss")).length;
    const failed = rows.filter((r) => String(r.from_status || "").toLowerCase().includes("fail")).length;
    const denom = answered + missed + failed;
    const successRate = denom ? Math.round((answered / denom) * 1000) / 10 : 0;

    // NOTE: stats are computed from current page rows.
    // If you need global stats across all pages, we should add an API endpoint.
    return {
      totalCalls,
      answered,
      missed,
      failed,
      successRate,
    };
  }, [rows, total]);

  async function handleRefresh() {
    await fetchReports({ pageOverride: page });
  }

  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessMsg("Copied to clipboard");
    } catch {
      setError("Clipboard permission denied");
    }
  }

  function handleDownloadCsv() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-reports-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // refetch when page changes (but keep filters)
  useEffect(() => {
    fetchReports({ pageOverride: page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);


  return (
    <div className="min-h-screen overflow-hidden">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <header className="mb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-200">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-glow" />
            <span className="tracking-wide">CALL REPORT TRACKING</span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Call Reports
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Search, filter, and export click-to-call results.
          </p>
        </header>

        {error ? <Alert type="error" title="Error" message={error} /> : null}
        {successMsg ? <Alert type="success" title="Success" message={successMsg} /> : null}

        <div className="grid gap-4 sm:grid-cols-5 mb-6">
          <GlassCard className="p-4 sm:p-5">
            <p className="text-xs text-slate-400">Total Calls</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{total}</p>
          </GlassCard>
          <GlassCard className="p-4 sm:p-5">
            <p className="text-xs text-slate-400">Answered</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-200">{stats.answered}</p>
          </GlassCard>
          <GlassCard className="p-4 sm:p-5">
            <p className="text-xs text-slate-400">Missed</p>
            <p className="mt-2 text-2xl font-semibold text-rose-200">{stats.missed}</p>
          </GlassCard>
          <GlassCard className="p-4 sm:p-5">
            <p className="text-xs text-slate-400">Failed</p>
            <p className="mt-2 text-2xl font-semibold text-amber-200">{stats.failed}</p>
          </GlassCard>
          <GlassCard className="p-4 sm:p-5">
            <p className="text-xs text-slate-400">Success Rate</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-200">{stats.successRate}%</p>
          </GlassCard>
        </div>

        <GlassCard className="p-5 sm:p-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-3 sm:grid-cols-3 w-full">
              <label className="text-xs text-slate-300">
                Campaign ID
                <input
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-4 focus:ring-white/10"
                  placeholder="e.g. 184902"
                />
              </label>

              <label className="text-xs text-slate-300">
                From Number
                <input
                  value={fromNumber}
                  onChange={(e) => setFromNumber(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-4 focus:ring-white/10"
                  placeholder="10-digit"
                />
              </label>

              <label className="text-xs text-slate-300">
                To Number
                <input
                  value={toNumber}
                  onChange={(e) => setToNumber(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-4 focus:ring-white/10"
                  placeholder="10-digit"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="text-xs text-slate-300">
                Status
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-4 focus:ring-white/10"
                >
                  {[
                    "All",
                    "Answered",
                    "Missed",
                    "Busy",
                    "Failed",
                  ].map((s) => (
                    <option key={s} value={s} className="bg-slate-900">
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  <RefreshIcon />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={!rows.length}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/15 disabled:opacity-60"
                >
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse">
              <thead className="bg-white/5">
                <tr>
                  {[
                    "ID",
                    "Campaign ID",
                    "From Number",
                    "To Number",
                    "Time",
                    "From Number Status",
                    "From Answer Time",
                    "Recording",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-300 border-b border-white/10"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i} className="border-t border-white/10">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length ? (
                  rows.map((r) => (
                    <tr key={r.id} className="border-t border-white/10 hover:bg-white/5 transition">
                      <td className="px-4 py-4 text-sm text-slate-200">{r.id}</td>
                      <td className="px-4 py-4 text-sm text-slate-200">{r.campaign_id}</td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(r.from_number)}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
                          >
                            {r.from_number}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-200">{r.to_number}</td>
                      <td className="px-4 py-4 text-sm text-slate-300">
                        {r.call_time ? String(r.call_time).replace('T', ' ').slice(0, 19) : ""}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold">
                        <span className={statusColor(r.from_status)}>{formatStatus(r.from_status)}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-300">
                        {r.answer_time ? String(r.answer_time).replace('T', ' ').slice(0, 19) : ""}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {r.recording_url ? (
                          <a
                            href={r.recording_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
                          >
                            ▶ Play Recording
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">No Recording</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center">
                      <div className="text-slate-300">
                        No call reports found.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-t border-white/10">
            <div className="text-xs text-slate-400">
              Page {page} of {totalPages} • {total} total calls
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}

