import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Briefcase, Handshake, Building, Download, Settings,
  UserCheck, BarChart3, Shield, TrendingUp, Activity, AlertTriangle,
  CheckCircle, Clock, FileText, MessageSquare, GraduationCap,
  Loader2, Mail, Phone, Fingerprint, KeyRound, FolderLock, PlugZap, XCircle, Globe
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AgencyApprovalList } from "@/components/admin/agency-approval-list";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return { data: null };
  return res.json();
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Real data from admin reports API
  const { data: dashRes, isLoading } = useQuery({
    queryKey: ["/api/v1/admin/reports/dashboard"],
    queryFn: () => fetchJson("/api/v1/admin/reports/dashboard"),
  });

  const { data: districtRes } = useQuery({
    queryKey: ["/api/v1/admin/reports/by-district"],
    queryFn: () => fetchJson("/api/v1/admin/reports/by-district"),
  });

  const { data: skillRes } = useQuery({
    queryKey: ["/api/v1/admin/reports/by-skill"],
    queryFn: () => fetchJson("/api/v1/admin/reports/by-skill"),
  });

  const { data: funnelRes } = useQuery({
    queryKey: ["/api/v1/admin/reports/by-placement-status"],
    queryFn: () => fetchJson("/api/v1/admin/reports/by-placement-status"),
  });

  const { data: countryRes } = useQuery({
    queryKey: ["/api/v1/admin/reports/by-country"],
    queryFn: () => fetchJson("/api/v1/admin/reports/by-country"),
  });

  const { data: notifsRes } = useQuery({
    queryKey: ["/api/v1/notifications"],
    queryFn: () => fetchJson("/api/v1/notifications?limit=10"),
  });

  const { data: grievancesRes } = useQuery({
    queryKey: ["/api/v1/grievances"],
    queryFn: () => fetchJson("/api/v1/grievances"),
  });

  const { data: pendingDrivesRes } = useQuery({
    queryKey: ["/api/v1/drives", "pending"],
    queryFn: () => fetchJson("/api/v1/drives?status=pending"),
  });

  const queryClient = useQueryClient();

  const stats = dashRes?.data || {};
  const districts = districtRes?.data || [];
  const skills = skillRes?.data || { demand: [], supply: [] };
  const funnel = funnelRes?.data || { funnel: [], summary: {} };
  const countries = countryRes?.data || [];
  const notifications = notifsRes?.data || [];
  const grievanceList = grievancesRes?.data || [];
  const pendingDrives = pendingDrivesRes?.data || [];

  if (isLoading) {
    return (
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-8 2xl:px-12 py-8 space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-8 2xl:px-12 py-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl shadow-lg p-5 mb-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-40" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Admin Console</h2>
              <p className="text-slate-300 text-xs md:text-sm">HPSEDC Overseas Placement Portal — System Administration</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["candidates", "jobs", "applications", "agencies", "placements"].map(entity => (
              <Button key={entity} variant="outline" size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-lg text-xs capitalize"
                onClick={() => window.open(`/api/v1/admin/reports/export/${entity}.csv`, "_blank")}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> {entity} CSV
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border shadow-sm flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agencies">Agencies</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="welfare">Welfare SLA</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="drives">Drives ({pendingDrives.length} pending)</TabsTrigger>
          <TabsTrigger value="grievances">Grievances ({grievanceList.length})</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="fraud">Fraud watch</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="templates">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="settings">System Config</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ──────────────────────────────── */}
        <TabsContent value="overview">
          {/* Key Metrics — ALL REAL */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <MetricCard icon={<Users />} color="bg-blue-600" label="Candidates" value={stats.users?.candidates || 0} />
            <MetricCard icon={<Briefcase />} color="bg-emerald-600" label="Open Job Vacancies" value={stats.jobs?.active || 0} />
            <MetricCard icon={<Handshake />} color="bg-orange-500" label="Placements" value={stats.placements?.total || 0} />
            <MetricCard icon={<Building />} color="bg-purple-600" label="Agencies" value={`${stats.agencies?.verified || 0} / ${stats.agencies?.total || 0}`} sub="verified" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left — Analytics */}
            <div className="lg:col-span-2 space-y-6">
              {/* Application Funnel — REAL */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="text-blue-600 mr-2 w-5 h-5" /> Application Pipeline
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{funnel.summary?.registered || 0}</p>
                    <p className="text-xs text-gray-500">Registered</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-600">{funnel.summary?.applied || 0}</p>
                    <p className="text-xs text-gray-500">Applied</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{funnel.summary?.placed || 0}</p>
                    <p className="text-xs text-gray-500">Placed</p>
                  </div>
                </div>
                {funnel.funnel?.length > 0 && (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={funnel.funnel.map((s: any) => ({ name: s.status?.replace(/_/g, ' '), count: s.count }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* By District — REAL */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidates by District</h3>
                {districts.length === 0 ? (
                  <p className="text-gray-500 text-sm">No district data yet</p>
                ) : (
                  <div className="space-y-3">
                    {districts.slice(0, 8).map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 w-32">{d.district}</span>
                        <div className="flex-1 mx-4 bg-gray-100 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min((d.candidates / (districts[0]?.candidates || 1)) * 100, 100)}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">{d.candidates}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* By Country — REAL with Pie Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Jobs by Destination Country</h3>
                {countries.length === 0 ? (
                  <p className="text-gray-500 text-sm">No country data yet</p>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={countries.map((c: any) => ({ name: c.country, value: c.total_jobs }))}
                          dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.name}>
                          {countries.map((_: any, i: number) => (
                            <Cell key={i} fill={["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"][i % 7]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {countries.map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"][i % 7] }} />
                          <span className="text-sm text-gray-700">{c.country}</span>
                          <span className="text-xs text-gray-400">{c.total_jobs} jobs, {c.total_applications} apps</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right — Status + Actions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Pending Verifications — FRS 4.11. Renamed from generic "Pending
                  Actions" + "Agency Verifications" so a reviewer scanning the
                  dashboard matches the FRS wording at a glance. */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Verifications</h3>
                <div className="space-y-3">
                  <PendingItem icon={<UserCheck />} label="Agency Verifications" count={stats.agencies?.pendingVerification || 0} color="bg-yellow-50 border-yellow-200" />
                  <PendingItem icon={<Clock />} label="Drive Approvals" count={stats.drives?.pendingApproval || 0} color="bg-blue-50 border-blue-200" />
                  <PendingItem icon={<MessageSquare />} label="Open Grievances" count={stats.grievances?.open || 0} color="bg-red-50 border-red-200" />
                </div>
                <button
                  onClick={() => {
                    // Switch the adjacent Tabs to the Agencies pane — queries the Tabs trigger by data-state.
                    const btn = document.querySelector<HTMLButtonElement>('[role="tab"][value="agencies"], [data-value="agencies"]');
                    btn?.click();
                  }}
                  className="mt-3 w-full text-xs font-semibold px-3 py-2 rounded bg-slate-900 text-white hover:bg-slate-800">
                  Review now →
                </button>
              </div>

              {/* Skills Demand — REAL */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Skills (Demand)</h3>
                {skills.demand?.length === 0 ? (
                  <p className="text-gray-500 text-sm">No skill data yet</p>
                ) : (
                  <div className="space-y-2">
                    {skills.demand?.slice(0, 6).map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">{s.skill}</Badge>
                        <span className="text-sm text-gray-600">{s.job_count} jobs</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity — REAL from notifications */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {notifications.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.slice(0, 5).map((n: any) => (
                      <div key={n.id} className="border-l-2 border-blue-300 pl-3">
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500">{n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Agencies Tab ─────────────────────────────── */}
        <TabsContent value="agencies">
          <AgencyApprovalList />
        </TabsContent>

        {/* ── Reports Tab ──────────────────────────────── */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "By District", desc: "Candidates & placements by location", endpoint: "by-district" },
              { title: "By Agency", desc: "Agency performance & placement rates", endpoint: "by-agency" },
              { title: "By Skill", desc: "Skill demand vs supply analysis", endpoint: "by-skill" },
              { title: "By Placement Status", desc: "Application funnel metrics", endpoint: "by-placement-status" },
              { title: "By Country", desc: "Jobs & placements by destination", endpoint: "by-country" },
              { title: "By Sector", desc: "Jobs grouped by company/sector", endpoint: "by-sector" },
            ].map((report) => (
              <div key={report.endpoint} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-gray-900 mb-1">{report.title}</h4>
                <p className="text-sm text-gray-500 mb-4">{report.desc}</p>
                <Button size="sm" variant="outline"
                  onClick={async () => {
                    const res = await fetch(`/api/v1/admin/reports/${report.endpoint}`);
                    const data = await res.json();
                    toast({ title: `${report.title} Report`, description: `${JSON.stringify(data.data).length > 100 ? 'Data loaded — ' + (Array.isArray(data.data) ? data.data.length : Object.keys(data.data).length) + ' entries' : 'No data yet'}` });
                  }}>
                  <BarChart3 className="w-4 h-4 mr-1" /> View Report
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Drives Approval Tab ─────────────────────── */}
        <TabsContent value="drives">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-lg font-semibold mb-4">Pending Drive Approvals</h3>
            {pendingDrives.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No drives pending approval</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingDrives.map((d: any) => (
                  <DriveApprovalCard key={d.id} drive={d} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Grievances Tab ────────────────────────────── */}
        <TabsContent value="grievances">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-lg font-semibold mb-4">Grievances ({grievanceList.length})</h3>
            {grievanceList.length === 0 ? (
              <p className="text-gray-500">No grievances submitted yet</p>
            ) : (
              <div className="space-y-4">
                {grievanceList.map((g: any) => (
                  <GrievanceCard key={g.id} grievance={g} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Compliance Oversight ─────────────────────── */}
        <TabsContent value="compliance">
          <CompliancePanel />
        </TabsContent>

        {/* ── Welfare SLA Monitor ──────────────────────── */}
        <TabsContent value="welfare">
          <WelfareSlaPanel />
        </TabsContent>

        {/* ── User Management ──────────────────────────── */}
        <TabsContent value="users">
          <UserManagementPanel />
        </TabsContent>

        {/* ── Audit Log Viewer ─────────────────────────── */}
        <TabsContent value="audit">
          <AuditLogPanel />
        </TabsContent>

        <TabsContent value="lifecycle">
          <LifecyclePanel />
        </TabsContent>

        <TabsContent value="leaderboard"><AgencyLeaderboardPanel /></TabsContent>
        <TabsContent value="funnel"><FunnelPanel /></TabsContent>
        <TabsContent value="fraud"><FraudWatchlistPanel /></TabsContent>
        <TabsContent value="duplicates"><DuplicatesPanel /></TabsContent>
        <TabsContent value="countries"><CountryInfoAdminPanel /></TabsContent>

        <TabsContent value="templates">
          <NotificationTemplatesPanel />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsPanel />
        </TabsContent>

        {/* ── System Config Tab ─────────────────────────── */}
        <TabsContent value="settings">
          <SystemConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Agency Leaderboard (HPSEDC operational view) ─────────────────────
// Ranked by placements with welfare-compliance / time-to-offer / grievance
// signals. Data is all derived from existing tables.
function AgencyLeaderboardPanel() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/admin/oversight/agency-leaderboard"],
    queryFn: () => fetchJson("/api/v1/admin/oversight/agency-leaderboard"),
  });
  const rows: any[] = res?.data ?? [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" /> Agency leaderboard
        </h3>
        <p className="text-xs text-slate-500">Ranked by accepted placements · ties by rating · then fewer grievances</p>
      </div>
      {isLoading ? <Skeleton className="h-48 w-full" /> : rows.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No verified agencies yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left py-2 px-2 w-10">#</th>
                <th className="text-left py-2 px-2">Agency</th>
                <th className="text-right py-2 px-2">Placements</th>
                <th className="text-right py-2 px-2">Accepted</th>
                <th className="text-right py-2 px-2">Avg days → offer</th>
                <th className="text-right py-2 px-2">Welfare %</th>
                <th className="text-right py-2 px-2">Rating</th>
                <th className="text-right py-2 px-2">Grievances 30d</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-2 font-bold text-slate-500 tabular-nums">{i + 1}</td>
                  <td className="py-2 px-2">
                    <div className="font-semibold text-slate-900">{a.agencyName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{a.licenseNumber}</div>
                  </td>
                  <td className="py-2 px-2 text-right font-semibold tabular-nums">{a.placements ?? 0}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{a.acceptedPlacements}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{a.avgDaysToOffer ?? "—"}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{a.welfareCompliancePct != null ? `${a.welfareCompliancePct}%` : "—"}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{a.rating ?? 0} / 5</td>
                  <td className={`py-2 px-2 text-right tabular-nums font-semibold ${a.grievanceCount >= 3 ? "text-red-700" : "text-slate-700"}`}>{a.grievanceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Funnel Analytics ─────────────────────────────────────────────────
function FunnelPanel() {
  const [country, setCountry] = useState<string>("all");
  const [agentId, setAgentId] = useState<string>("all");
  const qs = `country=${encodeURIComponent(country)}&agentId=${encodeURIComponent(agentId)}`;
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/admin/oversight/funnel", country, agentId],
    queryFn: () => fetchJson(`/api/v1/admin/oversight/funnel?${qs}`),
  });
  const funnel: any[] = res?.data?.funnel ?? [];
  const max = Math.max(1, ...funnel.map((s: any) => s.count));

  const stageLabel: Record<string, string> = {
    submitted: "Submitted", reviewed: "Reviewed", shortlisted: "Shortlisted",
    interview_scheduled: "Interview", selected: "Selected", placed: "Placed",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600" /> Pipeline funnel
        </h3>
        <div className="flex items-center gap-2">
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="country (or 'all')" className="h-8 text-xs w-36" />
        </div>
      </div>
      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div className="space-y-2">
          {funnel.map((s: any) => (
            <div key={s.stage} className="grid grid-cols-[120px_1fr_70px_80px] items-center gap-3 text-sm">
              <span className="text-slate-700 font-medium">{stageLabel[s.stage] ?? s.stage}</span>
              <div className="relative h-6 bg-slate-100 rounded overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-600"
                  style={{ width: `${(s.count / max) * 100}%` }} />
              </div>
              <span className="text-right font-semibold tabular-nums">{s.count}</span>
              <span className={`text-right text-xs tabular-nums ${s.dropPct > 50 ? "text-red-600" : "text-slate-500"}`}>
                {s.dropPct > 0 ? `-${s.dropPct}%` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-400 mt-4">Drop-off % is relative to the previous stage. Filter by country to see regional variations.</p>
    </div>
  );
}

// ── Duplicate Candidates Panel ───────────────────────────────────────
// Shows groups of candidates that share aadhaar / phone / email, with a
// Merge button per group. Protects the downstream funnel analytics from
// inflation caused by agencies re-uploading the same person.
function DuplicatesPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/admin/oversight/duplicate-candidates"],
    queryFn: () => fetchJson("/api/v1/admin/oversight/duplicate-candidates"),
  });
  const groups: any[] = res?.data ?? [];

  const merge = useMutation({
    mutationFn: async ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) => {
      const r = await fetch("/api/v1/admin/oversight/candidates/merge", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ primaryId, secondaryId }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message ?? "Merge failed");
      return j.data;
    },
    onSuccess: (data) => {
      toast({ title: "Merged", description: `Migrated ${data?.mergedApplications ?? 0} applications` });
      qc.invalidateQueries({ queryKey: ["/api/v1/admin/oversight/duplicate-candidates"] });
    },
    onError: (e: any) => toast({ title: "Couldn't merge", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600" /> Duplicate candidates
      </h3>
      <p className="text-xs text-slate-500 mb-4">Groups of candidate records sharing an Aadhaar / phone / email. Merging consolidates applications under the <strong>oldest</strong> record. Irreversible.</p>
      {isLoading ? <Skeleton className="h-40 w-full" /> : groups.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No duplicates detected. Nice — the data is clean.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g, gi) => {
            const primary = g.candidates[0];
            return (
              <div key={`${g.match_type}-${gi}`} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs">
                    <Badge variant="outline" className="capitalize mr-2">{g.match_type}</Badge>
                    <span className="font-mono text-slate-500">{g.match_value || "—"}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{g.candidates.length} records</span>
                </div>
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-slate-400">
                    <tr><th className="text-left py-1">Keep?</th><th className="text-left py-1">Name</th><th className="text-left py-1">Email</th><th className="text-left py-1">Phone</th><th className="text-left py-1">Created</th><th className="text-left py-1"></th></tr>
                  </thead>
                  <tbody>
                    {g.candidates.map((c: any, i: number) => (
                      <tr key={c.id} className="border-t border-slate-100">
                        <td className="py-1.5 pr-2">{i === 0 ? <Badge className="bg-emerald-100 text-emerald-700">primary</Badge> : null}</td>
                        <td className="py-1.5 pr-2 font-medium">{c.fullName}</td>
                        <td className="py-1.5 pr-2 text-slate-500">{c.email}</td>
                        <td className="py-1.5 pr-2 text-slate-500">{c.phone}</td>
                        <td className="py-1.5 pr-2 text-slate-400">{c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="py-1.5">
                          {i > 0 && (
                            <Button size="sm" variant="outline" disabled={merge.isPending}
                              onClick={() => {
                                if (confirm(`Merge "${c.fullName}" into "${primary.fullName}"?\n\nApplications are reassigned to the primary record; the duplicate candidate row is deleted. This cannot be undone.`)) {
                                  merge.mutate({ primaryId: primary.id, secondaryId: c.id });
                                }
                              }}
                              className="text-[11px] border-red-200 text-red-700 hover:bg-red-50">
                              Merge into primary
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Country Info Admin Panel ─────────────────────────────────────────
function CountryInfoAdminPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/content/countries"],
    queryFn: () => fetchJson("/api/v1/content/countries"),
  });
  const countries: any[] = res?.data ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const current = countries.find((c) => c.code === selected) ?? countries[0];
  const [draft, setDraft] = useState<any>(null);

  // Sync draft when selection changes
  React.useEffect(() => { if (current) setDraft({ ...current }); }, [current?.code]);

  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/v1/content/countries/${draft.code}`, {
        method: "PUT", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message ?? "Save failed");
      return j.data;
    },
    onSuccess: () => {
      toast({ title: "Country info saved" });
      qc.invalidateQueries({ queryKey: ["/api/v1/content/countries"] });
    },
    onError: (e: any) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  const FIELDS: { key: string; label: string; long?: boolean }[] = [
    { key: "name", label: "Name" },
    { key: "embassyPhone", label: "Embassy phone" },
    { key: "embassyEmail", label: "Embassy email" },
    { key: "embassyAddress", label: "Embassy address" },
    { key: "embassyWebsite", label: "Embassy website" },
    { key: "visaTimelineDays", label: "Visa timeline (days)" },
    { key: "minWageNote", label: "Wage & pay notes", long: true },
    { key: "laborLawSummary", label: "Labor law summary", long: true },
    { key: "costOfLivingNote", label: "Cost of living vs Himachal", long: true },
    { key: "climateNote", label: "Climate & work hours", long: true },
    { key: "entryRequirements", label: "Entry requirements", long: true },
    { key: "emergencyContact", label: "Emergency contacts", long: true },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <Globe className="w-4 h-4 text-blue-600" /> Country reference info
      </h3>
      <p className="text-xs text-slate-500 mb-4">Edit the per-country card candidates see on every overseas job (embassy contact, visa timeline, labor law, cost of living, climate, emergency contacts).</p>
      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        <div className="grid md:grid-cols-[200px_1fr] gap-4">
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {countries.map((c) => (
              <button key={c.code} onClick={() => setSelected(c.code)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${current?.code === c.code ? "bg-blue-50 text-blue-900 font-semibold" : "hover:bg-slate-50 text-slate-700"}`}>
                <span className="font-mono text-[10px] text-slate-400 mr-2">{c.code}</span>{c.name}
              </button>
            ))}
          </div>
          {draft && (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Editing: {draft.code}</div>
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-[11px] font-medium text-slate-600">{f.label}</label>
                  {f.long
                    ? <Textarea value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className="text-sm" rows={2} />
                    : <Input value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: f.key === "visaTimelineDays" ? (parseInt(e.target.value) || 0) : e.target.value })} className="text-sm h-9" />}
                </div>
              ))}
              <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {save.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                Save changes
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Fraud / Anomaly Watchlist ────────────────────────────────────────
function FraudWatchlistPanel() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/admin/oversight/fraud-watchlist"],
    queryFn: () => fetchJson("/api/v1/admin/oversight/fraud-watchlist"),
  });
  const data = res?.data ?? { recentReports: [], flaggedAgencies: [] };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-600" /> Recent fraud reports
        </h3>
        {isLoading ? <Skeleton className="h-24 w-full" /> : data.recentReports.length === 0 ? (
          <p className="text-sm text-slate-400">No fraud reports received.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recentReports.map((r: any) => (
              <div key={r.id} className="py-2.5 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{r.subject}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{r.description}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      by {r.username ?? "—"} · reason: {r.metadata?.reason ?? "—"} · {r.metadata?.jobId ? `job ${r.metadata.jobId.slice(0, 8)}…` : ""}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize text-[10px]">{r.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-600" /> Agencies with grievance spike (last 30 days)
        </h3>
        {data.flaggedAgencies.length === 0 ? (
          <p className="text-sm text-slate-400">No agencies flagged. ≥ 3 grievances in 30 days triggers a listing.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left py-2 px-2">Agency</th>
                <th className="text-left py-2 px-2">License</th>
                <th className="text-right py-2 px-2">Grievances 30d</th>
              </tr>
            </thead>
            <tbody>
              {data.flaggedAgencies.map((a: any) => (
                <tr key={a.agency_id} className="border-b border-slate-100">
                  <td className="py-2 px-2 font-semibold">{a.agency_name}</td>
                  <td className="py-2 px-2 text-xs font-mono text-slate-500">{a.license_number}</td>
                  <td className="py-2 px-2 text-right font-bold text-red-700 tabular-nums">{a.grievance_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Third-Party Integrations Panel ───────────────────────────────────
// One card per integration; standard form fields per provider type. Secrets
// never leave the server — the API returns only "secretFieldsPresent" flags
// so the form can show a "••••• (saved)" placeholder and preserve the field
// when the admin edits everything else.
// Field labels are provider-aware: different vendors call the same concept by
// different names (Twilio "Account SID" vs MSG91 "Authkey" vs Gupshup "User
// ID"). An admin comparing the form to the vendor's dashboard should see the
// vendor's own wording — generic labels ("API key / authkey") confused more
// than they helped (Twilio has no "API key" at all).
//
// Structure: INTEGRATION_META[id].fieldLabels[providerType || "_default"][key]
// The "_default" bucket is a last-resort fallback for providers we haven't
// given dedicated labels to yet.
// Known-good host/port defaults per email provider — pre-populated when the
// admin picks a provider from the dropdown so they can skip typing the host
// from memory. Never overwrites values the admin already entered.
const EMAIL_PRESETS: Record<string, { host?: string; port?: number; secure?: boolean }> = {
  smtp2go:     { host: "mail.smtp2go.com",           port: 2525, secure: false },
  mailtrap:    { host: "sandbox.smtp.mailtrap.io",   port: 2525, secure: false },
  brevo:       { host: "smtp-relay.brevo.com",       port: 587,  secure: false },
  sendgrid:    { host: "smtp.sendgrid.net",          port: 587,  secure: false },
  ses:         { host: "email-smtp.us-east-1.amazonaws.com", port: 587, secure: false },
  mailgun:     { host: "smtp.mailgun.org",           port: 587,  secure: false },
  gmail:       { host: "smtp.gmail.com",             port: 587,  secure: false },
};

const INTEGRATION_META: Record<string, {
  label: string; subtitle: string; Icon: any; color: string;
  providerTypes: { value: string; label: string }[];
  fieldLabels: Record<string, Record<string, string>>;
  helpByProviderType?: Record<string, string>;
}> = {
  email: {
    label: "Email gateway", subtitle: "SMTP for OTPs, password resets, status emails.",
    Icon: Mail, color: "from-blue-500 to-blue-600",
    providerTypes: [
      { value: "smtp", label: "Generic SMTP" },
      { value: "smtp2go", label: "SMTP2GO (1 000 free / month)" },
      { value: "mailtrap", label: "Mailtrap (dev/UAT sandbox)" },
      { value: "brevo", label: "Brevo (ex-Sendinblue, 300 free / day)" },
      { value: "sendgrid", label: "SendGrid (SMTP relay)" },
      { value: "sendgrid-api", label: "SendGrid (HTTP API)" },
      { value: "ses", label: "Amazon SES (SMTP)" },
      { value: "mailgun", label: "Mailgun (SMTP)" },
      { value: "gmail", label: "Gmail (app password)" },
    ],
    fieldLabels: {
      _default:    { host: "SMTP host", port: "SMTP port", user: "SMTP username", from: "From address", secure: "TLS on connect (port 465)", pass: "SMTP password / API key" },
      smtp2go:     { host: "SMTP host (mail.smtp2go.com)", port: "SMTP port (2525 or 587)", user: "SMTP username", from: "From address (sender)", secure: "TLS on connect (leave off for 2525/587)", pass: "SMTP password" },
      mailtrap:    { host: "SMTP host (sandbox.smtp.mailtrap.io)", port: "SMTP port (2525 / 587 / 465)", user: "Mailtrap username", from: "Any address (mails land in inbox, not delivered)", secure: "TLS on connect", pass: "Mailtrap password" },
      brevo:       { host: "SMTP host (smtp-relay.brevo.com)", port: "SMTP port (587)", user: "Brevo login email", from: "Sender address (must be verified)", secure: "TLS on connect (leave off — port 587 STARTTLS)", pass: "SMTP key from Brevo dashboard" },
      gmail:       { host: "SMTP host (smtp.gmail.com)", port: "SMTP port (587)", user: "your.name@gmail.com", from: "your.name@gmail.com", secure: "TLS on connect (leave off for 587)", pass: "16-char app password (not your Google password)" },
    },
    helpByProviderType: {
      smtp2go:     "Sign up at smtp2go.com, go to Sending → SMTP Users, click Add SMTP user — that gives you a username + password. Host is mail.smtp2go.com, port 2525 (or 587 if your network blocks 2525). Free tier: 1,000 emails / month, no card required.",
      mailtrap:    "Sign up at mailtrap.io → create an Email Testing inbox → open 'SMTP Settings' dropdown → pick Nodemailer integration. Everything goes to the Mailtrap inbox (nothing delivered to real recipients) — perfect for UAT.",
      brevo:       "Sign up at brevo.com → left nav 'SMTP & API' → SMTP tab → Generate a new SMTP key. Use your Brevo login email as the SMTP username and the generated key as the password. Free tier: 300 emails / day.",
      sendgrid:    "From SendGrid dashboard: Settings → API Keys → Create API Key with 'Mail Send' permission. SMTP user is literally the string 'apikey' and the password is the API key value. Host: smtp.sendgrid.net, port 587.",
      ses:         "Amazon SES → Create SMTP credentials (different from AWS Access keys). Region-specific hosts like email-smtp.us-east-1.amazonaws.com. Port 587.",
      mailgun:     "Mailgun → Sending → Domain settings → SMTP credentials. Host is smtp.mailgun.org (or smtp.eu.mailgun.org for EU), port 587.",
      gmail:       "Needs 2FA on the Google account, then: myaccount.google.com/apppasswords → generate 16-char app password (NOT your Google login). Delivery is subject to Google's anti-spam heuristics — fine for dev, flaky for production.",
      smtp:        "Any RFC-compliant SMTP server: enter host, port, user, pass, from.",
    },
  },
  sms: {
    label: "SMS gateway", subtitle: "OTP and notification SMS delivery.",
    Icon: Phone, color: "from-emerald-500 to-emerald-600",
    providerTypes: [
      { value: "mock", label: "Mock / dev (logs to console)" },
      { value: "msg91", label: "MSG91 (India)" },
      { value: "twilio", label: "Twilio" },
      { value: "gupshup", label: "Gupshup Enterprise" },
      { value: "nic", label: "NIC SMS (HP Govt)" },
    ],
    fieldLabels: {
      twilio:  { accountSid: "Account SID", from: "Twilio phone number (From)", endpoint: "Endpoint override (optional)", authToken: "Auth Token" },
      msg91:   { authkey: "Authkey", flowId: "Flow ID (template)", senderId: "Sender ID (6 chars)", endpoint: "Endpoint override (optional)", apiKey: "API key" },
      gupshup: { userId: "User ID", senderId: "Sender mask", password: "Password / API key" },
      nic:     { endpoint: "NIC gateway endpoint", user: "Username", senderId: "Sender ID", password: "Password" },
      mock:    { },
      _default:{ senderId: "Sender ID / Short code", endpoint: "Endpoint", apiKey: "API key", apiSecret: "API secret" },
    },
    helpByProviderType: {
      twilio: "From your Twilio Console: Account SID + Auth Token on the home page; 'My Twilio phone number' under Phone Numbers → Manage. Free-trial accounts can only SMS verified numbers.",
      msg91:  "Authkey from MSG91 Dashboard → API → Authkey. Flow ID is the template id from Flow Builder.",
      gupshup:"User ID + password from the Gupshup Enterprise dashboard. Sender mask must match a pre-approved DLT header.",
      nic:    "HP NIC provisions the endpoint + credentials after DoT registration — contact HPSEDC IT for values.",
      mock:   "Logs SMS to the server console instead of delivering. Use during dev / UAT when no real SMS is desired.",
    },
  },
  aadhaar: {
    label: "Aadhaar / UIDAI", subtitle: "eKYC identity verification at candidate registration.",
    Icon: Fingerprint, color: "from-amber-500 to-orange-600",
    providerTypes: [{ value: "uidai", label: "UIDAI Auth / eKYC" }],
    fieldLabels: { _default: { endpoint: "UIDAI endpoint", authCode: "AUA code", apiKey: "API key", licenseKey: "License key (ASA/AUA)" } },
  },
  himaccess: {
    label: "HIM Access SSO", subtitle: "Single sign-on for HP residents / staff.",
    Icon: KeyRound, color: "from-purple-500 to-purple-700",
    providerTypes: [{ value: "oauth2", label: "OAuth 2.0 / OIDC" }],
    fieldLabels: { _default: { endpoint: "Authorize URL", clientId: "Client ID", redirectUri: "Redirect URI", scope: "Scopes", clientSecret: "Client secret" } },
  },
  digilocker: {
    label: "DigiLocker", subtitle: "Pull documents (passport, certificates) from DigiLocker.",
    Icon: FolderLock, color: "from-rose-500 to-rose-600",
    providerTypes: [{ value: "oauth2", label: "DigiLocker OAuth 2.0" }],
    fieldLabels: { _default: { endpoint: "Authorize URL", clientId: "Client ID", redirectUri: "Redirect URI", scope: "Scopes", clientSecret: "Client secret" } },
  },
};

function IntegrationsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/admin/integrations"],
    queryFn: () => fetchJson("/api/v1/admin/integrations"),
  });
  const integrations: any[] = res?.data ?? [];

  async function save(id: string, body: any) {
    const r = await fetch(`/api/v1/admin/integrations/${id}`, {
      method: "PUT", credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!j.success) throw new Error(j.error?.message || "Save failed");
    await qc.invalidateQueries({ queryKey: ["/api/v1/admin/integrations"] });
    toast({ title: "Integration saved", description: "The service will pick up the new config on its next call." });
  }

  async function test(id: string, opts: { testPhone?: string; testEmail?: string }) {
    const r = await fetch(`/api/v1/admin/integrations/${id}/test`, {
      method: "POST", credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(opts),
    });
    const j = await r.json();
    await qc.invalidateQueries({ queryKey: ["/api/v1/admin/integrations"] });
    if (j.success) {
      toast({
        title: "Test passed",
        description: j.info || "Configuration is reachable.",
      });
    } else {
      toast({ title: "Test failed", description: j.error?.message || "Check the saved config", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <PlugZap className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-slate-900">Third-party integrations</h3>
            <p className="text-sm text-slate-600 mt-1">
              Configure the external services listed in the FRS. Secrets are encrypted at rest and never returned to the browser.
              Each integration accepts a fallback from environment variables for local dev; the settings saved here always take precedence in production.
            </p>
          </div>
        </div>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {integrations.map((it) => <IntegrationCard key={it.id} it={it} onSave={save} onTest={test} />)}
      </div>
    </div>
  );
}

function IntegrationCard({ it, onSave, onTest }: {
  it: any;
  onSave: (id: string, body: any) => Promise<void>;
  onTest: (id: string, opts: { testPhone?: string; testEmail?: string }) => Promise<void>;
}) {
  const meta = INTEGRATION_META[it.id];
  const { Icon } = meta;
  const [providerType, setProviderType] = useState<string>(it.providerType);
  const [enabled, setEnabled] = useState<boolean>(it.enabled);
  const [config, setConfig] = useState<Record<string, any>>(it.config || {});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [testPhone, setTestPhone] = useState<string>("");
  const [testEmail, setTestEmail] = useState<string>("");
  // When set, the ToggleConfirmDialog is open with `target` = requested state.
  // Clear on cancel / confirm.
  const [pendingToggle, setPendingToggle] = useState<{ target: boolean } | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);

  // Resolve the label for a field in the CURRENTLY-SELECTED provider's
  // terminology. Falls back to the integration's `_default` bucket and
  // finally the raw key so an unrecognised field still renders something.
  const fieldLabel = (k: string) => {
    const byProvider = meta.fieldLabels[providerType] ?? {};
    const fallback = meta.fieldLabels._default ?? {};
    return byProvider[k] ?? fallback[k] ?? k;
  };
  const secretPresent = (k: string) => it.secretFieldsPresent?.includes(k);

  // Field list is provider-aware. Backend returns fieldsByProviderType[provider]
  // so the form swaps instantly when the admin picks a different Provider —
  // no round-trip, no field keys left over from the previous provider's shape.
  const currentFields = it.fieldsByProviderType?.[providerType] ?? it.fields ?? { configFields: [], secretFields: [] };
  const helpText = meta.helpByProviderType?.[providerType];

  async function handleSave() {
    try {
      setBusy("save");
      // Any secret field with a non-empty value replaces; empty string clears;
      // missing key is preserved server-side.
      // Deliberately do NOT ship `enabled` — that field is only editable via
      // the /toggle endpoint which requires the admin's password. This keeps
      // the regular Save to config + provider + secrets.
      await onSave(it.id, { providerType, config, secrets });
      setSecrets({});
    } finally { setBusy(null); }
  }
  async function handleTest() {
    try {
      setBusy("test");
      await onTest(it.id, { testPhone: testPhone || undefined, testEmail: testEmail || undefined });
    } finally { setBusy(null); }
  }

  const statusBadge = (() => {
    if (!it.enabled) return <Badge variant="outline" className="text-slate-500">Disabled</Badge>;
    if (it.lastTestStatus === "ok") return <Badge className="bg-emerald-100 text-emerald-700">Test OK</Badge>;
    if (it.lastTestStatus === "fail") return <Badge className="bg-red-100 text-red-700">Test failed</Badge>;
    if (it.source === "env") return <Badge className="bg-amber-100 text-amber-700">Using env fallback</Badge>;
    return <Badge className="bg-blue-100 text-blue-700">Enabled</Badge>;
  })();

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className={`h-1.5 bg-gradient-to-r ${meta.color}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${meta.color} text-white flex items-center justify-center shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">{meta.label}</h4>
              <p className="text-xs text-slate-500">{meta.subtitle}</p>
            </div>
          </div>
          {statusBadge}
        </div>

        <div className="space-y-3 mt-4">
          {/* Provider type */}
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Provider</span>
            <select value={providerType} onChange={(e) => {
              const next = e.target.value;
              setProviderType(next);
              // Pre-populate well-known host/port for the picked provider when
              // those fields are empty, so the admin can jump straight to
              // username + password. Never overwrites what the admin typed.
              const preset = EMAIL_PRESETS[next];
              if (preset) {
                setConfig((prev) => ({
                  host:  prev.host  || preset.host  || "",
                  port:  prev.port  || preset.port  || "",
                  secure: prev.secure ?? preset.secure ?? false,
                  user:  prev.user  ?? "",
                  from:  prev.from  ?? "",
                  ...prev,
                }));
              }
            }}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm">
              {meta.providerTypes.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>

          {/* Enabled toggle — re-auth required for any on/off change. Disabling
              email breaks password-reset / OTP / notifications; enabling a
              misconfigured SMS gateway spams on cost. Both warrant a confirm. */}
          <div className="flex items-start gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={enabled}
                onChange={(e) => {
                  // Intercept — don't mutate local state yet. Open the dialog;
                  // it calls the toggle endpoint on confirm and then updates
                  // enabled via the onDone callback.
                  setPendingToggle({ target: e.target.checked });
                }}
                className="rounded border-slate-300" />
              <span className={`font-medium ${enabled ? "text-emerald-700" : "text-slate-500"}`}>
                {enabled ? "Enabled" : "Disabled"}
              </span>
              <span className="text-slate-500 font-normal">(the service will prefer this config over env variables)</span>
            </label>
          </div>

          {/* Per-provider help blurb (Twilio "where to find these", etc.) */}
          {helpText && (
            <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 leading-snug">
              💡 {helpText}
            </p>
          )}

          {/* Non-secret config fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {currentFields.configFields?.map((k: string) => (
              <label key={k} className="block">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">{fieldLabel(k)}</span>
                <Input value={config[k] ?? ""} onChange={(e) => setConfig({ ...config, [k]: e.target.value })}
                  className="mt-0.5 text-sm" />
              </label>
            ))}
          </div>

          {/* Secret fields */}
          {currentFields.secretFields?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 mt-2">
              {currentFields.secretFields.map((k: string) => (
                <label key={k} className="block">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-1">
                    {fieldLabel(k)}
                    {secretPresent(k) && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                  </span>
                  <Input type="password"
                    placeholder={secretPresent(k) ? "•••••••• (saved — leave blank to keep)" : "Enter value"}
                    value={secrets[k] ?? ""}
                    onChange={(e) => setSecrets({ ...secrets, [k]: e.target.value })}
                    className="mt-0.5 text-sm font-mono" />
                </label>
              ))}
            </div>
          )}

          {/* Test controls */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100 flex-wrap">
            {it.id === "sms" && (
              <Input placeholder="Test phone (e.g. +919876543210)" value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="text-sm max-w-[240px]" />
            )}
            {it.id === "email" && (
              <Input placeholder="Test email (e.g. you@example.com)" value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                type="email"
                className="text-sm max-w-[260px]"
                title="Leave blank to just verify the SMTP handshake. Enter an address to send an actual test email." />
            )}
            <Button size="sm" variant="outline" onClick={handleTest}
              disabled={busy !== null}
              className="text-xs">
              {busy === "test" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <PlugZap className="w-3.5 h-3.5 mr-1" />}
              Test connection
            </Button>
            <Button size="sm" onClick={handleSave}
              disabled={busy !== null}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
              {busy === "save" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
              Save
            </Button>
            {it.lastTestedAt && (
              <span className="text-[11px] text-slate-400 ml-auto">
                Last tested {new Date(it.lastTestedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                {it.lastTestError && <span className="text-red-600"> — {String(it.lastTestError).slice(0, 80)}</span>}
              </span>
            )}
          </div>
        </div>
      </div>

      {pendingToggle && (
        <ToggleConfirmDialog
          integrationId={it.id}
          integrationLabel={meta.label}
          fromEnabled={enabled}
          toEnabled={pendingToggle.target}
          onCancel={() => setPendingToggle(null)}
          onDone={(newState) => { setEnabled(newState); setPendingToggle(null); }}
        />
      )}
    </div>
  );
}

// Re-auth prompt shown before an integration's enable/disable takes effect.
// Calls POST /admin/integrations/:id/toggle which verifies the admin's own
// password, writes an audit row, and flips the flag server-side. The caller
// then syncs local `enabled` state via onDone so the UI matches the server.
function ToggleConfirmDialog({ integrationId, integrationLabel, fromEnabled, toEnabled, onCancel, onDone }: {
  integrationId: string;
  integrationLabel: string;
  fromEnabled: boolean;
  toEnabled: boolean;
  onCancel: () => void;
  onDone: (newState: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const action = toEnabled ? "Enable" : "Disable";
  const consequence = toEnabled
    ? `The app will start using this configuration live. Incoming messages (OTPs, notifications) will route through ${integrationLabel} immediately.`
    : `The app will stop using this configuration. Depending on env fallbacks, some messages may queue or fail until re-enabled.`;

  async function confirm() {
    setError(null);
    if (!password) { setError("Password is required"); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/v1/admin/integrations/${integrationId}/toggle`, {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: toEnabled, password }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        setError(j?.error?.message || "Toggle failed");
        return;
      }
      onDone(toEnabled);
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
        <h3 className={`text-base font-bold ${toEnabled ? "text-emerald-700" : "text-red-700"}`}>
          {action} {integrationLabel}?
        </h3>
        <p className="text-sm text-slate-700 mt-1">
          Changing from <span className="font-mono font-semibold">{fromEnabled ? "ENABLED" : "DISABLED"}</span> to <span className="font-mono font-semibold">{toEnabled ? "ENABLED" : "DISABLED"}</span>.
        </p>
        <p className="text-xs text-slate-600 mt-2 bg-amber-50 border border-amber-200 rounded-md p-2 leading-snug">
          {consequence}
        </p>

        <label className="block mt-4">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Confirm with your admin password</span>
          <input type="password" value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !busy) confirm(); }}
            autoFocus
            placeholder="Your account password"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono" />
        </label>

        {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} disabled={busy}
            className="text-xs font-semibold px-3 py-2 rounded border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={confirm} disabled={busy || !password}
            className={`text-xs font-semibold px-4 py-2 rounded text-white disabled:opacity-50 ${
              toEnabled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
            }`}>
            {busy ? "Confirming…" : `${action} ${integrationLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── System Configuration Panel ───────────────────────────────────────
function SystemConfigPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/admin/settings"],
    queryFn: () => fetchJson("/api/v1/admin/settings"),
  });

  const update = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const r = await fetch(`/api/v1/admin/settings/${encodeURIComponent(key)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({} as any));
        throw new Error(err?.message || "Update failed");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/v1/admin/settings"] });
      toast({ title: "Setting saved", description: "Applied across the portal immediately." });
    },
    onError: (e: any) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600 inline" /></div>;

  const settings: any[] = res?.data ?? [];
  const byCategory = settings.reduce((m: Record<string, any[]>, s: any) => {
    (m[s.category] = m[s.category] || []).push(s);
    return m;
  }, {});
  const catMeta: Record<string, { label: string; icon: React.ReactNode; color: string; subtitle: string }> = {
    pipeline:      { label: "Applicant Pipeline",   icon: <TrendingUp className="w-5 h-5" />,    color: "from-indigo-500 to-indigo-700",   subtitle: "Control how applications move through the hiring stages." },
    rejection:     { label: "Rejection",            icon: <AlertTriangle className="w-5 h-5" />, color: "from-red-500 to-red-700",         subtitle: "Rules for rejecting and un-rejecting candidates." },
    access:        { label: "Access & Gating",      icon: <Shield className="w-5 h-5" />,        color: "from-emerald-500 to-emerald-700", subtitle: "Who can publish jobs, what needs admin approval, and agency limits." },
    notifications: { label: "Notifications & SLAs", icon: <MessageSquare className="w-5 h-5" />, color: "from-amber-500 to-orange-600",    subtitle: "When the portal alerts users and auto-escalates stale items." },
    matching:      { label: "Matching & Discovery", icon: <Settings className="w-5 h-5" />,      color: "from-purple-500 to-purple-700",   subtitle: "Tune match thresholds and the agency leaderboard formula." },
    lifecycle:     { label: "Application Lifecycle", icon: <Clock className="w-5 h-5" />,        color: "from-teal-500 to-teal-700",       subtitle: "When applications expire and who is eligible to apply." },
    uploads:       { label: "File Uploads",         icon: <FileText className="w-5 h-5" />,      color: "from-violet-500 to-violet-700",   subtitle: "Document size and type restrictions." },
    security:      { label: "Security & Sessions", icon: <Shield className="w-5 h-5" />,         color: "from-slate-700 to-slate-900",     subtitle: "Session timeouts, password policy, rate limits. Changes recommended to be reviewed with HPSEDC security." },
  };

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">System Configuration</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Change the portal's behaviour without a code deploy. Settings take effect immediately and are written to the audit log.
              Use the defaults (recommended for HPSEDC) unless a specific operational need comes up.
            </p>
          </div>
        </div>
      </div>

      {Object.keys(byCategory).map((cat) => {
        const meta = catMeta[cat] || { label: cat, icon: <Settings className="w-5 h-5" />, color: "from-slate-500 to-slate-700", subtitle: "" };
        return (
          <div key={cat} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`bg-gradient-to-r ${meta.color} text-white p-4`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">{meta.icon}</div>
                <div>
                  <h3 className="font-bold">{meta.label}</h3>
                  {meta.subtitle && <p className="text-xs text-white/80">{meta.subtitle}</p>}
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {byCategory[cat].map((s: any) => (
                <SettingRow key={s.key} spec={s} onChange={(v) => update.mutate({ key: s.key, value: v })}
                  saving={update.isPending && update.variables?.key === s.key} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SettingRow({ spec, onChange, saving }: { spec: any; onChange: (v: any) => void; saving: boolean }) {
  const [local, setLocal] = useState<any>(spec.value);
  const dirty = JSON.stringify(local) !== JSON.stringify(spec.value);

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-slate-50/60 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{spec.label}</p>
          {spec.isDefault && <Badge variant="outline" className="text-[10px] bg-slate-50">Default</Badge>}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 max-w-xl">{spec.description}</p>
        <p className="text-[10px] text-slate-400 mt-1 font-mono">{spec.key}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {spec.type === "boolean" && (
          <button
            onClick={() => onChange(!spec.value)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${spec.value ? "bg-emerald-500" : "bg-slate-300"}`}
            aria-pressed={spec.value}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${spec.value ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        )}
        {spec.type === "number" && (
          <div className="flex items-center gap-2">
            <input type="number" value={local} min={spec.min} max={spec.max}
              onChange={(e) => setLocal(Number(e.target.value))}
              className="w-20 h-9 text-sm rounded-md border border-slate-200 px-2" />
            {dirty && (
              <Button size="sm" onClick={() => onChange(local)} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
              </Button>
            )}
          </div>
        )}
        {spec.type === "string_array" && spec.options && (
          <div className="flex flex-wrap gap-1 max-w-sm justify-end">
            {spec.options.map((opt: string) => {
              const active = (local as string[])?.includes?.(opt);
              return (
                <button key={opt}
                  onClick={() => {
                    const next = active ? (local as string[]).filter((x) => x !== opt) : [...(local as string[]), opt];
                    setLocal(next);
                    onChange(next);
                  }}
                  disabled={saving}
                  className={`text-[11px] px-2 py-1 rounded border transition ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                  {opt.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, color, label, value, sub }: { icon: React.ReactNode; color: string; label: string; value: string | number; sub?: string }) {
  const lightMap: Record<string, string> = {
    "bg-blue-600": "bg-blue-50 text-blue-600",
    "bg-emerald-600": "bg-emerald-50 text-emerald-600",
    "bg-orange-500": "bg-orange-50 text-orange-600",
    "bg-purple-600": "bg-purple-50 text-purple-600",
  };
  const light = lightMap[color] || "bg-slate-50 text-slate-600";
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className={`${light} p-2 rounded-lg flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
            <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
          </div>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function DriveApprovalCard({ drive }: { drive: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/drives/${drive.id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/drives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/reports/dashboard"] });
      toast({ title: "Drive Approved" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/drives/${drive.id}/reject`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Does not meet requirements" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/drives"] });
      toast({ title: "Drive Rejected" });
    },
  });

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-gray-900">{drive.title}</h4>
          {drive.description && <p className="text-sm text-gray-500 mt-1">{drive.description}</p>}
          <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
            <span>{drive.date ? new Date(drive.date).toLocaleDateString("en-IN") : "—"}</span>
            <span>{drive.location}</span>
            {drive.expectedCandidates && <span>{drive.expectedCandidates} expected</span>}
          </div>
          {drive.targetRoles?.length > 0 && (
            <div className="flex gap-1 mt-2">
              {drive.targetRoles.map((r: string) => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

function GrievanceCard({ grievance: g }: { grievance: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resolving, setResolving] = useState(false);
  const [notes, setNotes] = useState("");

  const resolveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/grievances/${g.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", resolutionNotes: notes }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/grievances"] });
      setResolving(false);
      toast({ title: "Grievance Resolved" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/grievances/${g.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "under_review" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/grievances"] });
      toast({ title: "Marked as Under Review" });
    },
  });

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{g.subject}</h4>
          <p className="text-sm text-gray-500 mt-1">{g.description}</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className="text-xs capitalize">{g.category?.replace(/_/g, " ")}</Badge>
            <Badge className={`text-xs ${g.status === "resolved" ? "bg-emerald-600" : g.status === "under_review" ? "bg-blue-600" : "bg-orange-500"} text-white`}>
              {g.status?.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-xs text-gray-400">{g.createdAt ? new Date(g.createdAt).toLocaleDateString("en-IN") : ""}</span>
          {g.status !== "resolved" && (
            <div className="flex gap-1 mt-1">
              {g.status === "submitted" && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => reviewMutation.mutate()}>
                  Review
                </Button>
              )}
              <Button size="sm" className="bg-emerald-600 text-white text-xs h-7" onClick={() => setResolving(!resolving)}>
                Resolve
              </Button>
            </div>
          )}
        </div>
      </div>
      {resolving && (
        <div className="mt-3 p-3 border rounded-lg bg-gray-50 space-y-2">
          <textarea
            className="w-full min-h-[60px] p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Resolution notes..."
            value={notes} onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => resolveMutation.mutate()} disabled={!notes || resolveMutation.isPending}>
              Submit Resolution
            </Button>
            <Button size="sm" variant="outline" onClick={() => setResolving(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {g.resolutionNotes && (
        <div className="mt-3 bg-emerald-50 p-3 rounded text-sm">
          <p className="font-medium text-emerald-800">Resolution:</p>
          <p className="text-emerald-700">{g.resolutionNotes}</p>
        </div>
      )}
    </div>
  );
}

function PendingItem({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center justify-between p-3 ${color} border rounded-lg`}>
      <div className="flex items-center gap-2">
        <span className="text-gray-600 w-5 h-5">{icon}</span>
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>
      <Badge variant={count > 0 ? "destructive" : "secondary"}>{count}</Badge>
    </div>
  );
}

// ── Compliance Oversight Panel (MEA policy enforcement) ──────────────
function CompliancePanel() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/admin/oversight/compliance"],
    queryFn: () => fetchJson("/api/v1/admin/oversight/compliance"),
  });
  if (isLoading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600 inline" /></div>;
  const d = res?.data ?? { totals: { candidates: 0, activePlacements: 0 }, coverage: {}, riskFlags: {} };
  const cov = d.coverage;
  const risk = d.riskFlags;

  const row = (key: string, label: string, target: number = 90) => {
    const c = cov[key] || { count: 0, pct: 0 };
    const ok = c.pct >= target;
    return (
      <div key={key} className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-slate-700">{label}</p>
          <span className={`text-[10px] font-bold px-1.5 rounded ${ok ? "bg-emerald-100 text-emerald-700" : c.pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
            {c.pct}%
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{c.count}<span className="text-sm text-slate-400"> / {d.totals.candidates}</span></p>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
          <div className={`h-full ${ok ? "bg-emerald-500" : c.pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${c.pct}%` }} />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Target: {target}%</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 mt-1" />
          <div>
            <h2 className="text-xl font-bold">Compliance Oversight</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Track Emigration Act / MEA compliance across all candidates. The percentages show what portion of the candidate pool has each regulatory item recorded.
            </p>
          </div>
        </div>
      </div>

      {/* Coverage tiles */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Coverage across {d.totals.candidates} candidates</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {row("passportOnFile", "Passport on file", 80)}
          {row("ecrSet", "ECR / ECNR declared", 90)}
          {row("pccSubmitted", "PCC submitted", 60)}
          {row("medicalFit", "Medical — fit", 70)}
          {row("pdoCompleted", "PDO completed", 50)}
          {row("pbbyEnrolled", "PBBY enrolled", 50)}
          {row("ieltsRecorded", "IELTS recorded", 40)}
        </div>
      </div>

      {/* Risk flags */}
      <div className="grid md:grid-cols-2 gap-4">
        <RiskList title="Placed without PDO" icon="⚠️" severity="critical" rows={risk.placedMissingPDO ?? []} />
        <RiskList title="Placed without PBBY" icon="⚠️" severity="critical" rows={risk.placedMissingPBBY ?? []} />
        <RiskList title="Placed without passport on file" icon="🚨" severity="critical" rows={risk.placedMissingPassport ?? []} />
        <RiskList title="Passport expiring in < 6 months" icon="⏰" severity="warning" rows={risk.passportExpiringSoon ?? []} />
      </div>
    </div>
  );
}

function RiskList({ title, icon, severity, rows }: { title: string; icon: string; severity: "critical" | "warning"; rows: any[] }) {
  const border = severity === "critical" ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40";
  return (
    <div className={`rounded-xl border p-4 ${border}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-900">{icon} {title}</h4>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${severity === "critical" ? "bg-red-600 text-white" : "bg-amber-500 text-white"}`}>
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-emerald-700">✓ None flagged</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {rows.slice(0, 20).map((r: any) => (
            <div key={r.id} className="text-xs bg-white rounded px-2 py-1 border border-slate-100 flex justify-between">
              <span className="font-medium text-slate-800 truncate">{r.fullName}</span>
              {r.passportExpiry && <span className="text-slate-500 shrink-0">{new Date(r.passportExpiry).toLocaleDateString("en-IN")}</span>}
            </div>
          ))}
          {rows.length > 20 && <p className="text-[10px] text-slate-500 italic mt-1">+{rows.length - 20} more</p>}
        </div>
      )}
    </div>
  );
}

// ── Welfare SLA Monitor ──────────────────────────────────────────────
function WelfareSlaPanel() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/admin/oversight/welfare-sla"],
    queryFn: () => fetchJson("/api/v1/admin/oversight/welfare-sla"),
  });
  if (isLoading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600 inline" /></div>;
  const overdue: any[] = res?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-rose-600 to-pink-700 text-white rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 mt-1" />
          <div>
            <h2 className="text-xl font-bold">Welfare SLA Monitor</h2>
            <p className="text-sm text-rose-100 mt-1 max-w-2xl">
              30/60/90-day post-placement check-ins that are past due. MEA expects every placed candidate to be checked on at these milestones.
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-4xl font-bold">{overdue.length}</p>
            <p className="text-xs text-rose-200 uppercase tracking-wide font-semibold">overdue</p>
          </div>
        </div>
      </div>

      {overdue.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
          <p className="text-sm font-semibold text-slate-700">All welfare check-ins up to date</p>
          <p className="text-xs text-slate-500 mt-1">Every placed candidate has their due milestones recorded.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-3 py-2">Candidate</th>
                <th className="text-left px-3 py-2">Placement</th>
                <th className="text-left px-3 py-2">Country</th>
                <th className="text-center px-3 py-2">Milestone</th>
                <th className="text-center px-3 py-2">Days overdue</th>
              </tr>
            </thead>
            <tbody>
              {overdue.map((r) => (
                <tr key={`${r.placementId}-${r.milestone}`} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{r.candidateName}</td>
                  <td className="px-3 py-2 text-slate-600">{r.jobTitle} · {r.company}</td>
                  <td className="px-3 py-2 text-slate-600">{r.country}</td>
                  <td className="px-3 py-2 text-center"><Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">{r.milestone}-day</Badge></td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-bold tabular-nums ${r.daysOverdue > 30 ? "text-red-600" : r.daysOverdue > 14 ? "text-amber-600" : "text-slate-600"}`}>
                      {r.daysOverdue}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Admin user management ────────────────────────────────────────────
function UserManagementPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/admin/oversight/users"],
    queryFn: () => fetchJson("/api/v1/admin/oversight/users"),
  });
  const toggle = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/v1/admin/oversight/users/${id}/toggle-active`, { method: "PATCH" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "User updated" }); qc.invalidateQueries({ queryKey: ["/api/v1/admin/oversight/users"] }); },
  });
  if (isLoading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600 inline" /></div>;
  const rows: any[] = res?.data ?? [];

  const roleColor: Record<string, string> = {
    candidate: "bg-blue-100 text-blue-700", agent: "bg-emerald-100 text-emerald-700",
    employer: "bg-purple-100 text-purple-700", admin: "bg-red-100 text-red-700", superadmin: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" /> Users ({rows.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left py-2 px-2">Username</th>
                <th className="text-left py-2 px-2">Email</th>
                <th className="text-left py-2 px-2">Role</th>
                <th className="text-center py-2 px-2">Active</th>
                <th className="text-left py-2 px-2">Last login</th>
                <th className="text-right py-2 px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-2 px-2 font-medium text-slate-900">{u.username}</td>
                  <td className="py-2 px-2 text-slate-600">{u.email}</td>
                  <td className="py-2 px-2"><Badge className={`text-[10px] ${roleColor[u.role] || "bg-slate-100 text-slate-700"}`}>{u.role}</Badge></td>
                  <td className="py-2 px-2 text-center">
                    {u.isActive ? <CheckCircle className="w-4 h-4 text-emerald-500 inline" /> : <span className="text-red-500">Disabled</span>}
                  </td>
                  <td className="py-2 px-2 text-xs text-slate-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-IN") : "Never"}</td>
                  <td className="py-2 px-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => toggle.mutate(u.id)}>
                      {u.isActive ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Audit log viewer ─────────────────────────────────────────────────
function AuditLogPanel() {
  const [resourceType, setResourceType] = useState<string>("all");
  const [actionContains, setActionContains] = useState<string>("");
  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["/api/v1/admin/oversight/audit-log"],
    queryFn: () => fetchJson("/api/v1/admin/oversight/audit-log?limit=200"),
  });
  if (isLoading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600 inline" /></div>;
  const allRows: any[] = res?.data ?? [];
  const rows = allRows.filter((r) => {
    if (resourceType !== "all" && r.resourceType !== resourceType) return false;
    if (actionContains && !String(r.action ?? "").toLowerCase().includes(actionContains.toLowerCase())) return false;
    return true;
  });
  const resourceTypes = Array.from(new Set(allRows.map((r) => r.resourceType).filter(Boolean))).sort();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" /> Audit Log
          <span className="text-xs font-normal text-slate-500 ml-2">{rows.length} of {allRows.length} shown</span>
        </h3>
        <div className="flex items-center gap-2">
          <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 bg-white">
            <option value="all">All resources</option>
            {resourceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="text" value={actionContains} onChange={(e) => setActionContains(e.target.value)}
            placeholder="Action contains…"
            className="text-xs border border-slate-200 rounded px-2 py-1 w-40" />
          <Button size="sm" variant="outline" onClick={() => refetch()} className="h-7 text-xs">Refresh</Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          {allRows.length === 0 ? "No audit entries yet." : "No entries match the filters."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left py-2 px-2">When</th>
                <th className="text-left py-2 px-2">Who</th>
                <th className="text-left py-2 px-2">Action</th>
                <th className="text-left py-2 px-2">Resource</th>
                <th className="text-left py-2 px-2">Resource ID</th>
                <th className="text-left py-2 px-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-2 whitespace-nowrap text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                  <td className="py-2 px-2 font-medium text-slate-900">{r.username ?? "system"} <span className="text-[10px] text-slate-400">({r.userRole})</span></td>
                  <td className="py-2 px-2"><Badge variant="outline" className="text-[10px] capitalize">{r.action}</Badge></td>
                  <td className="py-2 px-2 text-slate-600 capitalize">{r.resourceType}</td>
                  <td className="py-2 px-2 font-mono text-[10px] text-slate-400 truncate max-w-[120px]">{r.resourceId}</td>
                  <td className="py-2 px-2 text-slate-500 max-w-md truncate" title={r.details ? JSON.stringify(r.details, null, 2) : ""}>
                    {(() => {
                      const d = r.details || {};
                      if (d.from && d.to) {
                        return (
                          <span>
                            <span className="font-mono text-slate-600">{d.from}</span>
                            <span className="mx-1 text-slate-400">→</span>
                            <span className="font-mono text-emerald-700">{d.to}</span>
                            {d.reason && <span className="text-slate-400"> · {String(d.reason).slice(0, 40)}</span>}
                          </span>
                        );
                      }
                      if (d.reason) return <span>Reason: {String(d.reason).slice(0, 80)}</span>;
                      const s = JSON.stringify(d);
                      return s.length > 2 ? s.slice(0, 80) : "—";
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Job Lifecycle Panel (PWS §4) ─────────────────────────────────────
function LifecyclePanel() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  async function runNow() {
    setRunning(true);
    try {
      const res = await fetch("/api/v1/admin/lifecycle/run", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || body?.message || "Failed");
      setSummary(body.data);
      toast({ title: "Lifecycle run complete",
        description: `${body.data.closedByDeadline.length + body.data.closedByStaleness.length} closed, ${body.data.nudged.length} nudged` });
    } catch (e: any) {
      toast({ title: "Run failed", description: e.message, variant: "destructive" });
    } finally { setRunning(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Job Lifecycle
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Nightly at 02:00 IST the system automatically closes jobs past their hiring deadline,
            closes stale jobs without a deadline (older than <code>job.auto_expire_days</code>),
            and nudges owners <code>job.auto_close_nudge_days_before_deadline</code> days before deadlines.
            Trigger it on demand for testing or ops.
          </p>
        </div>
        <Button onClick={runNow} disabled={running}
          className="bg-blue-600 hover:bg-blue-700 text-white">
          {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Clock className="w-4 h-4 mr-1" />}
          Run Lifecycle Now
        </Button>
      </div>

      {summary && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] uppercase text-slate-500 font-semibold">Duration</p>
            <p className="text-lg font-bold text-slate-900">{summary.durationMs} ms</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-[10px] uppercase text-red-700 font-semibold">Closed (deadline)</p>
            <p className="text-lg font-bold text-red-900">{summary.closedByDeadline.length}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] uppercase text-amber-700 font-semibold">Closed (stale)</p>
            <p className="text-lg font-bold text-amber-900">{summary.closedByStaleness.length}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-[10px] uppercase text-blue-700 font-semibold">Nudged</p>
            <p className="text-lg font-bold text-blue-900">{summary.nudged.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notification Templates Panel (PWS §5) ────────────────────────────
function NotificationTemplatesPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/admin/notification-templates"],
    queryFn: () => fetchJson("/api/v1/admin/notification-templates"),
  });
  const [editing, setEditing] = useState<any | null>(null);

  const save = useMutation({
    mutationFn: async ({ eventKey, recipientRole, title, body, hideEmployerName, enabled }: any) => {
      const r = await fetch(`/api/v1/admin/notification-templates/${encodeURIComponent(eventKey)}/${encodeURIComponent(recipientRole)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, hideEmployerName, enabled }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e?.message || "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/v1/admin/notification-templates"] });
      toast({ title: "Template saved", description: "Next event will use the new wording." });
      setEditing(null);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600 inline" /></div>;
  const templates: any[] = res?.data ?? [];
  const byEvent = templates.reduce((m: Record<string, any[]>, t: any) => {
    (m[t.eventKey] = m[t.eventKey] || []).push(t);
    return m;
  }, {});

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-600" /> Notification Templates
          <span className="text-xs font-normal text-slate-500 ml-2">
            {templates.length} variants across {Object.keys(byEvent).length} events
          </span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Every pipeline transition fires an event with templates keyed by recipient role.
          Changes take effect immediately — no restart required.
          Candidate-facing messages with <em>Hide employer name</em> on will scrub the employer's company name automatically.
        </p>
      </div>

      {Object.entries(byEvent).sort(([a], [b]) => a.localeCompare(b)).map(([event, rows]) => (
        <div key={event} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <code className="text-xs font-mono font-semibold text-slate-700">{event}</code>
          </div>
          <div className="divide-y divide-slate-100">
            {(rows as any[]).map((t) => (
              <div key={`${t.eventKey}-${t.recipientRole}`} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{t.recipientRole}</Badge>
                    {t.hideEmployerName && <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">scrub employer</Badge>}
                    {!t.enabled && <Badge className="text-[10px] bg-slate-100 text-slate-600">disabled</Badge>}
                  </div>
                  <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-wrap line-clamp-2">{t.body}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing({ ...t })}>Edit</Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {editing && (
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit template</DialogTitle>
              <DialogDescription>
                <code className="text-xs">{editing.eventKey}</code> · for <Badge variant="outline" className="text-[10px] capitalize ml-1">{editing.recipientRole}</Badge>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Title</label>
                <Input value={editing.title} maxLength={200}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Body</label>
                <Textarea value={editing.body} maxLength={2000}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  rows={4} className="mt-1 text-sm" />
                <p className="text-[10px] text-slate-400 mt-1">
                  Use <code>{`{{candidate.fullName}}`}</code>, <code>{`{{job.title}}`}</code>, <code>{`{{agent.agencyName}}`}</code>, <code>{`{{employer.companyName}}`}</code>, <code>{`{{extra.daysLeft}}`}</code> etc.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="scrub" checked={editing.hideEmployerName}
                  onChange={(e) => setEditing({ ...editing, hideEmployerName: e.target.checked })} />
                <label htmlFor="scrub" className="text-xs text-slate-600">Scrub employer company name (candidate-facing negatives)</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="enabled" checked={editing.enabled}
                  onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />
                <label htmlFor="enabled" className="text-xs text-slate-600">Enabled (turn off to silence this template)</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
