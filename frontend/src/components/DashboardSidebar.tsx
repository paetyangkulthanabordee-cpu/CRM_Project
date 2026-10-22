"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import BarChartIcon from "@mui/icons-material/BarChart";
import CategoryIcon from "@mui/icons-material/Category";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import GridViewIcon from "@mui/icons-material/GridView";
import HistoryIcon from "@mui/icons-material/History";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import ShieldIcon from "@mui/icons-material/Shield";
import TuneIcon from "@mui/icons-material/Tune";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { useTranslations } from "next-intl";

import LanguageSwitcher from "@/components/LanguageSwitcher";

import { logout } from "@/lib/auth";
import type { Permissions, User } from "@/lib/auth";
import { useBreakpoint } from "@/lib/useMediaQuery";

interface Props {
  user: User;
  permissions: Permissions;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
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
const SIDEBAR_WIDTH = 250;
const COLLAPSED_WIDTH = 72;

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

/*
 * ป้ายเมนูต้องชิดซ้ายเสมอ
 * - MUI wrap label เป็น text node ตรง ๆ (ไม่มี element ครอบ)
 *   ทำให้เวลาข้อความยาวแล้ว wrap 2 บรรทัด
 *   แต่ button มี text-align: center จาก MUI
 *   ทำให้แต่ละบรรทัดถูกจัดกึ่งกลาง -> ดูเหมือนกลางแถว
 * - wrap ด้วย element ที่กำหนดเอง เพื่อคุม text-align
 *   และให้ label ยืด/หดตามช่องว่างระหว่างไอคอน
 */
const LABEL_SX = {
  flex: 1,
  minWidth: 0,
  textAlign: "left",
  overflowWrap: "break-word",
} as const;

export default function DashboardSidebar({
  user,
  permissions,
  collapsed,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const { isMobile } = useBreakpoint();

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
      label: t("dashboard"),
      icon: <GridViewIcon fontSize="small" />,
    },
    {
      kind: "link",
      href: "/customers",
      label: t("customers"),
      icon: <PeopleAltIcon fontSize="small" />,
    },
    {
      kind: "link",
      href: "/order-pipeline",
      label: t("orderPipeline"),
      icon: <FilterAltIcon fontSize="small" />,
    },
    {
      kind: "link",
      href: "/products",
      label: t("products"),
      icon: <Inventory2Icon fontSize="small" />,
    },
    {
      kind: "group",
      key: "productManagement",
      label: t("productManagement"),
      icon: <CategoryIcon fontSize="small" />,
      matches: (path) =>
        path.startsWith("/product-groups") ||
        path.startsWith("/product-units"),
      children: [
        {
          kind: "link",
          href: "/product-groups",
          label: t("productGroups"),
          icon: <CategoryIcon fontSize="small" />,
        },
        {
          kind: "link",
          href: "/product-units",
          label: t("productUnits"),
          icon: <Inventory2Icon fontSize="small" />,
        },
      ],
    },
    {
      kind: "group",
      key: "reports",
      label: t("reports"),
      icon: <BarChartIcon fontSize="small" />,
      matches: (path) => path.startsWith("/reports"),
      children: [
        {
          kind: "link",
          href: "/reports/sales",
          label: t("reportsSales"),
          icon: <BarChartIcon fontSize="small" />,
        },
        {
          kind: "link",
          href: "/reports/customers",
          label: t("reportsCustomers"),
          icon: <PeopleAltIcon fontSize="small" />,
        },
        {
          kind: "link",
          href: "/reports/order-pipeline",
          label: t("reportsOrderPipeline"),
          icon: <FilterAltIcon fontSize="small" />,
        },
      ],
    },
    {
      kind: "group",
      key: "administration",
      label: t("administration"),
      icon: <SettingsIcon fontSize="small" />,
      matches: (path) =>
        path.startsWith("/permissions") ||
        path.startsWith("/users") ||
        path.startsWith("/manage-pipeline") ||
        path.startsWith("/audit-logs"),
      children: [
        {
          kind: "link",
          href: "/permissions",
          label: t("permissions"),
          icon: <ShieldIcon fontSize="small" />,
        },
        {
          kind: "link",
          href: "/users",
          label: t("users"),
          icon: <PeopleAltIcon fontSize="small" />,
        },
        {
          kind: "link",
          href: "/manage-pipeline",
          label: t("managePipeline"),
          icon: <TuneIcon fontSize="small" />,
        },
        {
          kind: "link",
          href: "/audit-logs",
          label: t("auditLogs"),
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

    if (entry.key === "productManagement") {
      return permissions.productManagement;
    }

    const childVisible = entry.children.some((child) => {
      if (child.href === "/permissions") {
        return permissions.permissions;
      }

      if (child.href === "/users") {
        return permissions.administration;
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

  const sidebarContent = (
    <Stack spacing={0.5}>
      {/* ==================== LOGO ==================== */}
      <Typography
        component="div"
        variant="h5"
        sx={{
          px: collapsed ? 0 : 1.5,
          pb: 2,
          color: "#075e54",
          fontWeight: 800,
          textAlign: collapsed ? "center" : "left",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {collapsed ? "A" : "Apex CRM"}
      </Typography>

      {/* ==================== USER ==================== */}
      {!collapsed && (
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
      )}

      <Divider sx={{ mb: 1.5 }} />

      {/* ==================== MENU ==================== */}
      {entries
        .filter(isGroupVisible)
        .map((entry) => {
          if (entry.kind === "link") {
            const active = pathname === entry.href;

            const button = (
              <Button
                key={entry.href}
                component={Link}
                href={entry.href}
                variant="text"
                aria-current={
                  active ? "page" : undefined
                }
                startIcon={entry.icon}
                onClick={isMobile ? onCloseMobile : undefined}
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
                  ...(collapsed && {
                    justifyContent: "center",
                    px: 0,
                    minWidth: 0,
                  }),
                }}
              >
                {!collapsed && (
                  <Box component="span" sx={LABEL_SX}>
                    {entry.label}
                  </Box>
                )}
              </Button>
            );

            return collapsed ? (
              <Tooltip
                key={entry.href}
                title={entry.label}
                placement="right"
              >
                {button}
              </Tooltip>
            ) : (
              button
            );
          }

          const groupActive = entry.matches(pathname);
          const open =
            groupState[entry.key] ?? groupActive;

          const groupButton = (
            <Button
              onClick={() =>
                toggleGroup(entry.key, groupActive)
              }
              variant="text"
              aria-expanded={open}
              aria-controls={`nav-${entry.key}`}
              startIcon={entry.icon}
              endIcon={
                !collapsed ? (
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
                ) : undefined
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
                ...(collapsed && {
                  justifyContent: "center",
                  px: 0,
                  minWidth: 0,
                }),
              }}
            >
              {!collapsed && (
                <Box component="span" sx={LABEL_SX}>
                  {entry.label}
                </Box>
              )}
            </Button>
          );

          return (
            <Box key={entry.key}>
              {collapsed ? (
                <Tooltip
                  title={entry.label}
                  placement="right"
                >
                  {groupButton}
                </Tooltip>
              ) : (
                groupButton
              )}

              {!collapsed && (
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
                          onClick={
                            isMobile
                              ? onCloseMobile
                              : undefined
                          }
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
                          <Box
                            component="span"
                            sx={LABEL_SX}
                          >
                            {child.label}
                          </Box>
                        </Button>
                      );
                    })}
                  </Stack>
                </Collapse>
              )}
            </Box>
          );
        })}

      {/* Spacer */}
      <Box sx={{ flex: 1, minHeight: 20 }} />

      <Divider sx={{ my: 1.5 }} />

      {/* ==================== LANGUAGE SWITCHER ==================== */}
      <Box
        sx={{
          ...ROW_SX,
          ...(collapsed && {
            justifyContent: "center",
            px: 0,
            minWidth: 0,
          }),
        }}
      >
        <LanguageSwitcher />
      </Box>

      {/* ==================== LOGOUT ==================== */}
      <Button
        color="error"
        onClick={handleLogout}
        variant="text"
        sx={{
          ...ITEM_SX,
          ...ROW_SX,
          fontWeight: 600,
          ...(collapsed && {
            justifyContent: "center",
            px: 0,
            minWidth: 0,
          }),
        }}
      >
        {!collapsed && (
          <Box component="span" sx={LABEL_SX}>
            {t("logout")}
          </Box>
        )}
      </Button>
    </Stack>
  );

  const sidebarSx = {
    width: collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
    minHeight: "100vh",
    flexShrink: 0,
    borderRight: "1px solid #e5e7eb",
    bgcolor: "#ffffff",
    py: 2,
    px: collapsed ? 0.75 : 1.5,
    boxSizing: "border-box",
    transition: "width 200ms ease",
    overflowX: "hidden",
  };

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <Box
        component="aside"
        sx={{
          ...sidebarSx,
          display: {
            xs: "none",
            md: "block",
          },
        }}
      >
        {sidebarContent}
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        <Box sx={{ py: 2, px: 1.5 }}>
          {sidebarContent}
        </Box>
      </Drawer>


    </>
  );
}
