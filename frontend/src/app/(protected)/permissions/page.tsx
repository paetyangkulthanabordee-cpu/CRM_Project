"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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

import { api, getErrorMessage } from "@/lib/api";
import { useApi } from "@/lib/swr";

import { updatePermissions } from "@/lib/auth";
import type { Permissions } from "@/lib/auth";

import { useSession } from "@/lib/useSession";

import type { UserRole } from "@/lib/auth";

type ModuleKey =
  | "dashboard"
  | "customers"
  | "salesPipeline"
  | "orderPipeline"
  | "documents"
  | "products"
  | "productManagement"
  | "reports"
  | "administration";

interface ModuleDef {
  key: ModuleKey;
  label: string;
  labelEn: string;
  hint: string;
}

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
    orderPipeline: row.orderPipeline === true,
    documents: row.documents === true,
    products: row.products === true,
    productManagement:
      row.productManagement === true,
    reports: row.reports === true,
    administration,
    permissions: administration,
    auditLogs: administration,
  };
}

export default function PermissionsPage() {
  const t = useTranslations("permissions");
  const router = useRouter();
  const { user, permissions, ready } = useSession();

  const MODULES = useMemo<ModuleDef[]>(
    () => [
      {
        key: "dashboard",
        label: t("modules.dashboard"),
        labelEn: "Dashboard",
        hint: t("moduleHints.dashboard"),
      },
      {
        key: "customers",
        label: t("modules.customers"),
        labelEn: "Customer Database",
        hint: t("moduleHints.customers"),
      },
      {
        key: "salesPipeline",
        label: t("modules.salesPipeline"),
        labelEn: "Contact Pipeline",
        hint: t("moduleHints.salesPipeline"),
      },
      {
        key: "orderPipeline",
        label: t("modules.orderPipeline"),
        labelEn: "Order Pipeline",
        hint: t("moduleHints.orderPipeline"),
      },
      {
        key: "documents",
        label: t("modules.documents"),
        labelEn: t("modules.documentsEn"),
        hint: t("moduleHints.documents"),
      },
      {
        key: "products",
        label: t("modules.products"),
        labelEn: t("modules.productsEn"),
        hint: t("moduleHints.products"),
      },
      {
        key: "productManagement",
        label: t("modules.productManagement"),
        labelEn: "Product Management",
        hint: t("moduleHints.productManagement"),
      },
      {
        key: "reports",
        label: t("modules.reports"),
        labelEn: "Reports",
        hint: t("moduleHints.reports"),
      },
      {
        key: "administration",
        label: t("modules.administration"),
        labelEn: "Administration Settings",
        hint: t("moduleHints.administration"),
      },
    ],
    [t],
  );

  const {
    data: matrixData,
    isLoading: loading,
  } = useApi<Matrix>(
    ready && user && permissions?.administration === true
      ? "/api/permissions"
      : null,
  );

  const [savedMatrix, setSavedMatrix] = useState<Matrix>({});

  const matrix = useMemo(
    () => savedMatrix,
    [savedMatrix],
  );
  const baseline = useMemo(() => matrixData ?? {}, [matrixData]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");


  const canManage = permissions?.administration === true;

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }
  }, [ready, user, router]);

  function toggle(
    role: UserRole,
    key: ModuleKey,
    value: boolean,
  ) {
    setSavedMatrix((current) => ({
      ...current,
      [role]: {
        ...current[role],
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
          ...matrix[role],
        };
      }

      const response =
        await api.patch<Matrix>(
          "/permissions",
          payload,
        );

      setSavedMatrix(response.data);

      if (user) {
        updatePermissions(
          toSessionPermissions(
            response.data,
            user.role,
          ),
        );
      }

      setNotice(t("saved"));
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("saveError"),
        ),
      );
    } finally {
      setSaving(false);
    }
  }

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
  }, [matrix, baseline, loading, MODULES]);



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
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          overflowY: "auto",
          maxHeight: "100vh",
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
              {t("title")}
            </Typography>

            <Typography
              component="div"
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#64748b",
              }}
            >
              {t("subtitle")}
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
            {saving ? t("saving") : t("save")}
          </Button>
        </Box>

        {!canManage && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
          >
            {t("readOnly")}
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
              {t("module")}
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
                  {t("adminLocked")}
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
