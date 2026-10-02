"use client";

import { useCallback, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useRouter } from "next/navigation";
import Link from "next/link";

import DashboardSidebar from "@/components/DashboardSidebar";

import { api, getErrorMessage } from "@/lib/api";

import { useSession } from "@/lib/useSession";

import {
  STATUS_LABELS,
} from "@/lib/types";

import type {
  Permissions,
} from "@/lib/auth";

import type { DashboardData } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, permissions, ready } = useSession();

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await api.get<DashboardData>("/dashboard");

      setData(response.data);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "ไม่สามารถโหลดข้อมูล Dashboard ได้",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    void Promise.resolve().then(() => loadDashboard());
  }, [ready, user, router, loadDashboard]);

/* =====================================================
     AUTH CHECK
     ====================================================== */

  if (!user) {
    return null;
  }

  const showSkeleton = !data;

  /* =====================================================
     DEFAULT PERMISSIONS
  ====================================================== */

  const dashboardPermissions: Permissions =
    permissions ?? {
      dashboard: true,
      customers: true,
      salesPipeline: true,
      documents: true,
      reports: true,
      administration:
        user.role === "ADMIN",
      permissions:
        user.role === "ADMIN",
      auditLogs:
        user.role === "ADMIN",
    };

  const kpis = data?.kpis;
  const stages = data?.stages ?? [];
  const recentCustomers =
    data?.recentCustomers ?? [];

  const kpiCards = [
    {
      label: "ลูกค้าทั้งหมด",
      value: kpis?.totalCustomers ?? 0,
      suffix: "ราย",
      note: `${kpis?.activeCustomers ?? 0} รายกำลังดำเนินการ`,
      noteColor: "#4f46e5",
    },
    {
      label: "ลีดใหม่",
      value: kpis?.newCustomers ?? 0,
      suffix: "ราย",
      note: "สถานะ New",
      noteColor: "#0284c7",
    },
    {
      label: "กำลังดำเนินการ",
      value: kpis?.activeCustomers ?? 0,
      suffix: "ราย",
      note: "Open + In Progress",
      noteColor: "#f59e0b",
    },
    {
      label: "มีดีล (Open Deal)",
      value: kpis?.dealCustomers ?? 0,
      suffix: "ราย",
      note: "โอกาสขายที่ปิดดีล",
      noteColor: "#16a34a",
    },
    {
      label: "อัตราปิดดีล",
      value: kpis?.conversionRate ?? 0,
      suffix: "%",
      note: "Open Deal / ลูกค้าทั้งหมด",
      noteColor: "#10b981",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "#f5f7fa",
      }}
    >
      {/* =================================================
          SIDEBAR
      ================================================== */}

      <DashboardSidebar
        user={user}
        permissions={dashboardPermissions}
      />

      {/* =================================================
          MAIN CONTENT
      ================================================== */}

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: {
            xs: 2,
            md: 4,
          },
        }}
      >
        {/* =================================================
            HEADER
        ================================================== */}

        <Box sx={{ mb: 3 }}>
          <Typography
            component="div"
            variant="body2"
            color="primary"
            sx={{
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            ● OPERATIONAL INTELLIGENCE
          </Typography>

          <Typography
            component="h1"
            variant="h3"
            sx={{
              mt: 1,
              fontWeight: 800,
              color: "#172033",
            }}
          >
            CRM Executive & Sales Overview
          </Typography>

          <Typography
            component="div"
            variant="body1"
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            ข้อมูลดึงมาจาก API แบบ Real-time
            พร้อมสิทธิ์การเข้าถึงตาม Role
          </Typography>
        </Box>

        {/* =================================================
            DATE + REFRESH
        ================================================== */}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mb: 3,
            flexWrap: "wrap",
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              px: 2,
              py: 1,
              border: "1px solid #d7dee8",
              borderRadius: 2,
              bgcolor: "#ffffff",
            }}
          >
            <Typography
              component="span"
              variant="body2"
              sx={{
                fontWeight: 700,
              }}
            >
              📅 วันที่:{" "}
              {new Date().toLocaleDateString(
                "th-TH",
              )}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            disabled={loading}
            onClick={() => void loadDashboard()}
            sx={{ textTransform: "none" }}
          >
            {loading
              ? "กำลังโหลด..."
              : "รีเฟรชข้อมูล"}
          </Button>
        </Box>

        {/* =================================================
            ERROR
        ================================================== */}

        {error && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 2,
              border: "1px solid #fecaca",
              bgcolor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography
              component="span"
              variant="body2"
              sx={{ color: "#b91c1c", fontWeight: 700 }}
            >
              {error}
            </Typography>

            <Button
              size="small"
              variant="contained"
              onClick={() => void loadDashboard()}
              sx={{ textTransform: "none" }}
            >
              ลองใหม่
            </Button>
          </Box>
        )}

        {/* =================================================
            KPI CARDS
        ================================================== */}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              xl: "repeat(5, 1fr)",
            },
            gap: 2,
            mb: 3,
          }}
        >
          {kpiCards.map((card) => (
            <Card
              key={card.label}
              sx={{
                border: "1px solid #e1e7ef",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <CardContent>
                {showSkeleton ? (
                  <>
                    <Skeleton width="55%" />
                    <Skeleton
                      width="40%"
                      height={44}
                      sx={{ mt: 1 }}
                    />
                    <Skeleton
                      width="70%"
                      sx={{ mt: 1 }}
                    />
                  </>
                ) : (
                  <>
                    <Typography
                      component="div"
                      variant="body2"
                      color="text.secondary"
                    >
                      {card.label}
                    </Typography>

                    <Typography
                      component="div"
                      variant="h4"
                      sx={{
                        mt: 1,
                        fontWeight: 800,
                        color: "#172033",
                      }}
                    >
                      {card.value.toLocaleString(
                        "th-TH",
                      )}
                      <Typography
                        component="span"
                        variant="body1"
                        sx={{
                          ml: 0.5,
                          fontWeight: 600,
                          color: "#64748b",
                        }}
                      >
                        {card.suffix}
                      </Typography>
                    </Typography>

                    <Typography
                      component="div"
                      variant="body2"
                      sx={{
                        mt: 1,
                        color: card.noteColor,
                        fontWeight: 700,
                      }}
                    >
                      {card.note}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* =================================================
            SALES PIPELINE
        ================================================== */}

        {dashboardPermissions.salesPipeline && (
          <Card
            sx={{
              mb: 3,
              border: "1px solid #dfe5ed",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Box>
                  <Typography
                    component="h2"
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      mb: 0.5,
                    }}
                  >
                    Sales Pipeline Funnel & Stage
                    Analysis
                  </Typography>

                  <Typography
                    component="div"
                    variant="body2"
                    color="text.secondary"
                  >
                    จำนวนลูกค้าแต่ละสถานะจากฐานข้อมูล
                  </Typography>
                </Box>

                <Box
                  sx={{
                    px: 1.5,
                    py: 0.7,
                    borderRadius: 2,
                    bgcolor: "#f3f4f6",
                  }}
                >
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    Standard Funnel v3
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                    xl: "repeat(6, 1fr)",
                  },
                  gap: 1.5,
                  mt: 3,
                }}
              >
                {showSkeleton
                  ? Array.from({
                      length: 6,
                    }).map((_, index) => (
                      <Box
                        key={`stage-skeleton-${index}`}
                        sx={{
                          p: 2,
                          border:
                            "1px solid #e6ebf1",
                          borderRadius: 2,
                          bgcolor: "#f8fafc",
                        }}
                      >
                        <Skeleton
                          width="60%"
                          sx={{ mx: "auto" }}
                        />
                        <Skeleton
                          width="40%"
                          height={36}
                          sx={{
                            mt: 1,
                            mx: "auto",
                          }}
                        />
                        <Skeleton
                          width="70%"
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    ))
                  : stages.map((stage, index) => {
                  const previous =
                    stages[index - 1];

                  const conversion =
                    previous &&
                    previous.count > 0
                      ? Math.round(
                          (stage.count /
                            previous.count) *
                            100,
                        )
                      : 100;

                  return (
                    <Box
                      key={stage.stage}
                      sx={{
                        p: 2,
                        border:
                          "1px solid #e6ebf1",
                        borderRadius: 2,
                        bgcolor: "#f8fafc",
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        component="div"
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontWeight: 700,
                        }}
                      >
                        {stage.stage}
                      </Typography>

                      <Typography
                        component="div"
                        variant="h5"
                        sx={{
                          mt: 1,
                          fontWeight: 800,
                        }}
                      >
                        {stage.count}
                      </Typography>

                      <Typography
                        component="div"
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.5,
                        }}
                      >
                        {STATUS_LABELS[
                          stage.status
                        ] ?? stage.status}
                      </Typography>

                      <Divider sx={{ my: 1.5 }} />

                      <Typography
                        component="span"
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: "#0284c7",
                        }}
                      >
                        {index === 0
                          ? "Inflow 100%"
                          : `Conv. ${conversion}%`}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* =================================================
            BOTTOM AREA
        ================================================== */}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: "2fr 1fr",
            },
            gap: 2,
          }}
        >
          {/* Recent Customers */}

          <Card
            sx={{
              border: "1px solid #dfe5ed",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                component="h2"
                variant="h5"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                }}
              >
                Recent Customers
              </Typography>

              {showSkeleton ? (
                <Stack spacing={2}>
                  {Array.from({
                    length: 3,
                  }).map((_, index) => (
                    <Skeleton
                      key={`customer-skeleton-${index}`}
                      variant="rounded"
                      height={72}
                    />
                  ))}
                </Stack>
              ) : recentCustomers.length === 0 ? (
                <Typography
                  component="div"
                  variant="body2"
                  color="text.secondary"
                >
                  ยังไม่มีข้อมูลลูกค้าในระบบ
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {recentCustomers.map(
                    (customer) => (
                      <Box
                        key={customer.customerId}
                        sx={{
                          p: 2,
                          border:
                            "1px solid #e5e7eb",
                          borderRadius: 2,
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 2,
                          flexWrap: "wrap",
                        }}
                      >
                        <Box>
                          <Typography
                            component="div"
                            sx={{
                              fontWeight: 700,
                            }}
                          >
                            {customer.companyName}
                          </Typography>

                          <Typography
                            component="div"
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mt: 0.5,
                            }}
                          >
                            {customer.email ||
                              customer.phone ||
                              "-"}
                          </Typography>

                          <Typography
                            component="div"
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "block",
                              mt: 0.5,
                            }}
                          >
                            เพิ่มเมื่อ:{" "}
                            {new Date(
                              customer.createdAt,
                            ).toLocaleDateString(
                              "th-TH",
                            )}
                          </Typography>
                        </Box>

                        <Chip
                          size="small"
                          label={
                            STATUS_LABELS[
                              customer.status
                            ] ?? customer.status
                          }
                          sx={{
                            alignSelf:
                              "flex-start",
                            fontWeight: 700,
                          }}
                        />
                      </Box>
                    ),
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}

          <Card
            sx={{
              border: "1px solid #dfe5ed",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                component="h2"
                variant="h6"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                }}
              >
                Quick Actions
              </Typography>

              <Stack spacing={1.5}>
                {dashboardPermissions.customers && (
                  <Button
                    component={Link}
                    href="/customers"
                    variant="outlined"
                    fullWidth
                    sx={{
                      justifyContent:
                        "flex-start",
                      textTransform: "none",
                    }}
                  >
                    + New Customer
                  </Button>
                )}

                {dashboardPermissions.documents && (
                  <Button
                    component={Link}
                    href="/documents"
                    variant="outlined"
                    fullWidth
                    sx={{
                      justifyContent:
                        "flex-start",
                      textTransform: "none",
                    }}
                  >
                    + New Quote
                  </Button>
                )}

                {dashboardPermissions.salesPipeline && (
                  <Button
                    component={Link}
                    href="/sales-pipeline"
                    variant="outlined"
                    fullWidth
                    sx={{
                      justifyContent:
                        "flex-start",
                      textTransform: "none",
                    }}
                  >
                    + New Activity
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* =================================================
            ROLE INFORMATION
        ================================================== */}

        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: "#eef6ff",
            border: "1px solid #cfe5ff",
          }}
        >
          <Typography
            component="div"
            variant="body2"
            sx={{
              fontWeight: 700,
              color: "#075985",
            }}
          >
            Current Role: {user.role}
          </Typography>

          <Typography
            component="div"
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            เมนูและฟังก์ชันบน Dashboard
            จะแสดงตาม Permission ของ Role นี้
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
