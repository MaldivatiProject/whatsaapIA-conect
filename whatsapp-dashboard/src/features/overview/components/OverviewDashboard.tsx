"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label as RechartsLabel,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  MessageSquareReply,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useSessionsQuery } from "@/entities/session/model/useSessionsQuery";
import { sessionStatusLabel, sessionStatusVariant } from "@/entities/session/model/status";
import { useSessionsLiveSync } from "@/features/sessions/hooks/useSessionsLiveSync";
import { HealthCard } from "@/features/health/components/HealthCard";
import { useOverview } from "@/features/overview/hooks/useOverview";
import type {
  OverviewBucket,
  OverviewCategory,
  OverviewDelta,
  OverviewPayload,
  OverviewRule,
  OverviewSession,
  OverviewTimeseriesPoint,
} from "@/features/overview/types/overview.types";
import { Badge } from "@/shared/components/ui/badge";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/components/ui/chart";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ErrorState } from "@/shared/components/layout/ErrorState";
import { DataTable, type DataTableColumn } from "@/shared/components/data/DataTable";
import { cn } from "@/shared/lib/utils/cn";
import type { Session } from "@/shared/types/connector.types";

type RangeKey = "24h" | "7d" | "30d";

const RANGE_OPTIONS: { key: RangeKey; label: string; bucket: OverviewBucket; hours: number }[] = [
  { key: "24h", label: "24 h", bucket: "hour", hours: 24 },
  { key: "7d", label: "7 días", bucket: "day", hours: 24 * 7 },
  { key: "30d", label: "30 días", bucket: "day", hours: 24 * 30 },
];

function number(value: number) {
  return new Intl.NumberFormat("es-CO").format(value);
}

function percent(value: number) {
  return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value)}%`;
}

function compactDate(value: string, bucket: OverviewBucket) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "numeric",
    ...(bucket === "hour" ? { hour: "2-digit" as const } : {}),
  }).format(date);
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

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    COMPLETED: "Completados",
    FAILED: "Fallidos",
    ACTIONS_PENDING: "Pendientes",
  };
  return labels[status] ?? status;
}

function categoryLabel(value: string) {
  return value.replaceAll("_", " ");
}

function buildFilters(rangeKey: RangeKey, anchor: Date, sessionId: string) {
  const option = RANGE_OPTIONS.find((item) => item.key === rangeKey) ?? RANGE_OPTIONS[1];
  const from = new Date(anchor);
  from.setHours(from.getHours() - option.hours);
  return {
    from: from.toISOString(),
    to: anchor.toISOString(),
    bucket: option.bucket,
    sessionId: sessionId || undefined,
    limit: 6,
  };
}

function Trend({ delta, inverse = false }: { delta: OverviewDelta; inverse?: boolean }) {
  if (delta.change_percent === null) {
    return <span className="text-xs text-muted-foreground">Sin base previa</span>;
  }

  const improved = inverse ? delta.change <= 0 : delta.change >= 0;
  const Icon = delta.change >= 0 ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        improved ? "text-success" : "text-destructive-text",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {delta.change >= 0 ? "+" : ""}
      {percent(delta.change_percent)}
    </span>
  );
}

function MetricCard({
  title,
  value,
  detail,
  delta,
  icon: Icon,
  inverseTrend,
}: {
  title: string;
  value: number;
  detail: string;
  delta?: OverviewDelta;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  inverseTrend?: boolean;
}) {
  return (
    <Card size="sm">
      <CardHeader className="grid-cols-[1fr_auto] items-center">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold">{number(value)}</div>
        <div className="flex min-h-5 items-center justify-between gap-3">
          <span className="truncate text-xs text-muted-foreground">{detail}</span>
          {delta && <Trend delta={delta} inverse={inverseTrend} />}
        </div>
      </CardContent>
    </Card>
  );
}

function RateGauge({ label, value, color }: { label: string; value: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const data = [{ name: label, value: clamped, fill: color }];
  const config = { value: { label, color } } satisfies ChartConfig;

  return (
    <div className="flex flex-col items-center gap-1">
      <ChartContainer config={config} className="mx-auto aspect-square h-28 w-28">
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius="72%"
          outerRadius="100%"
        >
          <RadialBar dataKey="value" cornerRadius={999} background={{ fill: "var(--muted)" }} />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false} domain={[0, 100]}>
            <RechartsLabel
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-lg font-semibold">
                      {percent(clamped)}
                    </tspan>
                  </text>
                );
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </ChartContainer>
      <span className="text-center text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

const VOLUME_CHART_CONFIG = {
  processed_messages: { label: "Procesados", color: "var(--chart-3)" },
  matched_messages: { label: "Con regla", color: "var(--chart-1)" },
} satisfies ChartConfig;

function VolumeChart({
  points,
  bucket,
}: {
  points: OverviewTimeseriesPoint[];
  bucket: OverviewBucket;
}) {
  if (points.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Sin mensajes en el rango seleccionado.
      </p>
    );
  }

  const data = points.map((point) => ({
    ...point,
    label: compactDate(point.bucket_start, bucket),
  }));

  return (
    <ChartContainer config={VOLUME_CHART_CONFIG} className="aspect-auto h-72 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fill-processed_messages" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-processed_messages)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-processed_messages)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="fill-matched_messages" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-matched_messages)" stopOpacity={0.55} />
            <stop offset="95%" stopColor="var(--color-matched_messages)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={32}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickMargin={6}
          tickFormatter={(value: number) => number(value)}
          className="text-xs"
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload ? compactDate(payload[0].payload.bucket_start, bucket) : ""
              }
            />
          }
        />
        <Area
          dataKey="processed_messages"
          type="monotone"
          stroke="var(--color-processed_messages)"
          fill="url(#fill-processed_messages)"
          strokeWidth={2}
        />
        <Area
          dataKey="matched_messages"
          type="monotone"
          stroke="var(--color-matched_messages)"
          fill="url(#fill-matched_messages)"
          strokeWidth={2}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}

function RankedBars<T extends OverviewCategory | OverviewRule>({
  items,
  getKey,
  getLabel,
  getValue,
  getMeta,
  empty,
  color = "var(--chart-4)",
}: {
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getValue: (item: T) => number;
  getMeta: (item: T) => string;
  empty: string;
  color?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }

  const data = items.map((item) => ({
    key: getKey(item),
    label: getLabel(item),
    value: getValue(item),
    meta: getMeta(item),
  }));
  const config = { value: { label: "Total", color } } satisfies ChartConfig;

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: Math.max(data.length * 40, 120) }}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={132}
          tickFormatter={(value: string) => (value.length > 20 ? `${value.slice(0, 20)}…` : value)}
          className="text-xs capitalize"
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => (
                <div className="flex w-full flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-3 font-medium text-foreground">
                    <span className="capitalize">{item?.payload?.label}</span>
                    <span className="font-mono tabular-nums">{number(Number(value))}</span>
                  </div>
                  <span className="text-muted-foreground">{item?.payload?.meta}</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 6, 6, 0]} maxBarSize={22} />
      </BarChart>
    </ChartContainer>
  );
}

function StatusBreakdown({ overview }: { overview: OverviewPayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasas operativas</CardTitle>
        <CardDescription>
          {number(overview.totals.unique_conversations)} conversaciones en el rango
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <RateGauge
            label="Coincidencia de reglas"
            value={overview.totals.match_rate}
            color="var(--chart-1)"
          />
          <RateGauge
            label="Respuestas creadas"
            value={overview.totals.reply_rate}
            color="var(--success)"
          />
          <RateGauge
            label="Fallos"
            value={overview.totals.failure_rate}
            color="var(--destructive)"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          {overview.statuses.map((item) => (
            <Badge key={item.status} variant={statusVariant(item.status)}>
              {statusLabel(item.status)}: {number(item.messages)}
            </Badge>
          ))}
          {overview.statuses.length === 0 && (
            <span className="text-sm text-muted-foreground">Sin estados registrados.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionsSummary({
  overviewSessions,
  liveSessions,
}: {
  overviewSessions: OverviewSession[];
  liveSessions: Session[];
}) {
  const columns: DataTableColumn<OverviewSession>[] = [
    {
      id: "session_id",
      header: "Sesión",
      cell: (session) => session.session_id,
      exportValue: (session) => session.session_id,
      sortValue: (session) => session.session_id,
      cellClassName: "font-medium",
      pdfWidth: 160,
    },
    {
      id: "status",
      header: "Estado",
      cell: (session) => {
        const live = liveSessions.find((item) => item.id === session.session_id);
        return live ? (
          <Badge variant={sessionStatusVariant(live.status)}>
            {sessionStatusLabel(live.status)}
          </Badge>
        ) : (
          <Badge variant="outline">Sin estado vivo</Badge>
        );
      },
      exportValue: (session) => {
        const live = liveSessions.find((item) => item.id === session.session_id);
        return live ? sessionStatusLabel(live.status) : "Sin estado vivo";
      },
      sortValue: (session) => {
        const live = liveSessions.find((item) => item.id === session.session_id);
        return live ? sessionStatusLabel(live.status) : "Sin estado vivo";
      },
      pdfWidth: 110,
    },
    {
      id: "messages",
      header: "Mensajes",
      cell: (session) => number(session.messages),
      exportValue: (session) => session.messages,
      sortValue: (session) => session.messages,
      align: "right",
      pdfWidth: 90,
    },
    {
      id: "last_activity_at",
      header: "Última actividad",
      cell: (session) => dateTime(session.last_activity_at),
      exportValue: (session) => dateTime(session.last_activity_at),
      sortValue: (session) => new Date(session.last_activity_at),
      cellClassName: "text-muted-foreground",
      pdfWidth: 140,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sesiones con actividad</CardTitle>
        <CardDescription>Histórico del rango y estado actual del connector</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <DataTable
          columns={columns}
          rows={overviewSessions}
          getRowKey={(session) => session.session_id}
          emptyMessage="Sin sesiones con actividad histórica en el rango."
          exportConfig={{
            title: "Sesiones con actividad",
            filename: "inicio-sesiones-actividad",
            subtitle: "Histórico del rango y estado actual del connector",
          }}
          defaultSort={{ columnId: "messages", direction: "desc" }}
        />
      </CardContent>
    </Card>
  );
}

function RecentMessages({ overview }: { overview: OverviewPayload }) {
  return (
    <Card>
      <CardHeader className="grid-cols-[1fr_auto] items-start">
        <div>
          <CardTitle>Últimos mensajes auditados</CardTitle>
          <CardDescription>Datos persistidos en PostgreSQL</CardDescription>
        </div>
        <Link href="/reports" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Ver reportes
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {overview.recent_messages.map((message) => (
          <div key={message.id} className="rounded-md border p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(message.status)}>{statusLabel(message.status)}</Badge>
                  <Badge variant="outline">{message.session_id}</Badge>
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {message.sender || message.raw_sender || message.conversation_id}
                </p>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground" dateTime={message.created_at}>
                {dateTime(message.created_at)}
              </time>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(message.matched_categories.length ? message.matched_categories : ["unmatched"]).map(
                (category) => (
                  <Badge key={category} variant="outline" className="capitalize">
                    {categoryLabel(category)}
                  </Badge>
                ),
              )}
            </div>
          </div>
        ))}
        {overview.recent_messages.length === 0 && (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            Sin mensajes auditados en el rango.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingOverview() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}

export function OverviewDashboard() {
  useSessionsLiveSync();
  const [rangeKey, setRangeKey] = useState<RangeKey>("7d");
  const [anchor, setAnchor] = useState(() => new Date());
  const [sessionId, setSessionId] = useState("");
  const filters = useMemo(() => buildFilters(rangeKey, anchor, sessionId), [
    anchor,
    rangeKey,
    sessionId,
  ]);
  const { data: sessions = [] } = useSessionsQuery();
  const { overview, isLoading, isFetching, error } = useOverview(filters);
  const liveOpenCount = sessions.filter((session) => session.status === "open").length;

  function refresh() {
    setAnchor(new Date());
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Inicio</h1>
          <p className="text-sm text-muted-foreground">
            Histórico operacional, automatización y salud actual de WhatsApp.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_minmax(180px,260px)_auto] sm:items-end">
          <div className="space-y-2">
            <Label>Rango</Label>
            <div className="flex rounded-lg border bg-card p-1">
              {RANGE_OPTIONS.map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  variant={rangeKey === option.key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setRangeKey(option.key);
                    setAnchor(new Date());
                  }}
                  className="h-7 rounded-md px-3"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="overview-session">Sesión</Label>
            <Select
              value={sessionId || "all"}
              onValueChange={(next) => setSessionId(next === "all" ? "" : String(next))}
            >
              <SelectTrigger id="overview-session" className="h-8 w-full">
                <SelectValue>
                  {(value: unknown) => {
                    if (value === "all") return "Todas";
                    const session = sessions.find((item) => item.id === value);
                    return session ? `${session.id} - ${sessionStatusLabel(session.status)}` : "Todas";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.id} - {sessionStatusLabel(session.status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="gap-2" onClick={refresh} disabled={isFetching}>
            <RefreshCcw className={cn("h-4 w-4", isFetching && "animate-spin")} aria-hidden />
            Actualizar
          </Button>
        </div>
      </div>

      {error && <ErrorState message={`No se pudo cargar el resumen: ${error.message}`} />}

      {isLoading && !overview && <LoadingOverview />}

      {overview && (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Mensajes procesados"
              value={overview.totals.processed_messages}
              detail={`${number(overview.totals.unique_conversations)} conversaciones`}
              delta={overview.comparison.processed_messages}
              icon={BarChart3}
            />
            <MetricCard
              title="Con regla"
              value={overview.totals.matched_messages}
              detail={`${percent(overview.totals.match_rate)} de coincidencia`}
              delta={overview.comparison.matched_messages}
              icon={CheckCircle2}
            />
            <MetricCard
              title="Respuestas"
              value={overview.totals.replies_sent_or_queued}
              detail={`${percent(overview.totals.reply_rate)} por mensaje`}
              delta={overview.comparison.replies_sent_or_queued}
              icon={MessageSquareReply}
            />
            <MetricCard
              title="Fallos"
              value={overview.totals.failed_replies}
              detail={`${percent(overview.totals.failure_rate)} del tráfico`}
              delta={overview.comparison.failed_replies}
              icon={AlertTriangle}
              inverseTrend
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
            <Card>
              <CardHeader className="grid-cols-[1fr_auto] items-start">
                <div>
                  <CardTitle>Volumen histórico</CardTitle>
                  <CardDescription>
                    {dateTime(overview.range.from)} - {dateTime(overview.range.to)}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {overview.range.bucket === "hour" ? "Hora" : "Día"}
                </Badge>
              </CardHeader>
              <CardContent>
                <VolumeChart points={overview.timeseries} bucket={overview.range.bucket} />
              </CardContent>
            </Card>

            <StatusBreakdown overview={overview} />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Categorías</CardTitle>
                <CardDescription>{number(overview.totals.business_messages)} resultados de negocio</CardDescription>
              </CardHeader>
              <CardContent>
                <RankedBars
                  items={overview.categories}
                  getKey={(item) => item.category}
                  getLabel={(item) => categoryLabel(item.category)}
                  getValue={(item) => item.messages}
                  getMeta={(item) =>
                    `${number(item.replies_sent_or_queued)} respuestas · ${number(
                      item.failed_replies,
                    )} fallos`
                  }
                  empty="Sin categorías en el rango."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reglas más activas</CardTitle>
                <CardDescription>Coincidencias auditadas en la base de datos</CardDescription>
              </CardHeader>
              <CardContent>
                <RankedBars
                  items={overview.rules}
                  getKey={(item) => item.rule_id}
                  getLabel={(item) => item.rule_name}
                  getValue={(item) => item.matches}
                  getMeta={(item) =>
                    `${categoryLabel(item.category)} · ${number(
                      item.replies_sent_or_queued,
                    )} respuestas`
                  }
                  empty="Sin reglas ejecutadas en el rango."
                  color="var(--chart-5)"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operación viva</CardTitle>
                <CardDescription>
                  {liveOpenCount} / {sessions.length} sesiones conectadas ahora
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" aria-hidden />
                    Sesiones activas en histórico
                  </span>
                  <span className="font-semibold">{number(overview.totals.active_sessions)}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bot className="h-4 w-4" aria-hidden />
                    Pendientes de acción
                  </span>
                  <span className="font-semibold">{number(overview.totals.pending_replies)}</span>
                </div>
                <Link
                  href="/sessions"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "justify-start gap-2",
                  )}
                >
                  Administrar sesiones
                </Link>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <SessionsSummary overviewSessions={overview.sessions} liveSessions={sessions} />
            <RecentMessages overview={overview} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.7fr)_minmax(0,1.3fr)]">
            <HealthCard />
            <Card>
              <CardHeader>
                <CardTitle>Lectura del periodo</CardTitle>
                <CardDescription>Comparado contra el periodo inmediatamente anterior</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Sin coincidencia</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {number(overview.totals.unmatched_messages)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Completados</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {number(overview.totals.completed_messages)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
