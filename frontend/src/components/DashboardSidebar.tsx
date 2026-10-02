"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import BarChartIcon from "@mui/icons-material/BarChart";
import DescriptionIcon from "@mui/icons-material/Description";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import GridViewIcon from "@mui/icons-material/GridView";
import HistoryIcon from "@mui/icons-material/History";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import ShieldIcon from "@mui/icons-material/Shield";
import TuneIcon from "@mui/icons-material/Tune";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { logout } from "@/lib/auth";
import type { Permissions, User } from "@/lib/auth";

interface Props {
  user: User;
  permissions: Permissions;
}

interface NavLink {
  kind: "link";
  href: string;
  label: string;
  icon: ReactNode;
}

interface NavGroup {
  kind: "group";
  key: string;
  label: string;
  icon: ReactNode;
  matches: (pathname: string) => boolean;
  children: NavLink[];
}

type NavEntry = NavLink | NavGroup;

const ACTIVE_COLOR = "#2563eb";
const INACTIVE_COLOR = "#172033";

const ITEM_SX = {
  justifyContent: "flex-start",
  textTransform: "none",
  width: "100%",
  borderRadius: 2,
  color: INACTIVE_COLOR,
} as const;

const ROW_SX = {
  gap: 1.25,
  px: 1.5,
  py: 0.9,
  minHeight: 40,
} as const;

const SUB_ROW_SX = {
  gap: 1.25,
  pl: 5.5,
  pr: 1.5,
  py: 0.7,
  minHeight: 36,
  fontSize: 14,
} as const;

export default function DashboardSidebar({
  user,
  permissions,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [groupState, setGroupState] = useState<
    Record<string, boolean>
  >({});

  const handleLogout = useCallback(() => {
    logout();
    router.replace("/login");
  }, [router]);

  const entries: NavEntry[] = [
    {
      kind: "link",
      href: "/dashboard",
      label: "Dashboard",
      icon: <GridViewIcon fontSize="small" />,
    },
    {
      kind: "link",
      href: "/customers",
      label: "Customers",
      icon: <PeopleAltIcon fontSize="small" />,
    },
    {
      kind: "link",
      href: "/sales-pipeline",
      label: "Sales Pipeline",
      icon: <FilterAltIcon fontSize="small" />,
    },
    {
      kind: "link",
      href: "/documents",
      label: "Documents",
      icon: <DescriptionIcon fontSize="small" />,
    },
    {
      kind: "group",
      key: "reports",
      label: "Reports",
      icon: <BarChartIcon fontSize="small" />,
      matches: (path) => path.startsWith("/reports"),
      children: [
        {
          kind: "link",
          href: "/reports/sales",
          label: "รายงานยอดขาย",
          icon: <BarChartIcon fontSize="small" />,
        },
        {
          kind: "link",
          href: "/reports/customers",
          label: "รายงานลูกค้า",
          icon: <PeopleAltIcon fontSize="small" />,
        },
        {
          kind: "link",
          href: "/reports/sales-pipeline",
          label: "รายงาน Sales",
          icon: <FilterAltIcon fontSize="small" />,
        },
      ],
    },
    {
      kind: "group",
      key: "administration",
      label: "Administration",
      icon: <SettingsIcon fontSize="small" />,
      matches: (path) =>
        path.startsWith("/permissions") ||
        path.startsWith("/manage-pipeline") ||
        path.startsWith("/audit-logs"),
      children: [
        {
          kind: "link",
          href: "/permissions",
          label: "Permissions",
          icon: <ShieldIcon fontSize="small" />,
        },
        {
          kind: "link",
          href: "/manage-pipeline",
          label: "Management Pipeline",
          icon: <TuneIcon fontSize="small" />,
        },
        {
          kind: "link",
          href: "/audit-logs",
          label: "Audit Logs",
          icon: <HistoryIcon fontSize="small" />,
        },
      ],
    },
  ];

  function isGroupVisible(entry: NavEntry) {
    if (entry.kind === "link") {
      return true;
    }

    if (entry.key === "reports") {
      return permissions.reports;
    }

    const childVisible = entry.children.some((child) => {
      if (child.href === "/permissions") {
        return permissions.permissions;
      }

      if (child.href === "/manage-pipeline") {
        return permissions.administration;
      }

      return permissions.auditLogs;
    });

    return permissions.administration && childVisible;
  }

  function toggleGroup(key: string, defaultOpen: boolean) {
    setGroupState((current) => ({
      ...current,
      [key]: !(current[key] ?? defaultOpen),
    }));
  }

  return (
    <Box
      component="aside"
      sx={{
        width: 250,
        minHeight: "100vh",
        flexShrink: 0,
        borderRight: "1px solid #e5e7eb",
        bgcolor: "#ffffff",
        py: 2,
        px: 1.5,
        boxSizing: "border-box",
      }}
    >
      <Stack spacing={0.5}>
        {/* ==================== LOGO ==================== */}
        <Typography
          component="div"
          variant="h5"
          sx={{
            px: 1.5,
            pb: 2,
            color: "#075e54",
            fontWeight: 800,
          }}
        >
          Apex CRM
        </Typography>

        {/* ==================== USER ==================== */}
        <Box
          sx={{
            p: 2,
            mb: 1.5,
            border: "1px solid #e5e7eb",
            borderRadius: 2,
            bgcolor: "#fafafa",
          }}
        >
          <Typography
            component="div"
            sx={{
              fontWeight: 700,
            }}
          >
            {user.name}
          </Typography>

          <Typography
            component="div"
            variant="body2"
            color="text.secondary"
          >
            {user.email}
          </Typography>

          <Typography
            component="span"
            variant="caption"
            sx={{
              display: "inline-block",
              mt: 1,
              px: 1.2,
              py: 0.4,
              borderRadius: 5,
              fontWeight: 700,
              bgcolor:
                user.role === "ADMIN"
                  ? "#ffdddd"
                  : user.role === "MANAGER"
                    ? "#dceeff"
                    : "#ddf3e9",
              color:
                user.role === "ADMIN"
                  ? "#d32f2f"
                  : user.role === "MANAGER"
                    ? "#0277bd"
                    : "#075e54",
            }}
          >
            {user.role}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* ==================== MENU ==================== */}
        {entries
          .filter(isGroupVisible)
          .map((entry) => {
            if (entry.kind === "link") {
              const active = pathname === entry.href;

              return (
                <Button
                  key={entry.href}
                  component={Link}
                  href={entry.href}
                  variant="text"
                  aria-current={
                    active ? "page" : undefined
                  }
                  startIcon={entry.icon}
                  sx={{
                    ...ITEM_SX,
                    ...ROW_SX,
                    fontWeight: active ? 800 : 600,
                    color: active
                      ? ACTIVE_COLOR
                      : INACTIVE_COLOR,
                    bgcolor: active
                      ? "#eff6ff"
                      : "transparent",
                    "&:hover": {
                      bgcolor: active
                        ? "#eff6ff"
                        : "#f6f8fb",
                    },
                  }}
                >
                  {entry.label}
                </Button>
              );
            }

            const groupActive = entry.matches(pathname);
            const open =
              groupState[entry.key] ?? groupActive;

            return (
              <Box key={entry.key}>
                <Button
                  onClick={() =>
                    toggleGroup(entry.key, groupActive)
                  }
                  variant="text"
                  aria-expanded={open}
                  aria-controls={`nav-${entry.key}`}
                  startIcon={entry.icon}
                  endIcon={
                    <ExpandMoreIcon
                      fontSize="small"
                      sx={{
                        ml: "auto",
                        color: groupActive
                          ? ACTIVE_COLOR
                          : "#94a3b8",
                        transform: open
                          ? "rotate(180deg)"
                          : "none",
                        transition:
                          "transform 180ms ease",
                      }}
                    />
                  }
                  sx={{
                    ...ITEM_SX,
                    ...ROW_SX,
                    fontWeight: groupActive
                      ? 800
                      : 600,
                    color: groupActive
                      ? ACTIVE_COLOR
                      : INACTIVE_COLOR,
                    bgcolor: groupActive
                      ? "#eff6ff"
                      : "transparent",
                    "& .MuiButton-endIcon": {
                      ml: "auto",
                    },
                    "&:hover": {
                      bgcolor: groupActive
                        ? "#eff6ff"
                        : "#f6f8fb",
                    },
                  }}
                >
                  {entry.label}
                </Button>

                <Collapse
                  in={open}
                  timeout="auto"
                  unmountOnExit
                >
                  <Stack
                    id={`nav-${entry.key}`}
                    spacing={0.25}
                    sx={{ mt: 0.5 }}
                  >
                    {entry.children.map((child) => {
                      const active =
                        pathname === child.href;

                      return (
                        <Button
                          key={child.href}
                          component={Link}
                          href={child.href}
                          variant="text"
                          aria-current={
                            active ? "page" : undefined
                          }
                          startIcon={child.icon}
                          sx={{
                            ...ITEM_SX,
                            ...SUB_ROW_SX,
                            fontWeight: active
                              ? 800
                              : 500,
                            color: active
                              ? ACTIVE_COLOR
                              : "#475569",
                            bgcolor: active
                              ? "#eff6ff"
                              : "transparent",
                            "& .MuiButton-startIcon": {
                              color: active
                                ? ACTIVE_COLOR
                                : "#94a3b8",
                            },
                            "&:hover": {
                              bgcolor: active
                                ? "#eff6ff"
                                : "#f6f8fb",
                            },
                          }}
                        >
                          {child.label}
                        </Button>
                      );
                    })}
                  </Stack>
                </Collapse>
              </Box>
            );
          })}

        {/* Spacer */}
        <Box sx={{ flex: 1, minHeight: 20 }} />

        <Divider sx={{ my: 1.5 }} />

        {/* ==================== LOGOUT ==================== */}
        <Button
          color="error"
          onClick={handleLogout}
          variant="text"
          sx={{
            ...ITEM_SX,
            ...ROW_SX,
            fontWeight: 600,
          }}
        >
          Logout
        </Button>
      </Stack>
    </Box>
  );
}