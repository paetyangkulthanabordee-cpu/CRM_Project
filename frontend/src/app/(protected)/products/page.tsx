"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { z } from "zod";

import AddIcon from "@mui/icons-material/Add";
import CategoryIcon from "@mui/icons-material/Category";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PaidIcon from "@mui/icons-material/Paid";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
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
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
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

import { api, getErrorMessage } from "@/lib/api";
import { useApi } from "@/lib/swr";

import { useSession } from "@/lib/useSession";

import type {
  Product,
  ProductGroup,
  ProductStats,
  ProductUnit,
} from "@/lib/types";

interface ProductForm {
  name: string;
  skuCode: string;
  productGroupId: string;
  productUnitId: string;
  price: string;
  description: string;
}

const emptyForm: ProductForm = {
  name: "",
  skuCode: "",
  productGroupId: "",
  productUnitId: "",
  price: "",
  description: "",
};

function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  })}`;
}

export default function ProductsPage() {
  const router = useRouter();
  const t = useTranslations("products");
  const tCommon = useTranslations("common");
  const { user, ready } = useSession();

  const productSchema = z.object({
    name: z.string().min(1, t("nameRequired")),
    skuCode: z.string().optional(),
    productGroupId: z
      .string()
      .min(1, t("groupRequired")),
    productUnitId: z
      .string()
      .min(1, t("unitRequired")),
    price: z
      .string()
      .refine(
        (value) =>
          value !== "" && Number(value) >= 0,
        t("priceRequired"),
      ),
    description: z.string().optional(),
  });

  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const listUrl = useMemo(() => {
    if (!ready || !user) return null;

    const params = new URLSearchParams();
    params.set("limit", String(rowsPerPage));
    params.set("page", String(page));

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (groupId) {
      params.set("groupId", groupId);
    }

    return `/api/products?${params.toString()}`;
  }, [ready, user, page, search, groupId, rowsPerPage]);

  const {
    data: listData,
    isLoading: loading,
    error: loadError,
    mutate: reloadProducts,
  } = useApi<{ data: Product[]; total: number }>(listUrl);
  const { data: statsData } = useApi<ProductStats>(
    ready && user ? "/api/products/stats" : null,
  );
  const { data: groupsData } = useApi<ProductGroup[]>(
    ready && user ? "/api/products/groups" : null,
  );
  const { data: unitsData } = useApi<ProductUnit[]>(
    ready && user ? "/api/products/units" : null,
  );

  const products = useMemo(
    () => listData?.data ?? [],
    [listData],
  );
  const stats = statsData ?? null;
  const groups = groupsData ?? [];
  const units = unitsData ?? [];

  const total = listData?.total ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(total / rowsPerPage),
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [viewTarget, setViewTarget] =
    useState<Product | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<Product | null>(null);
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

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }
  }, [ready, user, router]);

  const hasFilter =
    Boolean(search.trim()) || Boolean(groupId);

  function resetFilters() {
    setSearch("");
    setGroupId("");
    setPage(1);
  }

  /* =====================================================
     CREATE / EDIT
  ===================================================== */

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      skuCode: product.skuCode ?? "",
      productGroupId: String(product.productGroupId),
      productUnitId: String(product.productUnitId),
      price: String(product.price),
      description: product.description ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  }

  function handleFormChange(
    updates: Partial<ProductForm>,
  ) {
    setForm((current) => ({
      ...current,
      ...updates,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const result = productSchema.safeParse(form);

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
        await api.patch(`/products/${editing.id}`, {
          name: result.data.name,
          skuCode: result.data.skuCode || null,
          productGroupId: Number(
            result.data.productGroupId,
          ),
          productUnitId: Number(
            result.data.productUnitId,
          ),
          price: Number(result.data.price),
          description:
            result.data.description || null,
        });

        showNotice(t("productUpdated"), "success");
      } else {
        await api.post("/api/products", {
          name: result.data.name,
          skuCode: result.data.skuCode || undefined,
          productGroupId: Number(
            result.data.productGroupId,
          ),
          productUnitId: Number(
            result.data.productUnitId,
          ),
          price: Number(result.data.price),
          description:
            result.data.description || undefined,
        });

        showNotice(t("productAdded"), "success");
      }

      setDialogOpen(false);
      await reloadProducts();
    } catch (err) {
      setFormError(
        getErrorMessage(err, t("productSaveError")),
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
        `/products/${deleteTarget.id}`,
      );

      showNotice(t("productDeleted"), "success");
      setDeleteTarget(null);
      await reloadProducts();
    } catch (err) {
      showNotice(
        getErrorMessage(err, t("productDeleteError")),
        "error",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function groupName(id: number) {
    return (
      groups.find((item) => item.id === id)?.name ??
      "-"
    );
  }

  function unitName(id: number) {
    return (
      units.find((item) => item.id === id)?.name ??
      "-"
    );
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

  const statCards: {
    icon: ReactNode;
    color: string;
    label: string;
    value: number;
    sub: string;
  }[] = [
    {
      icon: <Inventory2Icon />,
      color: "#2563eb",
      label: t("totalProducts"),
      value: stats?.totalProducts ?? 0,
      sub: t("entries"),
    },
    {
      icon: <PaidIcon />,
      color: "#16a34a",
      label: t("totalValue"),
      value: stats?.totalValue ?? 0,
      sub: t("totalValueSub"),
    },
    {
      icon: <CategoryIcon />,
      color: "#f97316",
      label: t("groupCount"),
      value: stats?.groupCount ?? 0,
      sub: "",
    },
  ];

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
          <Box sx={{ minWidth: 0 }}>
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

        {/* STATS */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(3, 1fr)",
            },
            gap: 2,
            mb: 3,
          }}
        >
          {statCards.map((card) => (
            <Card
              key={card.label}
              sx={{
                border: "1px solid #eceff4",
                borderRadius: "16px",
                bgcolor: "#ffffff",
              }}
            >
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  "&:last-child": { pb: 2.5 },
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: `${card.color}14`,
                    color: card.color,
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    component="div"
                    variant="body2"
                    sx={{ color: "#64748b" }}
                  >
                    {card.label}
                  </Typography>

                  <Typography
                    component="div"
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: "#0f172a",
                      lineHeight: 1.3,
                    }}
                  >
                    {loading ? (
                      <Skeleton
                        width={70}
                        height={34}
                      />
                    ) : card.label ===
                      t("totalValue") ? (
                      formatBaht(card.value)
                    ) : (
                      <>
                        {card.value}
                        {card.sub && (
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{
                              ml: 0.75,
                              fontWeight: 600,
                              color: "#64748b",
                            }}
                          >
                            {card.sub}
                          </Typography>
                        )}
                      </>
                    )}
                  </Typography>

                  {loading && (
                    <Skeleton width={100} />
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

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
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
            }}
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

          <TextField
            select
            size="small"
            value={groupId || "all"}
            onChange={(event) => {
              const value = String(event.target.value);

              setGroupId(value === "all" ? "" : value);
              setPage(1);
            }}
            sx={{ minWidth: 190 }}
            slotProps={{
              input: {
                sx: {
                  bgcolor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
          >
            <MenuItem value="all">
              {t("allGroups")}
            </MenuItem>
            {groups.map((group) => (
              <MenuItem
                key={group.id}
                value={String(group.id)}
              >
                {group.name}
              </MenuItem>
            ))}
          </TextField>

          {hasFilter && (
            <Button
              size="small"
              onClick={resetFilters}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: "#2563eb",
              }}
            >
              {t("clearFilters")}
            </Button>
          )}

          <Typography
            component="span"
            variant="body2"
            color="text.secondary"
            sx={{
              ml: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {t("showing")} {products.length} {t("of")}{" "}
            {total} {t("entries")}
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
            <CardContent sx={{ p: 0 }}>
              <Stack
                divider={<Divider flexItem />}
              >
                <Box sx={{ px: 3, py: 2.5 }}>
                  <Skeleton
                    width={240}
                    height={30}
                  />
                </Box>

                {Array.from({
                  length: 5,
                }).map((_, index) => (
                  <Box
                    key={`row-skeleton-${index}`}
                    sx={{
                      px: 3,
                      py: 2.25,
                      display: "flex",
                      alignItems: "center",
                      gap: 2.5,
                    }}
                  >
                    <Skeleton
                      width={150}
                      height={22}
                    />
                    <Skeleton width={90} />
                    <Skeleton width={90} />
                    <Skeleton width={130} />
                    <Skeleton width={110} />
                    <Box sx={{ flex: 1 }} />
                    <Skeleton
                      variant="circular"
                      width={30}
                      height={30}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
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
                {hasFilter
                  ? t("noResults")
                  : t("noProducts")}
              </Typography>

              <Typography
                component="div"
                variant="body2"
                sx={{ mt: 0.5, color: "#94a3b8" }}
              >
                {hasFilter
                  ? t("noResultsHint")
                  : t("noProductsHint")}
              </Typography>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreate}
                sx={{
                  mt: 2,
                  textTransform: "none",
                  fontWeight: 700,
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
            </CardContent>
          </Card>
        ) : (
          /* TABLE */
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
                        {t("skuCode")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {t("productName")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {t("group")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        {t("unit")}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 800 }}
                      >
                        {t("price")}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 800 }}
                      >
                        {t("actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {products.map((product) => (
                      <TableRow
                        key={product.id}
                        hover
                      >
                        <TableCell>
                          {product.skuCode ? (
                            <Chip
                              size="small"
                              label={product.skuCode}
                              sx={{
                                borderRadius: "8px",
                                fontWeight: 700,
                                fontFamily:
                                  "monospace",
                                bgcolor: "#eef2f7",
                                color: "#475569",
                              }}
                            />
                          ) : (
                            <Typography
                              component="span"
                              sx={{ color: "#94a3b8" }}
                            >
                              -
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <Typography
                            component="span"
                            sx={{ fontWeight: 700 }}
                          >
                            {product.name}
                          </Typography>
                          {product.description && (
                            <Typography
                              component="div"
                              variant="caption"
                              sx={{
                                display: "block",
                                mt: 0.25,
                                color: "#94a3b8",
                                maxWidth: 260,
                                overflow: "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {
                                product.description
                              }
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={groupName(
                              product.productGroupId,
                            )}
                            sx={{
                              borderRadius: "8px",
                              fontWeight: 700,
                              bgcolor: "#eef2f7",
                              color: "#475569",
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          {unitName(
                            product.productUnitId,
                          )}
                        </TableCell>

                        <TableCell align="right">
                          <Typography
                            component="span"
                            sx={{
                              fontWeight: 800,
                              color: "#0f172a",
                            }}
                          >
                            {formatBaht(
                              product.price,
                            )}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{
                              justifyContent: "flex-end",
                              alignItems: "center",
                            }}
                          >
                            <IconButton
                              size="small"
                              aria-label={t("viewAria")}
                              onClick={() =>
                                setViewTarget(product)
                              }
                              sx={{ color: "#64748b" }}
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>

                            <IconButton
                              size="small"
                              aria-label={t("editAria")}
                              onClick={() =>
                                openEdit(product)
                              }
                              sx={{ color: "#64748b" }}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>

                            <IconButton
                              size="small"
                              aria-label={t("deleteAria")}
                              onClick={() =>
                                setDeleteTarget(product)
                              }
                              sx={{ color: "#dc2626" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {total > rowsPerPage && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 0.5,
                    py: 2,
                    borderTop: "1px solid #eef1f6",
                  }}
                >
                  <IconButton
                    size="small"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    aria-label={t("previousPage")}
                    sx={{
                      color: "#64748b",
                      "&.Mui-disabled": {
                        color: "#cbd5e1",
                      },
                    }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>

                  {(() => {
                    const pages: (
                      | number
                      | "..."
                    )[] = [];

                    if (totalPages <= 7) {
                      for (
                        let i = 1;
                        i <= totalPages;
                        i++
                      ) {
                        pages.push(i);
                      }
                    } else {
                      pages.push(1);

                      if (page > 3) {
                        pages.push("...");
                      }

                      const start = Math.max(
                        2,
                        page - 1,
                      );
                      const end = Math.min(
                        totalPages - 1,
                        page + 1,
                      );

                      for (
                        let i = start;
                        i <= end;
                        i++
                      ) {
                        pages.push(i);
                      }

                      if (page < totalPages - 2) {
                        pages.push("...");
                      }

                      pages.push(totalPages);
                    }

                    return pages.map((p, idx) =>
                      p === "..." ? (
                        <Typography
                          key={`ellipsis-${idx}`}
                          sx={{
                            px: 1,
                            color: "#94a3b8",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          ...
                        </Typography>
                      ) : (
                        <Button
                          key={p}
                          size="small"
                          onClick={() =>
                            setPage(p)
                          }
                          sx={{
                            minWidth: 32,
                            height: 32,
                            borderRadius: "50%",
                            fontWeight: 700,
                            fontSize: 14,
                            color:
                              p === page
                                ? "#ffffff"
                                : "#475569",
                            bgcolor:
                              p === page
                                ? "#2563eb"
                                : "transparent",
                            "&:hover": {
                              bgcolor:
                                p === page
                                  ? "#2563eb"
                                  : "#f1f5f9",
                            },
                          }}
                        >
                          {p}
                        </Button>
                      ),
                    );
                  })()}

                  <IconButton
                    size="small"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    aria-label={t("nextPage")}
                    sx={{
                      color: "#64748b",
                      "&.MuiDisabled": {
                        color: "#cbd5e1",
                      },
                    }}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
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
              ? t("editProduct")
              : t("addProduct")}
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
                  label={t("skuCodeLabel")}
                  placeholder={t("skuCodePlaceholder")}
                  value={form.skuCode}
                  onChange={(event) =>
                    handleFormChange({
                      skuCode: event.target.value,
                    })
                  }
                  helperText={t("skuCodeHint")}
                  fullWidth
                />

                <TextField
                  select
                  label={t("groupLabel")}
                  value={form.productGroupId}
                  onChange={(event) =>
                    handleFormChange({
                      productGroupId:
                        event.target.value,
                    })
                  }
                  required
                  fullWidth
                >
                  <MenuItem value="">
                    {t("selectGroup")}
                  </MenuItem>
                  {groups.length === 0 && (
                    <MenuItem disabled>
                      {t("noGroups")}
                    </MenuItem>
                  )}
                  {groups.map((group) => (
                    <MenuItem
                      key={group.id}
                      value={String(group.id)}
                    >
                      {group.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label={t("unitLabel")}
                  value={form.productUnitId}
                  onChange={(event) =>
                    handleFormChange({
                      productUnitId:
                        event.target.value,
                    })
                  }
                  required
                  fullWidth
                >
                  <MenuItem value="">
                    {t("selectUnit")}
                  </MenuItem>
                  {units.length === 0 && (
                    <MenuItem disabled>
                      {t("noUnits")}
                    </MenuItem>
                  )}
                  {units.map((unit) => (
                    <MenuItem
                      key={unit.id}
                      value={String(unit.id)}
                    >
                      {unit.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label={t("priceLabel")}
                  type="number"
                  value={form.price}
                  onChange={(event) =>
                    handleFormChange({
                      price: event.target.value,
                    })
                  }
                  required
                  fullWidth
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      step: "0.01",
                    },
                  }}
                />

                <TextField
                  label={t("descriptionLabel")}
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

        {/* VIEW DIALOG */}
        <Dialog
          open={Boolean(viewTarget)}
          onClose={() => setViewTarget(null)}
          fullWidth
          maxWidth="sm"
        >
          {viewTarget && (
            <>
              <DialogTitle sx={{ pb: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      component="div"
                      variant="overline"
                      sx={{
                        color: "#94a3b8",
                        fontWeight: 700,
                      }}
                    >
                      {t("title")}
                    </Typography>

                    <Typography
                      component="div"
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      {viewTarget.name}
                    </Typography>
                  </Box>
                </Box>
              </DialogTitle>

              <DialogContent>
                <Divider sx={{ mb: 2.5 }} />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                    },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#94a3b8" }}
                    >
                      {t("skuCode")}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 700,
                        color: "#1a2233",
                      }}
                    >
                      {viewTarget.skuCode ?? "-"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#94a3b8" }}
                    >
                      {t("group")}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 700,
                        color: "#1a2233",
                      }}
                    >
                      {groupName(
                        viewTarget.productGroupId,
                      )}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#94a3b8" }}
                    >
                      {t("unit")}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 700,
                        color: "#1a2233",
                      }}
                    >
                      {unitName(
                        viewTarget.productUnitId,
                      )}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: "#94a3b8" }}
                    >
                      {t("price")}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      {formatBaht(
                        viewTarget.price,
                      )}
                    </Typography>
                  </Box>
                </Box>

                {viewTarget.description && (
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "#94a3b8" }}
                    >
                      {t("descriptionLabel")}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#475569" }}
                    >
                      {
                        viewTarget.description
                      }
                    </Typography>
                  </Box>
                )}
              </DialogContent>

              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                  onClick={() =>
                    setViewTarget(null)
                  }
                  sx={{ textTransform: "none" }}
                >
                  {t("cancel")}
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => {
                    const product = viewTarget;
                    setViewTarget(null);
                    openEdit(product);
                  }}
                  sx={{ textTransform: "none" }}
                >
                  {t("edit")}
                </Button>
              </DialogActions>
            </>
          )}
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
