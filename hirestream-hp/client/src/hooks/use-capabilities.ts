import { useQuery } from "@tanstack/react-query";

/**
 * HP-3: client-side view of the deployment's capability flags, fetched from the
 * public (unauthenticated) config endpoint. Used to gate the signup UI and any
 * other marketplace surface to the roles this deployment actually opens.
 *
 * The fallback is the SAFE single-agency shape (employer + agency self-register
 * OFF) so that if the fetch is still loading or fails, the UI never wrongly
 * offers a disabled role. Flip the server-side capability.* settings to expand.
 */
export interface Capabilities {
  employerSelfRegistration: boolean;
  agencySelfRegistration: boolean;
  agencyMode: "single" | "marketplace";
}

const SAFE_DEFAULT: Capabilities = {
  employerSelfRegistration: false,
  agencySelfRegistration: false,
  agencyMode: "single",
};

export function useCapabilities(): { capabilities: Capabilities; isLoading: boolean } {
  const { data, isLoading } = useQuery<{ success: boolean; data: { capabilities: Capabilities } }>({
    queryKey: ["/api/v1/config/public"],
  });

  return {
    capabilities: data?.data?.capabilities ?? SAFE_DEFAULT,
    isLoading,
  };
}
