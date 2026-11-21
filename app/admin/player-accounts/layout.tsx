import type { ReactNode } from "react";
import AccountExperienceFrame from "../../../components/account-ui/AccountExperienceFrame";
import "../../account/il-account-theme.css";

/** Scoped account-administration visuals. Existing password and Discord guards are unchanged. */
export default function PlayerAccountAdminLayout({ children }: { children: ReactNode }) {
  return <AccountExperienceFrame admin>{children}</AccountExperienceFrame>;
}
