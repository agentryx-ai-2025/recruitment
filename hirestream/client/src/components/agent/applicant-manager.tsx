import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Eye, Loader2, User, MapPin, Star, CheckCircle, Clock,
  Calendar, Briefcase, ChevronDown, Users
} from "lucide-react";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return { data: [] };
  return res.json();
}

const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted", color: "bg-blue-100 text-blue-700" },
  { value: "reviewed", label: "Reviewed", color: "bg-amber-100 text-amber-700" },
  { value: "shortlisted", label: "Shortlisted", color: "bg-purple-100 text-purple-700" },
  { value: "interview_scheduled", label: "Interview Scheduled", color: "bg-cyan-100 text-cyan-700" },
  { value: "selected", label: "Selected", color: "bg-emerald-100 text-emerald-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
];

export function ApplicantManager({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applicantsRes, isLoading } = useQuery({
    queryKey: ["/api/v1/jobs", jobId, "applicants"],
    queryFn: () => fetchJson(`/api/v1/jobs/${jobId}/applicants`),
    enabled: open,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: string }) => {
      const res = await fetch(`/api/v1/candidates/applications/${applicationId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/jobs", jobId, "applicants"] });
      toast({ title: "Status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const res = await fetch("/api/v1/applications/bulk-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      if (!res.ok) throw new Error("Failed to bulk update");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/jobs", jobId, "applicants"] });
      setSelectedIds(new Set());
      setBulkStatus("");
      toast({ title: `${data.data?.updated || 0} applications updated` });
    },
  });

  const applicants = applicantsRes?.data || [];

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === applicants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applicants.map((a: any) => a.applicationId)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
          <Eye className="w-3.5 h-3.5 mr-1" /> Applicants
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Applicants — {jobTitle}
            <Badge variant="secondary">{applicants.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-800">{selectedIds.size} selected</span>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-48 h-8 text-sm">
                <SelectValue placeholder="Bulk action..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!bulkStatus || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate({ ids: Array.from(selectedIds), status: bulkStatus })}
            >
              {bulkMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Apply to {selectedIds.size}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        )}

        {/* Applicant Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : applicants.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No applications yet</p>
            <p className="text-sm mt-1">Candidates will appear here when they apply</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
              <div className="col-span-1">
                <input type="checkbox" checked={selectedIds.size === applicants.length && applicants.length > 0}
                  onChange={toggleSelectAll} className="rounded" />
              </div>
              <div className="col-span-3">Candidate</div>
              <div className="col-span-2">Skills</div>
              <div className="col-span-1 text-center">Exp</div>
              <div className="col-span-1 text-center">Score</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Applied</div>
            </div>

            {/* Rows */}
            {applicants.map((app: any) => {
              const statusInfo = STATUS_OPTIONS.find(s => s.value === app.status);
              return (
                <div key={app.applicationId}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 border-t items-center hover:bg-gray-50 transition-colors ${selectedIds.has(app.applicationId) ? 'bg-blue-50' : ''}`}
                >
                  <div className="col-span-1">
                    <input type="checkbox" checked={selectedIds.has(app.applicationId)}
                      onChange={() => toggleSelect(app.applicationId)} className="rounded" />
                  </div>
                  <div className="col-span-3">
                    <p className="font-medium text-sm text-gray-900">{app.candidate?.fullName || "—"}</p>
                    <p className="text-xs text-gray-500">{app.candidate?.email}</p>
                    {app.candidate?.location && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{app.candidate.location}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <div className="flex flex-wrap gap-1">
                      {(app.candidate?.skills || []).slice(0, 3).map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-1 text-center text-sm text-gray-600">
                    {app.candidate?.experience || 0}yr
                  </div>
                  <div className="col-span-1 text-center">
                    <Badge className={`${app.matchScore >= 80 ? 'bg-emerald-600' : app.matchScore >= 60 ? 'bg-amber-500' : 'bg-gray-500'} text-white text-xs`}>
                      {app.matchScore}%
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <Select
                      value={app.status}
                      onValueChange={(val) => statusMutation.mutate({ applicationId: app.applicationId, status: val })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${s.color}`}>{s.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 text-right text-xs text-gray-400">
                    {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString("en-IN") : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary bar */}
        {applicants.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
            <span>{applicants.length} total applicants</span>
            <span>Avg match: {applicants.length > 0 ? Math.round(applicants.reduce((s: number, a: any) => s + (a.matchScore || 0), 0) / applicants.length) : 0}%</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
