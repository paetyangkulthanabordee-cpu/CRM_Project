"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";

import CloseIcon from "@mui/icons-material/Close";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import CustomerDetailDialog, {
  formatDate,
  initials,
} from "@/components/CustomerDetailDialog";
import DashboardSidebar from "@/components/DashboardSidebar";

import { api, getErrorMessage } from "@/lib/api";

import { useSession } from "@/lib/useSession";

import type {
  Customer,
  PipelineStage,
} from "@/lib/types";

import type { Permissions } from "@/lib/auth";

/* สีพื้นหลังของตัวเลขนับในหัวคอลัมน์ */
const COUNT_TINTS = [
  "#f1f5f9",
  "#e8f1ff",
  "#fdf6d8",
  "#e6f8ec",
  "#f1e8ff",
  "#eef1f6",
  "#fdecec",
] as const;

function countTint(index: number) {
  return COUNT_TINTS[
    index % COUNT_TINTS.length
  ];
}


/* =====================================================
   CARD
   ====================================================== */

function PipelineCard({
  customer,
  dragging,
  onOpen,
}: {
  customer: Customer;
  dragging?: boolean;
  onOpen: (customer: Customer) => void;
}) {
  const assigned =
    customer.assignedUser?.name ?? null;

  return (
    <Card
      data-testid="pipeline-card"
      data-customer-id={customer.customerId}
      sx={{
        p: 1.75,
        borderRadius: "14px",
        border: "1px solid #e7ebf2",
        bgcolor: "#ffffff",
        boxShadow: dragging
          ? "0 18px 36px rgba(15,23,42,0.18)"
          : "0 1px 2px rgba(15,23,42,0.04)",
        cursor: "pointer",
        opacity: dragging ? 0.6 : 1,
        transition: "box-shadow 150ms ease",
        "&:hover": {
          borderColor: "#c7d2fe",
          boxShadow:
            "0 6px 16px rgba(15,23,42,0.08)",
        },
      }}
      onClick={() => onOpen(customer)}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 800,
              color: "#0f172a",
              fontSize: 14,
              lineHeight: 1.35,
              wordBreak: "break-word",
            }}
          >
            {customer.companyName}
          </Typography>

          <Box
            sx={{
              mt: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "#64748b",
            }}
          >
            <PhoneIphoneIcon
              sx={{ fontSize: 13 }}
            />
            <Typography
              variant="caption"
              sx={{ fontSize: 12 }}
            >
              {customer.phone || "-"}
            </Typography>
          </Box>

          <Box
            sx={{
              mt: 0.4,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "#64748b",
            }}
          >
            <MailOutlineIcon
              sx={{ fontSize: 13 }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 190,
              }}
            >
              {customer.email || "-"}
            </Typography>
          </Box>
        </Box>

        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: 12,
            fontWeight: 800,
            bgcolor: assigned
              ? "#e8f1ff"
              : "#eef1f6",
            color: assigned
              ? "#1d4ed8"
              : "#94a3b8",
            flexShrink: 0,
          }}
        >
          {assigned
            ? initials(assigned)
            : "?"}
        </Avatar>
      </Box>

      <Divider sx={{ my: 1.25 }} />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#94a3b8" }}
        >
{assigned ?? "ไม่ระบุผู้รับผิดชอบ"}
        </Typography>

        <Typography
          variant="caption"
          sx={{ color: "#94a3b8" }}
        >
          {formatDate(customer.createdAt)}
        </Typography>
      </Box>
    </Card>
  );
}

function SortableCard({
  customer,
  onOpen,
}: {
  customer: Customer;
  onOpen: (customer: Customer) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: customer.customerId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(
          transform,
        ),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <PipelineCard
        customer={customer}
        dragging={isDragging}
        onOpen={onOpen}
      />
    </div>
  );
}

function Column({
  stage,
  index,
  customers,
  onOpen,
}: {
  stage: PipelineStage;
  index: number;
  customers: Customer[];
  onOpen: (customer: Customer) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.stageKey,
  });

  return (
    <Box
      data-testid="pipeline-column"
      data-status={stage.stageKey}
      sx={{
        width: 272,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 250px)",
        bgcolor: isOver
          ? "#eff6ff"
          : "transparent",
        borderRadius: "14px",
        transition: "background 150ms ease",
      }}
    >
      <Box
        sx={{
          mb: 1.25,
          px: 1.25,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "#ffffff",
          border: "1px solid #e7ebf2",
          borderRadius: "12px",
          boxShadow:
            "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <Box
          sx={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            bgcolor: stage.color,
            flexShrink: 0,
          }}
        />

        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 13,
            color: "#172033",
            flex: 1,
            minWidth: 0,
          }}
        >
          {stage.label}
        </Typography>

        <Box
          sx={{
            minWidth: 22,
            height: 20,
            px: 0.75,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            bgcolor: countTint(index),
            fontSize: 11,
            fontWeight: 800,
            color: "#475569",
          }}
        >
          {customers.length}
        </Box>
      </Box>

      <Box
        ref={setNodeRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          pb: 1,
          pr: 0.5,
        }}
      >
        <SortableContext
          items={customers.map(
            (customer) => customer.customerId,
          )}
          strategy={verticalListSortingStrategy}
        >
          {customers.map((customer) => (
            <SortableCard
              key={customer.customerId}
              customer={customer}
              onOpen={onOpen}
            />
          ))}
        </SortableContext>

        {customers.length === 0 && (
          <Box
            sx={{
              py: 4,
              px: 2,
              textAlign: "center",
              border: "1px dashed #d7dee8",
              borderRadius: "12px",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#94a3b8" }}
            >
ยังไม่มีลูกค้า
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* =====================================================
   PAGE
   ====================================================== */

export default function SalesPipelinePage() {
  const router = useRouter();
  const { user, permissions, ready } = useSession();

  const [customers, setCustomers] = useState<
    Customer[]
  >([]);
  const [stages, setStages] = useState<
    PipelineStage[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] =
    useState<Customer | null>(null);
  const [dragging, setDragging] =
    useState<Customer | null>(null);
  const [notice, setNotice] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const loadCustomers = useCallback(async () => {
    setLoading(true);

    try {
      const [customersRes, stagesRes] =
        await Promise.all([
          api.get<Customer[]>("/customers"),
          api.get<PipelineStage[]>(
            "/pipeline-stages",
          ),
        ]);

      setCustomers(customersRes.data);
      setStages(stagesRes.data);
    } catch {
      setCustomers([]);
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

    void Promise.resolve().then(() => loadCustomers());
  }, [ready, user, router, loadCustomers]);

  const byColumn = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matched = customers.filter(
      (customer) =>
        !query ||
        [
          customer.companyName,
          customer.email,
          customer.phone,
          customer.assignedUser?.name,
        ].some((value) =>
          (value ?? "")
            .toLowerCase()
            .includes(query),
        ),
    );

    const grouped: Record<
      string,
      Customer[]
    > = {};

    for (const stage of stages) {
      grouped[stage.stageKey] = matched.filter(
        (customer) =>
          customer.status === stage.stageKey,
      );
    }

    return grouped;
  }, [customers, stages, search]);

  async function persistStatus(
    customerId: number,
    status: string,
  ) {
    const previous = customers;

    setCustomers((current) =>
      current.map((customer) =>
        customer.customerId === customerId
          ? { ...customer, status }
          : customer,
      ),
    );

    try {
      await api.patch(`/customers/${customerId}`, {
        status,
      });

setNotice("อัปเดตสถานะใน Pipeline แล้ว");
    } catch (err) {
      setCustomers(previous);

      setNotice(
        getErrorMessage(
          err,
"ไม่พบลูกค้าที่ตรงกับคำค้นหานี้",
        ),
      );
    }
  }

  function handleDragStart(
    event: {
      active: { id: number | string };
    },
  ) {
    const id = Number(event.active.id);

    setDragging(
      customers.find(
        (customer) => customer.customerId === id,
      ) ?? null,
    );
  }

  function handleDragEnd(
    event: {
      active: { id: number | string };
      over: { id: number | string } | null;
    },
  ) {
    setDragging(null);

    if (!event.over) {
      return;
    }

    const customerId = Number(event.active.id);
    const targetStatus = String(event.over.id);

    const isStage = stages.some(
      (stage) => stage.stageKey === targetStatus,
    );

    if (!isStage) {
      return;
    }

    const customer = customers.find(
      (item) => item.customerId === customerId,
    );

    if (!customer || customer.status === targetStatus) {
      return;
    }

    void persistStatus(customerId, targetStatus);
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
      administration: user.role === "ADMIN",
      permissions: user.role === "ADMIN",
      auditLogs: user.role === "ADMIN",
    };

  const searching = search.trim().length > 0;

  const totalVisible = stages.reduce(
    (sum, stage) =>
      sum + (byColumn[stage.stageKey]?.length ?? 0),
    0,
  );

  /*
 * ระหว่างค้นหา แสดงเฉพาะคอลัมน์ที่มีผลลัพธ์
 * ถ้าไม่เจอเลย แสดงข้อความว่าไม่พบผลลัพธ์
   */
  const visibleStages = searching
    ? stages.filter(
        (stage) =>
          (byColumn[stage.stageKey]?.length ?? 0) > 0,
      )
    : stages;

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
          p: { xs: 2, md: 4 },
        }}
      >
        {/* ---- header ---- */}
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
              SALES PIPELINE
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
              บอร์ดติดตามลูกค้า
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#64748b",
              }}
            >
              ลากการ์ดเพื่อเปลี่ยนสถานะ
              คลิกการ์ดเพื่อดูรายละเอียดและ
              เอกสารของลูกค้า
            </Typography>
          </Box>

          <TextField
            size="small"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
placeholder="ค้นหาลูกค้า หรือชื่อ Sales..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
aria-label="ล้างการค้นหา"
                      onClick={() => setSearch("")}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{
              width: { xs: "100%", sm: 320 },
              "& .MuiOutlinedInput-root": {
                bgcolor: "#ffffff",
                borderRadius: "12px",
              },
            }}
          />
        </Box>

        {/* ---- board ---- */}
        {loading ? (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              overflowX: "auto",
              pb: 2,
            }}
          >
            {stages.map((stage) => (
              <Box
                key={stage.stageKey}
                sx={{ width: 272, flexShrink: 0 }}
              >
                <Skeleton
                  height={44}
                  sx={{
                    mb: 1.25,
                    borderRadius: "12px",
                  }}
                />

                <Stack
                  spacing={1.25}
                >
                  {[0, 1].map((row) => (
                    <Skeleton
                      key={row}
                      height={128}
                      sx={{
                        borderRadius: "14px",
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
        ) : customers.length === 0 ? (
          <Card
            sx={{
              py: 8,
              textAlign: "center",
              border: "1px solid #e7ebf2",
              borderRadius: "16px",
            }}
          >
            <SearchOffIcon
              sx={{
                fontSize: 40,
                color: "#cbd5e1",
              }}
            />

            <Typography
              sx={{
                mt: 1.5,
                fontWeight: 800,
                color: "#172033",
              }}
            >
ยังไม่มีลูกค้าในระบบ
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#94a3b8",
              }}
            >
เพิ่มลูกค้าได้ที่หน้า Customers
            </Typography>
          </Card>
        ) : searching &&
          totalVisible === 0 ? (
          <Card
            sx={{
              py: 8,
              textAlign: "center",
              border: "1px solid #e7ebf2",
              borderRadius: "16px",
            }}
          >
            <SearchOffIcon
              sx={{
                fontSize: 40,
                color: "#cbd5e1",
              }}
            />

            <Typography
              sx={{
                mt: 1.5,
                fontWeight: 800,
                color: "#172033",
              }}
            >
ไม่พบผลลัพธ์
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: "#94a3b8",
              }}
            >
ไม่พบลูกค้าที่ตรงกับคำค้นหานี้
            </Typography>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() =>
              setDragging(null)
            }
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                overflowX: "auto",
                pb: 2,
                alignItems: "flex-start",
              }}
            >
              {visibleStages.map((stage, index) => (
                <Column
                  key={stage.stageId}
                  stage={stage}
                  index={index}
                  customers={
                    byColumn[stage.stageKey] ?? []
                  }
                  onOpen={(target) =>
                    setActiveId(target)
                  }
                />
              ))}
            </Box>

            <DragOverlay>
              {dragging ? (
                <Box sx={{ width: 272 }}>
                  <PipelineCard
                    customer={dragging}
                    dragging
                    onOpen={() => undefined}
                  />
                </Box>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </Box>

      {activeId && (
        <CustomerDetailDialog
          customer={activeId}
          stages={stages}
          onClose={() => setActiveId(null)}
        />
      )}

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2500}
        onClose={() => setNotice("")}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setNotice("")}
        >
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
