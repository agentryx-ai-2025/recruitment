import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api } from "./api";

export function useRequireAuth() {
  const [reviewer, setReviewer] = useState<any>(undefined);
  const [, navigate] = useLocation();

  useEffect(() => {
    api.me().then(({ reviewer }) => {
      if (!reviewer) navigate("/login", { replace: true });
      else setReviewer(reviewer);
    }).catch(() => navigate("/login", { replace: true }));
  }, []);

  return { reviewer, loading: reviewer === undefined };
}
