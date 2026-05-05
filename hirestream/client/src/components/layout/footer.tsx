import { Globe } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export function Footer() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-900 text-white mt-16">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-8 2xl:px-12 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold">HireStream</h3>
              <span className="text-[10px] font-mono text-gray-500 bg-gray-800/60 border border-gray-700 rounded px-1.5 py-0.5" title="Staging build — next UAT drop v0.8.0">
                v0.4.0
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              HPSEDC Overseas Placement Portal. A Government of Himachal Pradesh initiative for safe, regulated international employment.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-gray-200">{t("footer.forCandidates")}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><button onClick={() => setLocation("/auth")} className="hover:text-white transition-colors">{t("footer.register")}</button></li>
              <li><button onClick={() => setLocation("/")} className="hover:text-white transition-colors">{t("footer.browseJobs")}</button></li>
              <li><button onClick={() => setLocation("/")} className="hover:text-white transition-colors">{t("footer.trackApplications")}</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-gray-200">{t("footer.forAgencies")}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><button onClick={() => setLocation("/auth")} className="hover:text-white transition-colors">{t("footer.registerAgency")}</button></li>
              <li><button onClick={() => setLocation("/")} className="hover:text-white transition-colors">{t("footer.postJobs")}</button></li>
              <li><button onClick={() => setLocation("/")} className="hover:text-white transition-colors">{t("footer.manageDrives")}</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-gray-200">{t("footer.support")}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><button onClick={() => setLocation("/faq")} className="hover:text-white transition-colors">{t("nav.faq")}</button></li>
              <li><button onClick={() => setLocation("/grievances")} className="hover:text-white transition-colors">{t("footer.fileGrievance")}</button></li>
              <li><button onClick={() => setLocation("/")} className="hover:text-white transition-colors">{t("footer.contactHPSEDC")}</button></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-500 text-xs">
          <p>&copy; {new Date().getFullYear()} {t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
