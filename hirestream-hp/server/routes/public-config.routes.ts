import { Router } from "express";
import { getSetting } from "../services/settings.service";

const router = Router();

// HP-3: public (unauthenticated) capability flags. Lets the signup UI show
// only the roles this deployment opens for self-registration. Exposes ONLY
// non-sensitive capability booleans — never secrets or internal settings.
router.get("/public", async (_req, res) => {
  try {
    const [employerSelfReg, agencySelfReg, agencyMode] = await Promise.all([
      getSetting<boolean>("capability.employer_self_registration"),
      getSetting<boolean>("capability.agency_self_registration"),
      getSetting<string>("capability.agency_mode"),
    ]);
    res.json({
      success: true,
      data: {
        capabilities: {
          employerSelfRegistration: !!employerSelfReg,
          agencySelfRegistration: !!agencySelfReg,
          agencyMode: agencyMode || "single",
        },
      },
    });
  } catch {
    res.status(500).json({ success: false, error: { code: 500, message: "config unavailable" } });
  }
});

export default router;
