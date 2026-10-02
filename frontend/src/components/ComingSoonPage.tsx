"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import DashboardSidebar from "@/components/DashboardSidebar";

import { useSession } from "@/lib/useSession";

interface Props {
  title: string;
  description: string;
}

export default function ComingSoonPage({
  title,
  description,
}: Props) {
  const router = useRouter();
  const { user, permissions, ready } = useSession();

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace("/login");
    }
  }, [ready, user, router]);

  if (!user) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f5f7fa",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "#f5f7fa",
      }}
    >
      <DashboardSidebar
        user={user}
        permissions={
          permissions ?? {
            dashboard: true,
            customers: true,
            salesPipeline: true,
            documents: true,
            reports: true,
            administration: user.role === "ADMIN",
            permissions: user.role === "ADMIN",
            auditLogs: user.role === "ADMIN",
          }
        }
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          p: { xs: 2, md: 4 },
        }}
      >
        <Typography
          component="h1"
          variant="h3"
          sx={{
            fontWeight: 800,
            color: "#172033",
            mb: 3,
          }}
        >
          {title}
        </Typography>

        <Card
          sx={{
            border: "1px solid #e1e7ef",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <CardContent>
            <Typography
              component="div"
              variant="body1"
              color="text.secondary"
            >
              {description}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
