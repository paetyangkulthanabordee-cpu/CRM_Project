"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { z } from "zod";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockIcon from "@mui/icons-material/Lock";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import Alert from "@mui/material/Alert";
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
import InputAdornment from "@mui/material/InputAdornment";
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

import { api, getErrorMessage } from "@/lib/api";
import { useApi } from "@/lib/swr";

import { useSession } from "@/lib/useSession";

import type { ProductGroup } from "@/lib/types";

interface GroupForm {
  name: string;
  description: string;
}

const emptyForm: GroupForm = {
  name: "",
  description: "",
};

export default function ProductGroupsPage() {
  const router = useRouter();
  const t = useTranslations("productGroups");
  const tCommon = useTranslations("common");
  const { user, permissions, ready } = useSession();

  const groupSchema = z.object({
    name: z.string().min(1, t("nameRequired")),
    description: z.string().optional(),
  });

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] =
    useState<ProductGroup | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<ProductGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<
    "success" | "error"
  >("success");

  const showNotice = useCallback(
    (message: string, type: "success" | "error") => {
      setNotice(message);
      setNoticeType(type);
    },
    [],
  );

  const canManage =
    permissions?.productManagement === true;

  const listUrl = useMemo(
    () =>
      ready && user
        ? "/api/products/groups"
        : null,
    [ready, user],
  );

  const {
    data: groupsData,
    isLoading: loading,
    error: loadError,
    mutate: reloadGroups,
  } = useApi<ProductGroup[]>(listUrl);

  const groups = useMemo(
    () => groupsData ?? [],
    [groupsData],
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return groups;
    }

    return groups.filter((group) =>
      group.name.toLowerCase().includes(keyword),
    );
  }, [groups, search]);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }
  }, [ready, user, router]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(group: ProductGroup) {
    setEditing(group);
    setForm({
      name: group.name,
      description: group.description ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  }

  function handleFormChange(updates: Partial<GroupForm>) {
    setForm((current) => ({
      ...current,
      ...updates,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const result = groupSchema.safeParse(form);

    if (!result.success) {
      setFormError(
        result.error.issues[0]?.message ??
          tCommon("error"),
      );
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editing) {
        await api.patch(
          `/products/groups/${editing.id}`,
          {
            name: result.data.name,
            description:
              result.data.description || null,
          },
        );

        showNotice(t("groupUpdated"), "success");
      } else {
        await api.post("/products/groups", {
          name: result.data.name,
          description:
            result.data.description || undefined,
        });

        showNotice(t("groupAdded"), "success");
      }

      setDialogOpen(false);
      await reloadGroups();
    } catch (err) {
      setFormError(
        getErrorMessage(err, t("groupSaveError")),
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
        `/products/groups/${deleteTarget.id}`,
      );

      showNotice(t("groupDeleted"), "success");
      setDeleteTarget(null);
      await reloadGroups();
    } catch (err) {
      showNotice(
        getErrorMessage(err, t("groupDeleteError")),
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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "#f6f8fb",
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
        {/* HEADER */}
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
              component="div"
              variant="overline"
              sx={{
                color: "#2563eb",
                fontWeight: 800,
                letterSpacing: 1.2,
              }}
            >
              {t("title")}
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
              {t("title")}
            </Typography>

            <Typography
              component="div"
              variant="body2"
              sx={{ mt: 0.5, color: "#64748b" }}
            >
              {t("subtitle")}
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
              px: 2,
              borderRadius: 2,
              bgcolor: "#2563eb",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#1d4ed8",
                boxShadow: "none",
              },
            }}
          >
            {t("addNew")}
          </Button>
        </Box>

        {!canManage && (
          <Alert
            severity="warning"
            icon={<LockIcon />}
            sx={{ mb: 2 }}
          >
            {t("readOnly")}
          </Alert>
        )}

        {/* TOOLBAR */}
        <Card
          sx={{
            mb: 3,
            display: "flex",
            gap: 1.5,
            flexWrap: "wrap",
            alignItems: "center",
            p: 1.5,
            border: "1px solid #eceff4",
            borderRadius: "16px",
            boxShadow:
              "0 1px 3px rgba(15,23,42,0.04)",
          }}
        >
          <TextField
            size="small"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            autoComplete="off"
            sx={{
              minWidth: 260,
              flex: 1,
              maxWidth: 460,
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{ color: "#94a3b8" }}
                    />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label={t("clearFilters")}
                      onClick={() => setSearch("")}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
                sx: {
                  bgcolor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
          />

          <Typography
            component="span"
            variant="body2"
            color="text.secondary"
            sx={{
              ml: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {t("showing")} {filtered.length} {t("of")}{" "}
            {groups.length} {t("entries")}
          </Typography>
        </Card>

        {/* ERROR */}
        {loadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t("loadError")}
          </Alert>
        )}

        {/* CONTENT */}
        {loading ? (
          <Card
            sx={{
              border: "1px solid #eceff4",
              borderRadius: "16px",
              bgcolor: "#ffffff",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                component="div"
                variant="body2"
                color="text.secondary"
              >
                {tCommon("loading")}
              </Typography>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card
            sx={{
              border: "1px solid #eceff4",
              borderRadius: "16px",
              bgcolor: "#ffffff",
            }}
          >
            <CardContent
              sx={{
                py: 7,
                textAlign: "center",
              }}
            >
              <SearchOffIcon
                sx={{
                  fontSize: 44,
                  color: "#cbd5e1",
                }}
              />

              <Typography
                component="div"
                variant="body1"
                sx={{
                  mt: 1.5,
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                {search
                  ? t("noResults")
                  : t("noGroups")}
              </Typography>

              <Typography
                component="div"
                variant="body2"
                sx={{ mt: 0.5, color: "#94a3b8" }}
              >
                {search
                  ? t("noResultsHint")
                  : t("noGroupsHint")}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Card
            sx={{
              border: "1px solid #eceff4",
              borderRadius: "16px",
              bgcolor: "#ffffff",
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{ bgcolor: "#f8fafc" }}
                    >
                      <TableCell sx={{ fontWeight: 800 }}>
                        {t("name")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {t("description")}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 800 }}
                      >
                        {t("productCount")}
                      </TableCell>
                      {canManage && (
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 800 }}
                        >
                          {t("actions")}
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {filtered.map((group) => (
                      <TableRow
                        key={group.id}
                        hover
                      >
                        <TableCell>
                          <Typography
                            component="span"
                            sx={{ fontWeight: 700 }}
                          >
                            {group.name}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography
                            component="span"
                            sx={{ color: "#64748b" }}
                          >
                            {group.description ?? "-"}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Chip
                            size="small"
                            label={
                              group.productCount ?? 0
                            }
                            sx={{
                              borderRadius: "8px",
                              fontWeight: 700,
                              bgcolor: "#eef2f7",
                              color: "#475569",
                            }}
                          />
                        </TableCell>

                        {canManage && (
                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{
                                justifyContent:
                                  "flex-end",
                                alignItems:
                                  "center",
                              }}
                            >
                              <IconButton
                                size="small"
                                aria-label={t("edit")}
                                onClick={() =>
                                  openEdit(group)
                                }
                                sx={{
                                  color: "#64748b",
                                }}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>

                              <IconButton
                                size="small"
                                aria-label={t("delete")}
                                onClick={() =>
                                  setDeleteTarget(group)
                                }
                                sx={{
                                  color: "#dc2626",
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* FORM DIALOG */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            {editing
              ? t("editGroup")
              : t("addGroup")}
          </DialogTitle>

          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Stack spacing={2}>
                {formError && (
                  <Alert severity="error">
                    {formError}
                  </Alert>
                )}

                <TextField
                  label={t("name")}
                  placeholder={t("namePlaceholder")}
                  value={form.name}
                  onChange={(event) =>
                    handleFormChange({
                      name: event.target.value,
                    })
                  }
                  required
                  fullWidth
                />

                <TextField
                  label={t("description")}
                  placeholder={t(
                    "descriptionPlaceholder",
                  )}
                  value={form.description}
                  onChange={(event) =>
                    handleFormChange({
                      description:
                        event.target.value,
                    })
                  }
                  multiline
                  minRows={2}
                  fullWidth
                />
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                sx={{ textTransform: "none" }}
              >
                {t("cancel")}
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                sx={{
                  textTransform: "none",
                  bgcolor: "#2563eb",
                  "&:hover": {
                    bgcolor: "#1d4ed8",
                  },
                }}
              >
                {saving ? t("save") : t("save")}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* DELETE DIALOG */}
        <Dialog
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            {t("deleteConfirmTitle")}
          </DialogTitle>

          <DialogContent>
            <Typography
              component="div"
              variant="body2"
            >
              {t("deleteConfirmMessage", {
                name: deleteTarget?.name ?? "",
              })}
            </Typography>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              sx={{ textTransform: "none" }}
            >
              {t("cancel")}
            </Button>

            <Button
              color="error"
              variant="contained"
              disabled={deleting}
              onClick={() => void handleDelete()}
              sx={{ textTransform: "none" }}
            >
              {deleting
                ? t("deleting")
                : t("delete")}
            </Button>
          </DialogActions>
        </Dialog>

        {/* NOTICE */}
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
    </Box>
  );
}
