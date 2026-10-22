"use client";

import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ReactNode } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import type {
  Active,
  CollisionDetection,
  Over,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { useVirtualizer } from "@tanstack/react-virtual";

import type { KanbanStage } from "@/lib/types";

export interface KanbanCardState {
  /*
   * true = ตัวการ์ดต้นฉบับถูกลากอยู่ ต้องซ่อนตัวเอง
   */
  ghost: boolean;

  /*
   * true = ตัวที่ถูกลาก (อยู่ใน DragOverlay)
   */
  dragging: boolean;
}

export interface KanbanBoardProps<T> {
  items: T[];

  /*
   * คอลัมน์ของบอร์ด (มาจาก DB)
   */
  stages: KanbanStage[];

  /*
   * id ของ item (ใช้เป็น key ตอนลาก)
   */
  getId: (item: T) => number;

  /*
   * key ของคอลัมน์ที่ item อยู่ปัจจุบัน
   */
  getColumnKey: (item: T) => string;

  /*
   * เรียกเมื่อปล่อยการ์ดลงคอลัมน์ใหม่
   * ต้อง refetch ข้อมูลจริงให้เสร็จก่อน resolve
   * เพื่อให้ค่าจาก server เป็นตัวตัดสินแทนค่าชั่วคราวระหว่างลาก
   */
  onColumnChange: (
    id: number,
    columnKey: string,
  ) => Promise<void>;

  renderCard: (
    item: T,
    state: KanbanCardState,
  ) => ReactNode;

  emptyColumnLabel?: string;
  cardHeight?: number;
  columnWidth?: number;
}

/*
 * collision detection สำหรับ Kanban:
 * - ถ้า cursor อยู่ใน target จริง ให้ใช้อันนั้นก่อน (ลื่นสุด ตามตำแหน่งเมาส์)
 * - ถ้าไม่มี ค่อย fallback เป็นระยะ/recently intersection
 * - สุดท้าย closestCorners กันพิญตอน header/empty state
 */
const kanbanCollision: CollisionDetection = (
  args,
) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  const rectCollisions = rectIntersection(args);

  if (rectCollisions.length > 0) {
    return rectCollisions;
  }

  return closestCorners(args);
};

const CARD_GAP = 1.25;
const DEFAULT_CARD_HEIGHT = 148;
const DEFAULT_COLUMN_WIDTH = 280;

/*
 * สีของคอลัมน์ที่ไม่ได้อยู่ในตาราง stage
 * (ข้อมูลเก่าที่ยังไม่ถูก migrate)
 */
const FALLBACK_COLUMN_COLOR = "#94a3b8";

interface BoardColumn {
  key: string;
  label: string;
  color: string;
}

function SortableCard<T>({
  item,
  getId,
  renderCard,
}: {
  item: T;
  getId: (item: T) => number;
  renderCard: (
    item: T,
    state: KanbanCardState,
  ) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getId(item),
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(
          transform,
        ),
        // ไม่ต้องมี transition ตอน-active drag เพราะ dnd-kit คุม transform เอง
        transition: isDragging
          ? undefined
          : transition ||
            "transform 150ms cubic-bezier(0.2, 1, 0.3, 1), opacity 150ms ease",
        willChange: "transform",
      }}
      {...attributes}
      {...listeners}
    >
      {renderCard(item, {
        ghost: isDragging,
        dragging: false,
      })}
    </div>
  );
}

const MemoSortableCard = memo(SortableCard) as typeof SortableCard;

function Column<T>({
  column,
  items,
  getId,
  renderCard,
  emptyColumnLabel,
  cardHeight,
  columnWidth,
}: {
  column: BoardColumn;
  items: T[];
  getId: (item: T) => number;
  renderCard: (
    item: T,
    state: KanbanCardState,
  ) => ReactNode;
  emptyColumnLabel?: string;
  cardHeight: number;
  columnWidth: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.key,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual ไม่สามารถ memoize ได้ แต่ Column ไม่ถูกส่งต่อไปยัง component ที่ memoize
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => cardHeight + CARD_GAP,
    overscan: 5,
  });

  return (
    <Box
      data-testid="pipeline-column"
      data-status={column.key}
      sx={{
        width: columnWidth,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 140px)",
        bgcolor: isOver
          ? "#eff6ff"
          : "transparent",
        transition: "background 150ms ease",
      }}
    >
      <Box
        sx={{
          mb: 1,
          px: 1.5,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "#f1f5f9",
          borderRadius: "8px",
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: column.color,
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
          {column.label}
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
            fontSize: 11,
            fontWeight: 800,
            color: "#475569",
          }}
        >
          {items.length}
        </Box>
      </Box>

      <Box
        ref={(node: HTMLDivElement | null) => {
          setNodeRef(node);
          scrollRef.current = node;
        }}
        sx={{
          flex: 1,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
            width: 0,
            height: 0,
          },
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          pb: 1,
          pr: 0.5,
        }}
      >
        <SortableContext
          items={items.map((item) => getId(item))}
          strategy={verticalListSortingStrategy}
        >
          <Box
            sx={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer
              .getVirtualItems()
              .map((virtualItem) => {
                const item = items[virtualItem.index];

                return (
                  <Box
                    key={getId(item)}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      /*
                       * ต้องเป็น paddingBottom ไม่ใช่ marginBottom
                       * เพราะ measureElement อ่าน border-box (รวม padding ไม่รวม margin)
                       * ใช้ margin แล้ว gap จะไม่นับเข้า item size การ์ดตัวถัดมาจะมาซ้อนทับ
                       */
                      paddingBottom: CARD_GAP,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <MemoSortableCard
                      item={item}
                      getId={getId}
                      renderCard={renderCard}
                    />
                  </Box>
                );
              })}
          </Box>
        </SortableContext>

        {items.length === 0 && (
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
              {emptyColumnLabel}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

const MemoColumn = memo(Column) as typeof Column;

/* =====================================================
   BOARD
   ====================================================== */

export default function KanbanBoard<T>({
  items,
  stages,
  getId,
  getColumnKey,
  onColumnChange,
  renderCard,
  emptyColumnLabel,
  cardHeight = DEFAULT_CARD_HEIGHT,
  columnWidth = DEFAULT_COLUMN_WIDTH,
}: KanbanBoardProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  /*
   * สถานะที่ "กำลังรอการบันทึก" ของแต่ละ item
   * ใช้ทับค่าจริงระหว่างลาก เพื่อให้การ์ดขยับคอลัมน์ทันที
   * โดยไม่ต้องแตะ SWR cache
   */
  const [pending, setPending] = useState<
    Record<number, string>
  >({});

  const [dragging, setDragging] =
    useState<T | null>(null);

  /*
   * เก็บสถานะต้นทางของ card ที่ลากอยู่ ตอน drag ระหว่างคอลัมน์
   * ถ้า drop ไม่สำเร็จหรือ cancel ต้องเอากลับเป็นค่าเดิม
   */
  const dragOriginColumn = useRef<string | null>(
    null,
  );

  const itemById = useMemo(() => {
    const map = new Map<number, T>();

    for (const item of items) {
      map.set(getId(item), item);
    }

    return map;
  }, [items, getId]);

  /*
   * สถานะที่ "มีผลจริง" ณ ตอนนี้ (รวมสถานะที่กำลังรอบันทึก)
   */
  const effectiveColumnKey = useCallback(
    (item: T) =>
      pending[getId(item)] ?? getColumnKey(item),
    [pending, getId, getColumnKey],
  );

  /*
   * คอลัมน์ = stage จาก DB
   * ถ้ามี item ที่คอลัมน์ไม่ตรงกับ stage ใดเลย ให้เพิ่มคอลัมน์พิเศษให้
   * เพื่อไม่ให้ item หายไปจากบอร์ด
   */
  const columns = useMemo<BoardColumn[]>(() => {
    const result: BoardColumn[] = stages.map(
      (stage) => ({
        key: stage.stageKey,
        label: stage.label,
        color: stage.color,
      }),
    );

    const known = new Set(
      result.map((column) => column.key),
    );

    for (const item of items) {
      const columnKey = effectiveColumnKey(item);

      if (known.has(columnKey)) {
        continue;
      }

      known.add(columnKey);

      result.push({
        key: columnKey,
        label: columnKey,
        color: FALLBACK_COLUMN_COLOR,
      });
    }

    return result;
  }, [stages, items, effectiveColumnKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, T[]>();

    for (const column of columns) {
      map.set(column.key, []);
    }

    for (const item of items) {
      const columnKey = effectiveColumnKey(item);
      const list = map.get(columnKey);

      if (!list) {
        continue;
      }

      list.push(item);
    }

    return map;
  }, [columns, items, effectiveColumnKey]);

  /*
   * ล้างค่าชั่วคราวของ item นั้น
   * ใช้ตอนลากเสร็จแล้ว (ไม่ว่าจะสำเร็จหรือไม่)
   * เพราะ parent refetch ข้อมูลจริงกลับมาแล้ว ค่าจาก server จึงเป็นตัวตัดสิน
   */
  const clearPending = useCallback(
    (id: number) => {
      setPending((current) => {
        if (!(id in current)) {
          return current;
        }

        const next = { ...current };
        delete next[id];
        return next;
      });
    },
    [],
  );

  /*
   * หาว่าเป้าหมายที่ปล่อยการ์ดทับอยู่คือคอลัมน์ไหน
   * ลากไปวางบนการ์ดอื่นได้ โดยถือว่าต้องการเข้าแถวเดียวกัน
   */
  const resolveTargetColumn = useCallback(
    (overId: number | string): string | null => {
      const asColumn = String(overId);

      if (
        columns.some(
          (column) => column.key === asColumn,
        )
      ) {
        return asColumn;
      }

      const numeric = Number(overId);

      if (Number.isNaN(numeric)) {
        return null;
      }

      const overItem = itemById.get(numeric);

      if (!overItem) {
        return null;
      }

      return effectiveColumnKey(overItem);
    },
    [columns, itemById, effectiveColumnKey],
  );

  function handleDragStart(event: {
    active: Active;
  }) {
    const id = Number(event.active.id);

    const item = itemById.get(id);

    dragOriginColumn.current =
      item ? effectiveColumnKey(item) : null;

    setDragging(item ?? null);
  }

  /*
   * ขณะลากผ่านคอลัมน์อื่น ให้ย้ายการ์ดไปอยู่ใน target column ทันที
   * เพื่อให้รู้สึกลื่น ไม่หน่วงรอตอนปล่อย
   */
  function handleDragOver(event: {
    active: Active;
    over: Over | null;
  }) {
    const activeId = Number(event.active.id);

    if (!event.over || Number.isNaN(activeId)) {
      return;
    }

    const targetColumn = resolveTargetColumn(
      event.over.id,
    );

    if (!targetColumn) {
      return;
    }

    const activeItem = itemById.get(activeId);

    if (
      !activeItem ||
      effectiveColumnKey(activeItem) ===
        targetColumn
    ) {
      return;
    }

    setPending((current) => ({
      ...current,
      [activeId]: targetColumn,
    }));
  }

  async function handleDragEnd(event: {
    active: Active;
    over: Over | null;
  }) {
    const activeId = Number(event.active.id);

    setDragging(null);

    const originColumn = dragOriginColumn.current;

    dragOriginColumn.current = null;

    if (!event.over || Number.isNaN(activeId)) {
      // ปล่อยนอกพื้นที่ที่ยอมรับได้ -> เอากลับคอลัมน์เดิมทันที
      clearPending(activeId);

      return;
    }

    const targetColumn = resolveTargetColumn(
      event.over.id,
    );

    if (!targetColumn) {
      clearPending(activeId);

      return;
    }

    /*
     * เทียบกับสถานะต้นทาง ไม่ใช่สถานะปัจจุบัน
     * เพราะอาจถูกล่วงระหว่าง drag-over แล้ว ถ้าเทียบกับสถานะปัจจุบันจะไม่ยิง API
     */
    if (
      !originColumn ||
      originColumn === targetColumn
    ) {
      clearPending(activeId);

      return;
    }

    setPending((current) => ({
      ...current,
      [activeId]: targetColumn,
    }));

    /*
     * รอให้ parent บันทึกเสร็จและ refetch ข้อมูลจริงกลับมา
     * แล้วค่อยเลิกใช้ค่าชั่วคราว
     * ถ้าบันทึกไม่สำเร็จ parent จะดึงข้อมูลเดิมกลับมา
     * การ์ดก็จะกลับคอลัมน์เดิมเอง
     */
    await onColumnChange(activeId, targetColumn);

    clearPending(activeId);
  }

  function handleDragCancel() {
    const activeId = dragging ? getId(dragging) : null;

    setDragging(null);

    dragOriginColumn.current = null;

    if (!activeId) {
      return;
    }

    clearPending(activeId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Box
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          pb: 2,
          alignItems: "flex-start",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
            width: 0,
            height: 0,
          },
        }}
      >
        {columns.map((column) => (
          <MemoColumn
            key={column.key}
            column={column}
            items={grouped.get(column.key) ?? []}
            getId={getId}
            renderCard={renderCard}
            emptyColumnLabel={emptyColumnLabel}
            cardHeight={cardHeight}
            columnWidth={columnWidth}
          />
        ))}
      </Box>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing:
            "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
      >
        {dragging ? (
          <Box
            sx={{
              width: columnWidth,
              transform: "rotate(3deg)",
              cursor: "grabbing",
              "& > *": {
                pointerEvents: "none",
              },
            }}
          >
            {renderCard(dragging, {
              ghost: false,
              dragging: true,
            })}
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
