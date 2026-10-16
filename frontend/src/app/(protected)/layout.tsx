"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

import { useSession } from "@/lib/useSession";
import { useBreakpoint } from "@/lib/useMediaQuery";
import DashboardSidebar from "@/components/DashboardSidebar";

interface SidebarContextType {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const SidebarContext =
  createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error(
      "useSidebar must be used within ProtectedLayout",
    );
  }
  return context;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, ready, permissions } = useSession();
  const { isMobile } = useBreakpoint();

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace("/login");
    }
  }, [ready, user, router]);

  const effectiveCollapsed = isMobile || sidebarCollapsed;

  if (!ready) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          bgcolor: "#f5f7fa",
        }}
      >
        <CircularProgress />
        <Typography
          component="div"
          variant="body2"
          color="text.secondary"
        >
          กำลังตรวจสอบสิทธิ์การใช้งาน...
        </Typography>
      </Box>
    );
  }

  if (!user || !permissions) {
    return null;
  }

  return (
    <SidebarContext.Provider
      value={{
        collapsed: effectiveCollapsed,
        onToggleCollapse: () =>
          setSidebarCollapsed((prev) => !prev),
        mobileOpen,
        onCloseMobile: () => setMobileOpen(false),
      }}
    >
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: "#f5f7fa",
        }}
      >
        <DashboardSidebar
          user={user}
          permissions={permissions}
          collapsed={effectiveCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            component="main"
            sx={{
              flex: 1,
              minWidth: 0,
              position: "relative",
            }}
          >
            {isMobile && (
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{
                  position: "fixed",
                  top: 8,
                  left: 8,
                  zIndex: 1100,
                  bgcolor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 1,
                  "&:hover": { bgcolor: "#f6f8fb" },
                }}
                size="small"
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            )}
            {children}
          </Box>
        </Box>
      </Box>
    </SidebarContext.Provider>
  );
}
