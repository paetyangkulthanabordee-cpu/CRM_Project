"use client";

import { useCallback, useMemo, useState } from "react";

import type { FormEvent } from "react";

import { useRouter } from "next/navigation";

import { z } from "zod";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import DashboardSidebar from "@/components/DashboardSidebar";

import { api, getErrorMessage } from "@/lib/api";
import { useApi } from "@/lib/swr";

import { useSession } from "@/lib/useSession";

import type {
  Permissions,
  User,
  UserRole,
} from "@/lib/auth";

interface UserListItem extends User {
  customerCount: number;
  createdAt: string;
}

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  role: "SALES",
};

const ROLES: {
  role: UserRole;
  label: string;
  color: string;
  bg: string;
}[] = [
  {
    role: "ADMIN",
    label: "ADMIN",
    color: "#b91c1c",
    bg: "#fdecec",
  },
  {
    role: "MANAGER",
    label: "MANAGER",
    color: "#1d4ed8",
    bg: "#e8f1ff",
  },
  {
    role: "SALES",
    label: "SALES",
    color: "#15803d",
    bg: "#e6f8ec",
  },
];

const ROLE_STYLE: Record<
  UserRole,
  { color: string; bg: string }
> = {
  ADMIN: { color: "#b91c1c", bg: "#fdecec" },
  MANAGER: { color: "#1d4ed8", bg: "#e8f1ff" },
  SALES: { color: "#15803d", bg: "#e6f8ec" },
};

const userSchema = z.object({
  name: z
    .string()
    .min(1, "กรุณากรอกชื่อผู้ใช้"),

  email: z
    .string()
    .min(1, "กรุณากรอกอีเมล")
    .refine(
      (value) =>
        z.string().email().safeParse(value)
          .success,
      "รูปแบบ Email ไม่ถูกต้อง",
    ),

  password: z.string().min(
    6,
    "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
  ),

  role: z.string().min(
    1,
    "กรุณาเลือกสิทธิ์",
  ),
});

function initials(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "?";
  }

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function UsersPage() {
  const router = useRouter();
  const { user, permissions, ready } = useSession();

  const {
    data: usersData,
    isLoading: loading,
    error: loadError,
    mutate: reloadUsers,
  } = useApi<UserListItem[]>(
    ready && user && permissions?.administration === true
      ? "/api/users"
      : null,
  );

  const users = useMemo(
    () => usersData ?? [],
    [usersData],
  );

  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(
    false,
  );
  const [editing, setEditing] =
    useState<UserListItem | null>(null);
  const [form, setForm] =
    useState<UserForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<UserListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<
    "success" | "error"
  >("success");

  const canManage =
    permissions?.administration === true;

  const showNotice = useCallback(
    (message: string, type: "success" | "error") => {
      setNotice(message);
      setNoticeType(type);
    },
    [],
  );

  if (!user) {
    router.replace("/login");
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.email
          .toLowerCase()
          .includes(query) ||
        item.role.toLowerCase().includes(query),
    );
  }, [users, search]);

  const counts = useMemo(() => {
    const result: Record<UserRole, number> = {
      ADMIN: 0,
      MANAGER: 0,
      SALES: 0,
    };

    for (const item of users) {
      result[item.role] += 1;
    }

    return result;
  }, [users]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(target: UserListItem) {
    setEditing(target);
    setForm({
      name: target.name,
      email: target.email,
      password: "",
      role: target.role,
    });
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const passwordSchema = editing
      ? z
          .string()
          .refine(
            (value) =>
              value === "" ||
              value.length >= 6,
            "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
          )
      : userSchema.shape.password;

    const result = userSchema
      .extend({ password: passwordSchema })
      .safeParse(form);

    if (!result.success) {
      setFormError(
        result.error.issues[0]?.message ||
          "ข้อมูลไม่ถูกต้อง",
      );
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editing) {
        await api.patch(
          `/users/${editing.userId}`,
          {
            name: result.data.name.trim(),
            email: result.data.email.trim(),
            ...(result.data.password
              ? {
                  password:
                    result.data.password,
                }
              : {}),
            role: result.data.role,
          },
        );

        showNotice(
          "อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว",
          "success",
        );
      } else {
        await api.post("/api/users", {
          name: result.data.name.trim(),
          email: result.data.email.trim(),
          password: result.data.password,
          role: result.data.role,
        });

        showNotice(
          "เพิ่มผู้ใช้ใหม่เรียบร้อยแล้ว",
          "success",
        );
      }

      setDialogOpen(false);
      await reloadUsers();
    } catch (err) {
      setFormError(
        getErrorMessage(
          err,
          "ไม่สามารถบันทึกข้อมูลผู้ใช้ได้",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      await api.delete(
        `/users/${deleteTarget.userId}`,
      );

      showNotice(
        "ลบผู้ใช้เรียบร้อยแล้ว",
        "success",
      );
      setDeleteTarget(null);
      await reloadUsers();
    } catch (err) {
      showNotice(
        getErrorMessage(
          err,
          "ไม่สามารถลบผู้ใช้ได้",
        ),
        "error",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
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

  const fallbackPermissions: Permissions =
    permissions ?? {
      dashboard: true,
      customers: true,
      salesPipeline: true,
      documents: true,
      reports: true,
      administration: true,
      permissions: true,
      auditLogs: true,
    };

  const isSelf = editing
    ? editing.userId === user.userId
    : false;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "#f6f8fb",
      }}
    >
      <DashboardSidebar
        user={user}
        permissions={fallbackPermissions}
      />

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
        {/* =================================================
            HEADER
        ================================================== */}

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
              sx={{
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: 1.2,
                color: "#2563eb",
              }}
            >
              ADMINISTRATION
            </Typography>

            <Typography
              component="h1"
              variant="h4"
              sx={{
                mt: 0.5,
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.2,
              }}
            >
              ผู้ใช้งานระบบ (Users)
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#64748b",
              }}
            >
              เพิ่ม แก้ไข และลบบัญชีผู้ใช้
              พร้อมกำหนดสิทธิ์ว่าจะเข้าถึง
              โมดูลใดได้บ้าง
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!canManage}
            onClick={openCreate}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: "#2563eb",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#1d4ed8",
                boxShadow: "none",
              },
            }}
          >
            เพิ่มผู้ใช้ใหม่
          </Button>
        </Box>

        {!canManage && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            หน้านี้ดูได้แบบอ่านอย่างเดียว
            เฉพาะผู้ดูแลระบบ (Admin)
            เท่านั้นที่จะเพิ่มหรือแก้ไขผู้ใช้ได้
          </Alert>
        )}

        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            ไม่สามารถโหลดข้อมูลผู้ใช้ได้
          </Alert>
        )}

        {/* =================================================
            STAT CARDS
        ================================================== */}

        <Box
          sx={{
            mb: 3,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              xl: "repeat(4, 1fr)",
            },
            gap: 2,
          }}
        >
          {[
            {
              label: "ผู้ใช้ทั้งหมด",
              value: `${users.length}`,
              sub: `แสดง ${filtered.length} รายหลังค้นหา`,
              color: "#2563eb",
            },
            ...ROLES.map((item) => ({
              label: item.label,
              value: `${counts[item.role]}`,
              sub: "บัญชีในสิทธิ์นี้",
              color: item.color,
            })),
          ].map((stat) => (
            <Card
              key={stat.label}
              sx={{
                border: "1px solid #e7ebf2",
                borderRadius: "16px",
                boxShadow:
                  "0 1px 3px rgba(15,23,42,0.04)",
              }}
            >
              <CardContent
                sx={{ "&:last-child": { pb: 2.25 } }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "#64748b" }}
                >
                  {stat.label}
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    mt: 0.5,
                    fontWeight: 800,
                    color: stat.color,
                    lineHeight: 1.3,
                  }}
                >
                  {stat.value}
                </Typography>

                <Typography
                  variant="caption"
                  sx={{ color: "#94a3b8" }}
                >
                  {stat.sub}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* =================================================
            TOOLBAR
        ================================================== */}

        <Card
          sx={{
            mb: 3,
            display: "flex",
            gap: 1.5,
            flexWrap: "wrap",
            alignItems: "center",
            p: 1.5,
            border: "1px solid #e7ebf2",
            borderRadius: "16px",
            boxShadow:
              "0 1px 3px rgba(15,23,42,0.04)",
          }}
        >
          <TextField
            size="small"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="ค้นหาชื่อ อีเมล หรือสิทธิ์..."
            sx={{
              minWidth: { xs: "100%", md: 320 },
            }}
          />
        </Card>

        {/* =================================================
            TABLE
        ================================================== */}

        <Card
          sx={{
            border: "1px solid #e7ebf2",
            borderRadius: "16px",
            boxShadow:
              "0 1px 3px rgba(15,23,42,0.04)",
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#fafcff" }}>
                  <TableCell
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    ชื่อผู้ใช้
                  </TableCell>

                  <TableCell
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    อีเมล
                  </TableCell>

                  <TableCell
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    สิทธิ์
                  </TableCell>

                  <TableCell
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    วันที่สร้าง
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 800,
                      color: "#475569",
                    }}
                  >
                    จัดการ
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map(
                    (_, row) => (
                      <TableRow
                        key={`skeleton-${row}`}
                      >
                        {[200, 180, 90, 130, 90].map(
                          (width, cell) => (
                            <TableCell key={cell}>
                              <Skeleton
                                width={width}
                                height={26}
                              />
                            </TableCell>
                          ),
                        )}
                      </TableRow>
                    ),
                  )
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box
                        sx={{
                          py: 7,
                          textAlign: "center",
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 800,
                            color: "#172033",
                          }}
                        >
                          {search.trim()
                            ? "ไม่พบผู้ใช้ที่ตรงกับคำค้น"
                            : "ยังไม่มีผู้ใช้"}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            mt: 0.5,
                            color: "#94a3b8",
                          }}
                        >
                          {search.trim()
                            ? "ลองเปลี่ยนคำค้นหา"
                            : "เริ่มเพิ่มผู้ใช้ได้จากปุ่มเพิ่มผู้ใช้ใหม่"}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const style =
                      ROLE_STYLE[item.role];
                    const self =
                      item.userId === user.userId;

                    return (
                      <TableRow
                        key={item.userId}
                        hover
                        sx={{
                          "&:last-child td": {
                            borderBottom: 0,
                          },
                        }}
                      >
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1.25}
                            sx={{
                              alignItems: "center",
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                fontSize: 12,
                                fontWeight: 800,
                                bgcolor:
                                  style.bg,
                                color: style.color,
                              }}
                            >
                              {initials(item.name)}
                            </Avatar>

                            <Box>
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  color: "#0f172a",
                                }}
                              >
                                {item.name}
                              </Typography>

                              {self && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "#94a3b8",
                                  }}
                                >
                                  บัญชีของคุณ
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#475569",
                            }}
                          >
                            {item.email}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={item.role}
                            sx={{
                              fontWeight: 800,
                              fontSize: 11,
                              borderRadius: "7px",
                              bgcolor: style.bg,
                              color: style.color,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#475569",
                            }}
                          >
                            {new Date(
                              item.createdAt,
                            ).toLocaleDateString(
                              "th-TH",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{
                              justifyContent:
                                "flex-end",
                            }}
                          >
                            <IconButton
                              size="small"
                              aria-label="แก้ไขผู้ใช้"
                              disabled={!canManage}
                              onClick={() =>
                                openEdit(item)
                              }
                              sx={{
                                color: "#64748b",
                              }}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>

                            {!self && (
                              <IconButton
                                size="small"
                                aria-label="ลบผู้ใช้"
                                disabled={
                                  !canManage
                                }
                                onClick={() =>
                                  setDeleteTarget(item)
                                }
                                sx={{
                                  color: "#dc2626",
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 2,
            color: "#94a3b8",
          }}
        >
          หมายเหตุ: ผู้ใช้ที่ยังมีลูกค้าที่ระบุผู้รับผิดชอบ
          หรือมีเอกสารที่สร้างอยู่จะลบไม่ได้
          ต้องย้ายงานออกจากผู้ใช้นั้นก่อน และไม่สามารถลบ
          หรือเปลี่ยนสิทธิ์ของบัญชีตัวเองได้
        </Typography>
      </Box>

      {/* =================================================
          CREATE / EDIT DIALOG
      ================================================== */}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {editing
              ? "แก้ไขผู้ใช้"
              : "เพิ่มผู้ใช้ใหม่"}
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              {formError && (
                <Alert severity="error">
                  {formError}
                </Alert>
              )}

              <TextField
                fullWidth
                label="ชื่อผู้ใช้"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                disabled={saving}
                required
              />

              <TextField
                fullWidth
                label="อีเมล"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                disabled={saving}
                required
              />

              <TextField
                fullWidth
                label={
                  editing
                    ? "ตั้งรหัสผ่านใหม่"
                    : "รหัสผ่าน"
                }
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                helperText={
                  editing
                    ? "เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                    : "อย่างน้อย 6 ตัวอักษร"
                }
                disabled={saving}
                required={!editing}
              />

              <TextField
                fullWidth
                select
                label="สิทธิ์การใช้งาน"
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target
                      .value as UserRole,
                  }))
                }
                disabled={
                  saving ||
                  (editing !== null && isSelf)
                }
                helperText={
                  editing !== null && isSelf
                    ? "ไม่สามารถเปลี่ยนสิทธิ์ของบัญชีตัวเองได้"
                    : undefined
                }
              >
                {ROLES.map((item) => (
                  <MenuItem
                    key={item.role}
                    value={item.role}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              sx={{ textTransform: "none" }}
            >
              ยกเลิก
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ textTransform: "none" }}
            >
              {saving ? (
                <CircularProgress
                  size={20}
                  color="inherit"
                />
              ) : editing ? (
                "บันทึกการแก้ไข"
              ) : (
                "เพิ่มผู้ใช้"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* =================================================
          DELETE CONFIRM
      ================================================== */}

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          ยืนยันการลบผู้ใช้
        </DialogTitle>

        <DialogContent>
          <Typography component="div" variant="body2">
            ต้องการลบผู้ใช้{" "}
            <strong>{deleteTarget?.name}</strong>{" "}
            ({deleteTarget?.email}) ใช่หรือไม่?
            การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ textTransform: "none" }}
          >
            ยกเลิก
          </Button>

          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            onClick={() => void handleDelete()}
            sx={{ textTransform: "none" }}
          >
            {deleting ? "กำลังลบ..." : "ลบ"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3000}
        onClose={() => setNotice("")}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity={noticeType}
          variant="filled"
          onClose={() => setNotice("")}
        >
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
