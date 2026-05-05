import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { FIELD_LIMITS } from "@/lib/reference-data";
import { useState } from "react";
import { useTranslation } from "react-i18next";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return { data: [] };
  return res.json();
}

export default function GrievancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const { t } = useTranslation();

  const { data: grievanceRes, isLoading } = useQuery({
    queryKey: ["/api/v1/grievances/my"],
    queryFn: () => fetchJson("/api/v1/grievances/my"),
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/v1/grievances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Grievance Submitted", description: "Your grievance has been recorded. You'll be notified of updates." });
      setShowForm(false);
      setCategory("");
      setSubject("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/v1/grievances/my"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const grievances = grievanceRes?.data || [];

  const statusIcon = (status: string) => {
    switch (status) {
      case "submitted": return <Clock className="w-4 h-4 text-amber-500" />;
      case "under_review": return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case "resolved": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "submitted": return "bg-amber-100 text-amber-700";
      case "under_review": return "bg-blue-100 text-blue-700";
      case "action_taken": return "bg-purple-100 text-purple-700";
      case "resolved": return "bg-emerald-100 text-emerald-700";
      case "escalated": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Please sign in</h2>
        <p className="text-gray-500 mt-2">You need to be logged in to submit or view grievances</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("grievance.title")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t("grievance.subtitle")}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> {t("grievance.newGrievance")}
        </Button>
      </div>

      {/* Submit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Submit a Grievance</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency_complaint">Agency Complaint</SelectItem>
                  <SelectItem value="application_issue">Application Issue</SelectItem>
                  <SelectItem value="technical_problem">Technical Problem</SelectItem>
                  <SelectItem value="policy_inquiry">Policy Inquiry</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <Input placeholder="Brief summary of your issue" value={subject}
                maxLength={FIELD_LIMITS.grievanceSubject}
                onChange={(e) => setSubject(e.target.value)} />
              <p className="text-[10px] text-slate-400 text-right mt-0.5">{subject.length} / {FIELD_LIMITS.grievanceSubject}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full min-h-[120px] p-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your issue in detail..."
                value={description}
                maxLength={FIELD_LIMITS.grievanceBody}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 text-right mt-0.5">{description.length} / {FIELD_LIMITS.grievanceBody}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => submitMutation.mutate({ category, subject, description })}
                disabled={!category || !subject || !description || submitMutation.isPending}
                className="bg-blue-600 text-white"
              >
                {submitMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Submitting...</> : "Submit Grievance"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Grievance List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : grievances.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-sm">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No grievances submitted</p>
          <p className="text-sm mt-1">Click "New Grievance" if you have an issue to report</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grievances.map((g: any) => (
            <div key={g.id} className="bg-white rounded-lg shadow-sm border p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {statusIcon(g.status)}
                  <div>
                    <h4 className="font-medium text-gray-900">{g.subject}</h4>
                    <p className="text-sm text-gray-500 mt-1">{g.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs capitalize">{g.category?.replace(/_/g, ' ')}</Badge>
                      <Badge className={`text-xs ${statusColor(g.status)}`}>{g.status?.replace(/_/g, ' ')}</Badge>
                      <span className="text-xs text-gray-400">{g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-IN') : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
              {g.resolutionNotes && (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 p-3 rounded text-sm">
                  <p className="font-medium text-emerald-800">Admin Resolution:</p>
                  <p className="text-emerald-700 mt-1">{g.resolutionNotes}</p>
                </div>
              )}
              {g.adminNotes && !g.resolutionNotes && (
                <div className="mt-3 bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                  <p className="font-medium text-blue-800">Admin Note:</p>
                  <p className="text-blue-700 mt-1">{g.adminNotes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
