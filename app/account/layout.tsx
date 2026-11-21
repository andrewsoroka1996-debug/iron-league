import type { ReactNode } from "react";
import AccountExperienceFrame from "../../components/account-ui/AccountExperienceFrame";
import { existingPlayerApplicationsEnabled } from "../../lib/player-account-access-policy";
import { profileApplicationsEnabled } from "../../lib/player-profile-request-server";
import "./il-account-theme.css";

/** Scoped visual wrapper; all authentication and route gates remain in existing pages and APIs. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <AccountExperienceFrame
      historicalApplicationsAvailable={existingPlayerApplicationsEnabled(
        process.env.PLAYER_ACCOUNTS_ENABLED,
        process.env.IRON_LEAGUE_EXISTING_PLAYER_APPLICATIONS_ENABLED,
      )}
      newApplicationsAvailable={profileApplicationsEnabled()}
    >
      {children}
    </AccountExperienceFrame>
  );
}
