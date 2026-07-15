"use client";

import { DataTable, type DataTableColumn } from "@/shared/components/data/DataTable";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type {
  ReportCategory,
  ReportMessage,
  ReportRule,
  ReportsPayload,
} from "@/features/reports/types/report.types";

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
  const categoryColumns: DataTableColumn<ReportCategory>[] = [
    {
      id: "category",
      header: "Categoría",
      cell: (item) => <Badge variant="outline">{item.category}</Badge>,
      exportValue: (item) => item.category,
      sortValue: (item) => item.category,
      pdfWidth: 150,
    },
    {
      id: "messages",
      header: "Mensajes",
      cell: (item) => number(item.messages),
      exportValue: (item) => item.messages,
      sortValue: (item) => item.messages,
      align: "right",
      pdfWidth: 90,
    },
    {
      id: "matched_messages",
      header: "Con regla",
      cell: (item) => number(item.matched_messages),
      exportValue: (item) => item.matched_messages,
      sortValue: (item) => item.matched_messages,
      align: "right",
      pdfWidth: 90,
    },
    {
      id: "replies_sent_or_queued",
      header: "Respuestas",
      cell: (item) => number(item.replies_sent_or_queued),
      exportValue: (item) => item.replies_sent_or_queued,
      sortValue: (item) => item.replies_sent_or_queued,
      align: "right",
      pdfWidth: 95,
    },
    {
      id: "failed_replies",
      header: "Fallos",
      cell: (item) => number(item.failed_replies),
      exportValue: (item) => item.failed_replies,
      sortValue: (item) => item.failed_replies,
      align: "right",
      pdfWidth: 80,
    },
  ];
  const ruleColumns: DataTableColumn<ReportRule>[] = [
    {
      id: "rule_name",
      header: "Regla",
      cell: (item) => item.rule_name,
      exportValue: (item) => item.rule_name,
      sortValue: (item) => item.rule_name,
      pdfWidth: 160,
    },
    {
      id: "category",
      header: "Categoría",
      cell: (item) => <Badge variant="outline">{item.category}</Badge>,
      exportValue: (item) => item.category,
      sortValue: (item) => item.category,
      pdfWidth: 120,
    },
    {
      id: "matches",
      header: "Matches",
      cell: (item) => number(item.matches),
      exportValue: (item) => item.matches,
      sortValue: (item) => item.matches,
      align: "right",
      pdfWidth: 85,
    },
    {
      id: "replies_sent_or_queued",
      header: "Respuestas",
      cell: (item) => number(item.replies_sent_or_queued),
      exportValue: (item) => item.replies_sent_or_queued,
      sortValue: (item) => item.replies_sent_or_queued,
      align: "right",
      pdfWidth: 95,
    },
    {
      id: "failed_replies",
      header: "Fallos",
      cell: (item) => number(item.failed_replies),
      exportValue: (item) => item.failed_replies,
      sortValue: (item) => item.failed_replies,
      align: "right",
      pdfWidth: 80,
    },
  ];
  const messageColumns: DataTableColumn<ReportMessage>[] = [
    {
      id: "created_at",
      header: "Fecha",
      cell: (message) => dateTime(message.created_at),
      exportValue: (message) => dateTime(message.created_at),
      sortValue: (message) => new Date(message.created_at),
      pdfWidth: 95,
    },
    {
      id: "session_id",
      header: "Sesión",
      cell: (message) => message.session_id,
      exportValue: (message) => message.session_id,
      sortValue: (message) => message.session_id,
      pdfWidth: 110,
    },
    {
      id: "sender",
      header: "Remitente",
      cell: (message) => message.sender || message.raw_sender || message.conversation_id,
      exportValue: (message) => message.sender || message.raw_sender || message.conversation_id,
      sortValue: (message) => message.sender || message.raw_sender || message.conversation_id,
      cellClassName: "max-w-64 truncate font-mono text-xs",
      pdfWidth: 155,
    },
    {
      id: "matched_categories",
      header: "Categorías",
      cell: (message) => (
        <div className="flex flex-wrap gap-1">
          {(message.matched_categories.length ? message.matched_categories : ["unmatched"]).map(
            (category) => (
              <Badge key={category} variant="outline">
                {category}
              </Badge>
            ),
          )}
        </div>
      ),
      exportValue: (message) =>
        (message.matched_categories.length ? message.matched_categories : ["unmatched"]).join(", "),
      sortValue: (message) =>
        (message.matched_categories.length ? message.matched_categories : ["unmatched"]).join(", "),
      pdfWidth: 135,
    },
    {
      id: "status",
      header: "Estado",
      cell: (message) => <Badge variant={statusVariant(message.status)}>{message.status}</Badge>,
      exportValue: (message) => message.status,
      sortValue: (message) => message.status,
      pdfWidth: 115,
    },
    {
      id: "replies_sent_or_queued",
      header: "Respuestas",
      cell: (message) => number(message.replies_sent_or_queued),
      exportValue: (message) => message.replies_sent_or_queued,
      sortValue: (message) => message.replies_sent_or_queued,
      align: "right",
      pdfWidth: 85,
    },
  ];

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
            <DataTable
              columns={categoryColumns}
              rows={categories}
              getRowKey={(item) => item.category}
              emptyMessage="Sin datos para el rango seleccionado."
              exportConfig={{
                title: "Mensajes por categoría",
                filename: "reporte-categorias",
              }}
              defaultSort={{ columnId: "messages", direction: "desc" }}
              exportClassName="px-0"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reglas con más coincidencias</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={ruleColumns}
              rows={rules}
              getRowKey={(item) => item.rule_id}
              emptyMessage="Sin reglas ejecutadas para el rango seleccionado."
              exportConfig={{
                title: "Reglas con más coincidencias",
                filename: "reporte-reglas",
              }}
              defaultSort={{ columnId: "matches", direction: "desc" }}
              exportClassName="px-0"
            />
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
          <DataTable
            columns={messageColumns}
            rows={messages}
            getRowKey={(message) => message.id}
            emptyMessage="Sin mensajes procesados para el rango seleccionado."
            exportConfig={{
              title: "Últimos mensajes procesados",
              filename: "reporte-mensajes",
            }}
            defaultSort={{ columnId: "created_at", direction: "desc" }}
            pagination={{ pageSize: 10 }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
