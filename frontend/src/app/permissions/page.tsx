"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import LockIcon from "@mui/icons-material/Lock";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Snackbar from "@mui/material/Snackbar";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import DashboardSidebar from "@/components/DashboardSidebar";

import { api, getErrorMessage } from "@/lib/api";

import { updatePermissions } from "@/lib/auth";
import type { Permissions } from "@/lib/auth";

import { useSession } from "@/lib/useSession";

import type { UserRole } from "@/lib/auth";

type ModuleKey =
  | "dashboard"
  | "customers"
  | "salesPipeline"
  | "documents"
  | "reports"
  | "administration";

interface ModuleDef {
  key: ModuleKey;
  label: string;
  labelEn: string;
  hint: string;
}

const MODULES: ModuleDef[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    labelEn: "Dashboard",
    hint: "เห็นภาพรวมลูกค้าและยอดขาย",
  },
  {
    key: "customers",
    label: "Customer Database",
    labelEn: "Customer Database",
    hint: "เข้าถึงและแก้ไขข้อมูลลูกค้า",
  },
  {
    key: "salesPipeline",
    label: "Sales Pipeline",
    labelEn: "Sales Pipeline",
    hint: "จัดการขั้นตอนการขาย",
  },
  {
    key: "documents",
    label: "Documents",
    labelEn: "Quotation/Invoice/Receipt",
    hint: "ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ",
  },
  {
    key: "reports",
    label: "Reports",
    labelEn: "Reports",
    hint: "รายงานยอดขาย ลูกค้า และ Sales",
  },
  {
    key: "administration",
    label: "Administration Settings",
    labelEn: "Administration Settings",
    hint: "ตั้งค่าสิทธิ์และดู Audit Logs",
  },
];

const ROLES: {
  role: UserRole;
  editable: boolean;
}[] = [
  { role: "ADMIN", editable: false },
  { role: "MANAGER", editable: true },
  { role: "SALES", editable: true },
];

type Matrix = Record<
  string,
  Record<string, boolean>
>;

const ROLE_CHIP: Record<
  UserRole,
  { bg: string; color: string }
> = {
  ADMIN: { bg: "#fee2e2", color: "#dc2626" },
  MANAGER: { bg: "#dbeafe", color: "#1d4ed8" },
  SALES: { bg: "#dcfce7", color: "#15803d" },
};

function toSessionPermissions(
  matrix: Matrix,
  role: UserRole,
): Permissions {
  const row = matrix[role] ?? {};

  const administration = row.administration === true;

  return {
    dashboard: row.dashboard === true,
    customers: row.customers === true,
    salesPipeline: row.salesPipeline === true,
    documents: row.documents === true,
    reports: row.reports === true,
    administration,
    permissions: administration,
    auditLogs: administration,
  };
}

export default function PermissionsPage() {
  const router = useRouter();
  const { user, permissions, ready } = useSession();

  const [matrix, setMatrix] = useState<Matrix>({});
  const [baseline, setBaseline] =
    useState<Matrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canManage =
    permissions?.administration === true;

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await api.get<Matrix>("/permissions");

      setMatrix(response.data);
      setBaseline(response.data);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "ไม่สามารถโหลดข้อมูลสิทธิ์ได้",
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

    if (permissions === null) {
      return;
    }

    if (permissions.administration !== true) {
      return;
    }

    void Promise.resolve().then(() => loadMatrix());
  }, [
    ready,
    user,
    permissions,
    router,
    loadMatrix,
  ]);

  const dirty = useMemo(() => {
    if (loading) {
      return false;
    }

    return ROLES.filter((item) => item.editable).some(
      ({ role }) =>
        MODULES.some(
          (module) =>
            matrix[role]?.[module.key] !==
            baseline[role]?.[module.key],
        ),
    );
  }, [matrix, baseline, loading]);

  function toggle(
    role: UserRole,
    key: ModuleKey,
    value: boolean,
  ) {
    setMatrix((current) => ({
      ...current,
      [role]: {
        ...(current[role] ?? {}),
        [key]: value,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const payload: Matrix = {};

      for (const { role } of ROLES.filter(
        (item) => item.editable,
      )) {
        payload[role] = {
          ...(matrix[role] ?? {}),
        };
      }

      const response =
        await api.patch<Matrix>(
          "/permissions",
          payload,
        );

      setMatrix(response.data);
      setBaseline(response.data);

      if (user) {
        updatePermissions(
          toSessionPermissions(
            response.data,
            user.role,
          ),
        );
      }

      setNotice(
        "บันทึกสิทธิ์การใช้งานเรียบร้อยแล้ว (ผู้ใช้ต้อง Login ใหม่เพื่อให้มีผล)",
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "ไม่สามารถบันทึกสิทธิ์ได้",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

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
            dashboard: false,
            customers: false,
            salesPipeline: false,
            documents: false,
            reports: false,
            administration: false,
            permissions: false,
            auditLogs: false,
          }
        }
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 2, md: 4 },
        }}
      >
        {/* ==================== HEADER ==================== */}

        <Box
          sx={{
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              component="h1"
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "#075e54",
                lineHeight: 1.2,
              }}
            >
              จัดการสิทธิ์การใช้งาน
              (Permissions &amp; Roles)
            </Typography>

            <Typography
              component="div"
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#64748b",
              }}
            >
              กำหนดสิทธิ์การเข้าถึงโมดูลต่างๆ
              สำหรับ Admin, Manager และ Sales
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<LockIcon />}
            disabled={
              !canManage ||
              !dirty ||
              saving
            }
            onClick={() => void handleSave()}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#075e54",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#064e46",
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                bgcolor: "#d1d5db",
                color: "#ffffff",
              },
            }}
          >
            {saving
              ? "กำลังบันทึก..."
              : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </Box>

        {!canManage && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
          >
            หน้านี้ดูได้แบบอ่านอย่างเดียว
            เฉพาะผู้ดูแลระบบ (Admin)
            เท่านั้นที่จะแก้ไขสิทธิ์ได้
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() =>
              setError("")
            }
          >
            {error}
          </Alert>
        )}

        {/* ==================== MATRIX ==================== */}

        <Card
          sx={{
            border: "1px solid #e1e7ef",
            borderRadius: "20px",
            boxShadow:
              "0 2px 10px rgba(15,23,42,0.04)",
          }}
        >
          <Box
            sx={{
              px: { xs: 2, md: 3 },
              py: 2.5,
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography
              component="div"
              sx={{
                fontWeight: 800,
                color: "#0f172a",
                width: { xs: "100%", md: 260 },
              }}
            >
              โมดูล/ระบบงาน
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(3, 1fr)",
                  md: "repeat(3, 140px)",
                },
                gap: 2,
                flex: 1,
                textAlign: "center",
              }}
            >
              {ROLES.map(({ role }) => (
                <Typography
                  key={role}
                  component="span"
                  sx={{
                    justifySelf: "center",
                    px: 1.5,
                    py: 0.4,
                    borderRadius: 5,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 0.4,
                    bgcolor:
                      ROLE_CHIP[role].bg,
                    color: ROLE_CHIP[role].color,
                  }}
                >
                  {role}
                </Typography>
              ))}
            </Box>
          </Box>

          <Divider />

          {loading ? (
            <Stack
              spacing={0}
              sx={{ px: { xs: 2, md: 3 } }}
            >
              {MODULES.map((module) => (
                <Box
                  key={module.key}
                  sx={{
                    py: 2.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    borderBottom:
                      "1px solid #eef1f6",
                  }}
                >
                  <Box
                    sx={{ flex: 1 }}
                  >
                    <Skeleton width={180} />
                    <Skeleton
                      width={240}
                      height={16}
                    />
                  </Box>

                  {ROLES.map(({ role }) => (
                    <Skeleton
                      key={role}
                      variant="circular"
                      width={26}
                      height={26}
                      sx={{
                        display: {
                          xs: "none",
                          md: "block",
                        },
                      }}
                    />
                  ))}
                </Box>
              ))}
            </Stack>
          ) : (
            MODULES.map((module) => (
              <Box
                key={module.key}
                sx={{
                  px: { xs: 2, md: 3 },
                  py: 2.25,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  borderBottom:
                    "1px solid #eef1f6",
                  transition: "background 120ms ease",
                  "&:hover": {
                    bgcolor: "#fafcff",
                  },
                }}
              >
                <Box
                  sx={{
                    width: { xs: "100%", md: 260 },
                    minWidth: 0,
                  }}
                >
                  <Typography
                    component="div"
                    sx={{
                      fontWeight: 800,
                      color: "#0f172a",
                      fontSize: 15,
                    }}
                  >
                    {module.label}
                    {module.labelEn !==
                      module.label && (
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          ml: 0.75,
                          color: "#94a3b8",
                          fontWeight: 600,
                        }}
                      >
                        ({module.labelEn})
                      </Typography>
                    )}
                  </Typography>

                  <Typography
                    component="div"
                    variant="caption"
                    sx={{
                      color: "#94a3b8",
                    }}
                  >
                    {module.hint}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "repeat(3, 1fr)",
                      md: "repeat(3, 140px)",
                    },
                    gap: 2,
                    flex: 1,
                    textAlign: "center",
                  }}
                >
                  {ROLES.map(({ role, editable }) => {
                    const checked =
                      role === "ADMIN"
                        ? true
                        : (matrix[role]?.[
                            module.key
                          ] ?? false);

                    return (
                      <Box
                        key={role}
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={
                            !editable ||
                            !canManage
                          }
                          onChange={(event) =>
                            toggle(
                              role,
                              module.key,
                              event.target
                                .checked,
                            )
                          }
                          slotProps={{
                            input: {
                              "aria-label": `${role} ${module.label}`,
                            },
                          }}
                          icon={
                            <Box
                              sx={{
                                width: 22,
                                height: 22,
                                borderRadius: 0.75,
                                border:
                                  "1.5px solid #cbd5e1",
                                bgcolor:
                                  "#ffffff",
                              }}
                            />
                          }
                          checkedIcon={
                            <Box
                              sx={{
                                width: 22,
                                height: 22,
                                borderRadius: 0.75,
                                bgcolor:
                                  role === "ADMIN"
                                    ? "#b6bfcc"
                                    : "#0f62fe",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                color:
                                  "#ffffff",
                                fontSize: 13,
                                fontWeight: 900,
                                lineHeight: 1,
                              }}
                            >
                              ✓
                            </Box>
                          }
                          sx={{
                            p: 0,
                            "&:hover": {
                              bgcolor:
                                "transparent",
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ))
          )}

          {!loading && (
            <>
              <Box
                sx={{
                  px: { xs: 2, md: 3 },
                  py: 2,
                  bgcolor: "#fafcff",
                  borderRadius:
                    "0 0 20px 20px",
                }}
              >
                <Typography
                  component="div"
                  variant="caption"
                  sx={{
                    color: "#64748b",
                  }}
                >
                  สิทธิ์ของ ADMIN
                  ถูกล็อกไว้เสมอ
                  และ ADMIN เข้าถึงทุกโมดูลโดยไม่ต้องตั้งค่า
                  การแก้ไขจะมีผลกับผู้ใช้
                  หลัง Login ใหม่
                </Typography>
              </Box>
            </>
          )}
        </Card>
      </Box>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() =>
          setNotice("")
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() =>
            setNotice("")
          }
        >
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}