"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { TablePagination } from "@/shared/components/layout/TablePagination";
import { usePagination } from "@/shared/hooks/usePagination";
import type { ReportMessage, ReportsPayload } from "@/features/reports/types/report.types";

function number(value: number) {
  return new Intl.NumberFormat("es-CO").format(value);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusVariant(status: string): "success" | "destructive" | "outline" | "secondary" {
  if (status === "COMPLETED") return "success";
  if (status === "FAILED") return "destructive";
  if (status === "ACTIONS_PENDING") return "secondary";
  return "outline";
}

type MessageSortKey = "created_at" | "session_id" | "status" | "replies_sent_or_queued";

function SortableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: MessageSortKey;
  activeKey: MessageSortKey;
  direction: "asc" | "desc";
  onSort: (key: MessageSortKey) => void;
}) {
  const isActive = activeKey === sortKey;
  const Icon = isActive ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort(sortKey)}
        className="-ml-2.5 h-auto gap-1 px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </TableHead>
  );
}

function sortMessages(
  messages: ReportMessage[],
  key: MessageSortKey,
  direction: "asc" | "desc",
): ReportMessage[] {
  const sorted = [...messages].sort((a, b) => {
    if (key === "created_at") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (key === "replies_sent_or_queued") {
      return a.replies_sent_or_queued - b.replies_sent_or_queued;
    }
    return a[key].localeCompare(b[key]);
  });
  return direction === "asc" ? sorted : sorted.reverse();
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{number(value)}</div>
      </CardContent>
    </Card>
  );
}

export function ReportsDashboard({ reports }: { reports: ReportsPayload }) {
  const { summary, messages, categories, rules, deliveries } = reports;
  const [sortKey, setSortKey] = useState<MessageSortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  function handleSort(key: MessageSortKey) {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const sortedMessages = useMemo(
    () => sortMessages(messages, sortKey, sortDirection),
    [messages, sortKey, sortDirection],
  );
  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(
    sortedMessages,
    10,
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Mensajes procesados" value={summary.processed_messages} />
        <MetricCard label="Mensajes con regla" value={summary.matched_messages} />
        <MetricCard label="Sin coincidencia" value={summary.unmatched_messages} />
        <MetricCard label="Respuestas enviadas/en cola" value={summary.replies_sent_or_queued} />
        <MetricCard label="Completados" value={summary.completed_messages} />
        <MetricCard label="Pendientes" value={summary.pending_replies} />
        <MetricCard label="Fallidos" value={summary.failed_replies} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mensajes por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Mensajes</TableHead>
                  <TableHead>Con regla</TableHead>
                  <TableHead>Respuestas</TableHead>
                  <TableHead>Fallos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((item) => (
                  <TableRow key={item.category}>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>{number(item.messages)}</TableCell>
                    <TableCell>{number(item.matched_messages)}</TableCell>
                    <TableCell>{number(item.replies_sent_or_queued)}</TableCell>
                    <TableCell>{number(item.failed_replies)}</TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Sin datos para el rango seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reglas con más coincidencias</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regla</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead>Respuestas</TableHead>
                  <TableHead>Fallos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((item) => (
                  <TableRow key={item.rule_id}>
                    <TableCell>{item.rule_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>{number(item.matches)}</TableCell>
                    <TableCell>{number(item.replies_sent_or_queued)}</TableCell>
                    <TableCell>{number(item.failed_replies)}</TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Sin reglas ejecutadas para el rango seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Estado de entregas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {deliveries.map((item) => (
              <Badge key={item.status} variant={statusVariant(item.status)}>
                {item.status}: {number(item.messages)}
              </Badge>
            ))}
            {deliveries.length === 0 && (
              <span className="text-sm text-muted-foreground">Sin entregas registradas.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Últimos mensajes procesados</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Fecha"
                  sortKey="created_at"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHead
                  label="Sesión"
                  sortKey="session_id"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <TableHead>Remitente</TableHead>
                <TableHead>Categorías</TableHead>
                <SortableHead
                  label="Estado"
                  sortKey="status"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHead
                  label="Respuestas"
                  sortKey="replies_sent_or_queued"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>{dateTime(message.created_at)}</TableCell>
                  <TableCell>{message.session_id}</TableCell>
                  <TableCell className="max-w-64 truncate font-mono text-xs">
                    {message.sender || message.raw_sender || message.conversation_id}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(message.matched_categories.length
                        ? message.matched_categories
                        : ["unmatched"]
                      ).map((category) => (
                        <Badge key={category} variant="outline">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(message.status)}>{message.status}</Badge>
                  </TableCell>
                  <TableCell>{number(message.replies_sent_or_queued)}</TableCell>
                </TableRow>
              ))}
              {messages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Sin mensajes procesados para el rango seleccionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}

