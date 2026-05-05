import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpCircle, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return { data: [] };
  return res.json();
}

export default function FaqPage() {
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const { t } = useTranslation();

  const { data: faqRes, isLoading } = useQuery({
    queryKey: ["/api/v1/content/faq"],
    queryFn: () => fetchJson("/api/v1/content/faq"),
  });

  const allFaqs = faqRes?.data || [];

  // Filter by search
  const filtered = search
    ? allFaqs.filter((f: any) =>
        f.question.toLowerCase().includes(search.toLowerCase()) ||
        f.answer.toLowerCase().includes(search.toLowerCase())
      )
    : allFaqs;

  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const faq of filtered) {
    const cat = faq.category || "general";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(faq);
  }

  const categoryLabels: Record<string, string> = {
    registration: "Registration & Account",
    job_application: "Job Application",
    agencies: "Recruitment Agencies",
    overseas_placement: "Overseas Placement",
    technical_support: "Technical Support",
    general: "General",
  };

  const toggle = (id: string) => {
    const next = new Set(openItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenItems(next);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <HelpCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-gray-900">{t("faq.title")}</h1>
        <p className="text-gray-500 mt-2">{t("faq.subtitle")}</p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          placeholder={t("faq.searchPlaceholder")}
          className="pl-11 h-12 text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {allFaqs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No FAQs available yet</p>
          <p className="text-sm mt-1">FAQs will be added by the administrator</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No results for "{search}"</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, faqs]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{categoryLabels[category] || category}</Badge>
                <span className="text-sm text-gray-400">{faqs.length}</span>
              </h2>
              <div className="space-y-2">
                {faqs.map((faq: any) => (
                  <div key={faq.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggle(faq.id)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                      {openItems.has(faq.id) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {openItems.has(faq.id) && (
                      <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
