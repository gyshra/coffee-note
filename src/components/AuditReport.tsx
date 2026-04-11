/**
 * AuditReport.tsx — 브루잉 감사 리포트 (Module D)
 *
 * ── 수정 이력 (코드 리뷰 반영) ──
 * [Fix 1] Rules of Hooks: 조건부 return을 모든 Hook 호출 이후로 이동
 * [Fix 2] generateInsights: 동일 스텝 물+시간 동시 초과 시 복합 메시지 병합
 * [Fix 3] NaN/undefined 방어: totalElapsedMs·plannedTotalMs → isFinite guard
 * [Fix 4] devAuditLog side-effect: useMemo → useEffect로 분리
 * [Fix 5] 배경 그라데이션 + grain texture로 Module C 톤앤매너 통합
 * [Fix 7] AnimatePresence: 컴포넌트 자체를 motion.div로 래핑,
 *         부모에서 <AnimatePresence> 한 줄로 끊김 없는 전환 가능하도록 설계
 */

'use client';

import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { BrewStep } from '../hooks/useBrewTimer';
import type { AuditRecord } from '../hooks/useVoiceSync';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AuditReportProps {
  steps:          BrewStep[];
  auditLog:       AuditRecord[];
  totalElapsedMs: number;   // Module A 주입 — runtime undefined 방어 내부 처리
  plannedTotalMs: number;   // Module A 주입
  methodName?:    string;
  onClose?:       () => void;
}

// ── 내부 타입 ─────────────────────────────────────────────────────────────────

interface MergedRow {
  stepIndex:        number;
  action:           string;
  plannedWaterMl:   number | null;
  actualWaterMl:    number | null;
  waterVariancePct: number | null;
  plannedEndMs:     number;
  actualTimeMs:     number | null;
  timeVariancePct:  number | null;
  inputMethod:      'voice' | 'manual' | 'skipped' | 'missing';
  hasData:          boolean;
}

interface Insight {
  stepIndex: number;
  action:    string;
  message:   string;
  severity:  'warn' | 'info';
}

type Grade = 'A' | 'B' | 'C' | 'D';

// ── 유틸리티 ──────────────────────────────────────────────────────────────────

function parseTimeMs(t: string): number {
  const [m, s] = (t ?? '0:0').split(':').map(Number);
  return ((m || 0) * 60 + (s || 0)) * 1000;
}

/** Variance(%) = (|Actual − Plan| / Plan) × 100  ÷0 방지 */
function calcVariancePct(actual: number, plan: number): number | null {
  if (!isFinite(plan) || plan === 0) return null;
  return Math.round((Math.abs(actual - plan) / plan) * 1000) / 10;
}

function fmtMs(ms: number): string {
  // [Fix 3] NaN/Infinity 방어
  const safe = isFinite(ms) ? Math.max(0, ms) : 0;
  const s = Math.floor(safe / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtSec(ms: number): string {
  return `${Math.round(Math.abs(isFinite(ms) ? ms : 0) / 1000)}초`;
}

function gradeOf(avg: number | null): Grade {
  if (avg === null) return 'D';
  if (avg <  5)     return 'A';
  if (avg < 10)     return 'B';
  if (avg < 20)     return 'C';
  return 'D';
}

const GRADE_META: Record<Grade, { color: string; label: string; desc: string }> = {
  A: { color: '#4ade80', label: '완벽한 추출',    desc: '평균 오차 5% 미만'  },
  B: { color: '#60a5fa', label: '양호한 추출',    desc: '평균 오차 5–10%'    },
  C: { color: '#fbbf24', label: '개선 여지 있음', desc: '평균 오차 10–20%'   },
  D: { color: '#f87171', label: '많은 편차 발생', desc: '평균 오차 20% 초과' },
};

// Module C의 done 테마와 연속되는 배경 — 시각적 단절 방지 [Fix 5]
const REPORT_BG = 'linear-gradient(160deg, #020617 0%, #0a1628 50%, #020617 100%)';

// Module C와 동일한 grain texture 데이터 URI [Fix 5]
const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// ── Plan × Actual Null-safe Join ──────────────────────────────────────────────

function buildRows(steps: BrewStep[], auditLog: AuditRecord[]): MergedRow[] {
  return steps.map((step, i) => {
    const record      = auditLog.find(r => r.stepIndex === i) ?? null;
    const hasData     = record !== null && record.inputMethod !== 'missing';
    const inputMethod = (record?.inputMethod ?? 'missing') as MergedRow['inputMethod'];
    const plannedEndMs  = parseTimeMs(step.time);
    const actualWaterMl = hasData ? (record!.actualWaterMl ?? null) : null;
    const actualTimeMs  = hasData ? (record!.actualTimeMs  ?? null) : null;

    return {
      stepIndex:        i,
      action:           step.action,
      plannedWaterMl:   step.waterMl,
      actualWaterMl,
      waterVariancePct:
        step.waterMl !== null && actualWaterMl !== null
          ? calcVariancePct(actualWaterMl, step.waterMl)
          : null,
      plannedEndMs,
      actualTimeMs,
      timeVariancePct:
        actualTimeMs !== null && plannedEndMs > 0
          ? calcVariancePct(actualTimeMs, plannedEndMs)
          : null,
      inputMethod,
      hasData,
    };
  });
}

// ── [Fix 2] 인사이트 생성 — 복합 상태 병합 처리 ──────────────────────────────
//
// 동일 스텝에서 물+시간이 동시에 10% 초과하면 두 카드가 아니라
// 복합 맥락 메시지 1개로 병합 → 혼란 방지 및 행동 가이드 명확화

function generateInsights(rows: MergedRow[]): Insight[] {
  const out: Insight[] = [];

  rows.forEach(row => {
    const waterOver = row.waterVariancePct !== null && row.waterVariancePct > 10;
    const timeOver  = row.timeVariancePct  !== null && row.timeVariancePct  > 10;

    // ── 복합 케이스: 물 + 시간 동시 초과 → 통합 메시지 ──
    if (waterOver && timeOver) {
      const waterDiff = Math.round((row.actualWaterMl ?? 0) - (row.plannedWaterMl ?? 0));
      const timeDiffMs = (row.actualTimeMs ?? 0) - row.plannedEndMs;
      const waterMore = waterDiff > 0;
      const timeLate  = timeDiffMs > 0;

      // 물 과다 + 시간 지연 → 가장 강한 경고
      // 물 부족 + 시간 빠름 → 연한 추출 복합
      // 물 과다 + 시간 빠름 → 상충 상태 (빠르게 많이 부은 것)
      // 물 부족 + 시간 지연 → 천천히 적게 부은 것
      let message: string;
      if (waterMore && timeLate) {
        message = `'${row.action}'에서 ${Math.abs(waterDiff)}ml 더 투입되고 ${fmtSec(timeDiffMs)} 지연됐습니다. 과다 추출로 인한 쓴맛이 강하게 나타날 수 있습니다.`;
      } else if (!waterMore && !timeLate) {
        message = `'${row.action}'에서 ${Math.abs(waterDiff)}ml 적게 투입되고 ${fmtSec(timeDiffMs)} 빨랐습니다. 연한 추출(Under-extraction)로 신맛이 날 수 있습니다.`;
      } else if (waterMore && !timeLate) {
        message = `'${row.action}'에서 ${Math.abs(waterDiff)}ml 더 투입됐지만 ${fmtSec(timeDiffMs)} 빨리 마쳤습니다. 붓는 속도가 너무 빨랐는지 확인하세요.`;
      } else {
        message = `'${row.action}'에서 ${Math.abs(waterDiff)}ml 적게 투입됐지만 ${fmtSec(timeDiffMs)} 지연됐습니다. 다음엔 붓는 속도와 양을 함께 조절하세요.`;
      }

      out.push({
        stepIndex: row.stepIndex,
        action:    row.action,
        severity:  (row.waterVariancePct! > 20 || row.timeVariancePct! > 20) ? 'warn' : 'info',
        message,
      });
      return; // 복합 처리 완료 → 단독 인사이트 생성 건너뜀
    }

    // ── 단독 물 오차 ──
    if (waterOver) {
      const diff = Math.round((row.actualWaterMl ?? 0) - (row.plannedWaterMl ?? 0));
      out.push({
        stepIndex: row.stepIndex,
        action:    row.action,
        severity:  row.waterVariancePct! > 20 ? 'warn' : 'info',
        message:   diff > 0
          ? `'${row.action}'에서 계획보다 ${Math.abs(diff)}ml 더 투입됐습니다. 과다 추출로 인한 쓴맛에 주의하세요.`
          : `'${row.action}'에서 계획보다 ${Math.abs(diff)}ml 적게 투입됐습니다. 연한 맛이 날 수 있습니다.`,
      });
    }

    // ── 단독 시간 오차 ──
    if (timeOver && row.actualTimeMs !== null) {
      const diffMs = row.actualTimeMs - row.plannedEndMs;
      out.push({
        stepIndex: row.stepIndex,
        action:    row.action,
        severity:  row.timeVariancePct! > 20 ? 'warn' : 'info',
        message:   diffMs > 0
          ? `'${row.action}'가 계획보다 ${fmtSec(diffMs)} 지연됐습니다. 과다 추출 여부를 확인하세요.`
          : `'${row.action}'가 계획보다 ${fmtSec(diffMs)} 빨랐습니다. 충분한 추출이 됐는지 확인하세요.`,
      });
    }
  });

  return out;
}

// ── [Fix 4] Dev 콘솔 로그 — useMemo에서 분리된 순수 함수 ─────────────────────

function devAuditLog(rows: MergedRow[]): void {
  if (process.env.NODE_ENV !== 'development') return;

  const missing = rows.filter(r => !r.hasData);
  if (missing.length > 0) {
    console.warn(
      `[AuditReport] ${missing.length}개 스텝 데이터 누락 → "데이터 부족" 처리됨`,
      missing.map(r => `[${r.stepIndex}] ${r.action}`),
    );
    console.assert(
      missing.every(r => r.actualWaterMl === null && r.waterVariancePct === null),
      '[AuditReport] ✓ 누락 스텝 variance = null, 크래시 없음',
    );
  } else {
    console.info('[AuditReport] ✓ 모든 스텝 데이터 수집 완료');
  }

  console.table(
    rows.map(r => ({
      단계:      r.action,
      입력방식:  r.inputMethod,
      계획Water: r.plannedWaterMl != null ? `${r.plannedWaterMl}ml` : '—',
      실제Water: r.actualWaterMl  != null ? `${r.actualWaterMl}ml`  : '누락',
      Water오차: r.waterVariancePct != null ? `${r.waterVariancePct}%` : '—',
      계획Time:  fmtMs(r.plannedEndMs),
      실제Time:  r.actualTimeMs != null ? fmtMs(r.actualTimeMs) : '누락',
      Time오차:  r.timeVariancePct != null ? `${r.timeVariancePct}%` : '—',
    })),
  );
}

// ── SVG Water Bar Chart ───────────────────────────────────────────────────────

function WaterBarChart({ rows }: { rows: MergedRow[] }) {
  const waterRows = rows.filter(r => r.plannedWaterMl !== null);
  if (waterRows.length === 0) return null;

  const maxVal = Math.max(
    1,
    ...waterRows.flatMap(r => [r.plannedWaterMl ?? 0, r.actualWaterMl ?? 0]),
  );

  const VW = 320, VH = 130;
  const PAD = { l: 30, r: 12, t: 12, b: 28 };
  const plotW = VW - PAD.l - PAD.r;
  const plotH = VH - PAD.t - PAD.b;
  const slotW = plotW / waterRows.length;
  const barW  = Math.min(Math.floor(slotW * 0.32), 16);
  const toY   = (ml: number) => PAD.t + plotH * (1 - Math.min(1, ml / maxVal));

  const barColor = (pct: number | null, hasData: boolean): string => {
    if (!hasData)     return 'rgba(255,255,255,0.1)';
    if (pct === null) return '#94a3b8';
    if (pct <= 10)    return '#4ade80';
    if (pct <= 20)    return '#fbbf24';
    return '#f87171';
  };

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" aria-label="물 투입량 비교">
      {[0.25, 0.5, 0.75, 1].map(pct => {
        const y = PAD.t + plotH * (1 - pct);
        return (
          <g key={pct}>
            <line x1={PAD.l} y1={y} x2={VW - PAD.r} y2={y}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD.l - 4} y={y + 3.5} textAnchor="end"
                  fill="rgba(255,255,255,0.25)" fontSize="7">
              {Math.round(maxVal * pct)}
            </text>
          </g>
        );
      })}
      <line x1={PAD.l} y1={PAD.t + plotH} x2={VW - PAD.r} y2={PAD.t + plotH}
            stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

      {waterRows.map((row, i) => {
        const cx     = PAD.l + slotW * i + slotW / 2;
        const planMl = row.plannedWaterMl ?? 0;
        const planY  = toY(planMl);
        const planH_ = PAD.t + plotH - planY;

        return (
          <g key={row.stepIndex}>
            <rect x={cx - barW - 1} y={planY} width={barW} height={planH_}
                  fill="rgba(255,255,255,0.1)" rx="2" />

            {row.hasData && row.actualWaterMl !== null ? (() => {
              const actY  = toY(row.actualWaterMl);
              const actH_ = PAD.t + plotH - actY;
              return (
                <rect x={cx + 1} y={actY} width={barW} height={actH_}
                      fill={barColor(row.waterVariancePct, true)} rx="2" opacity="0.9" />
              );
            })() : (
              <text x={cx + barW / 2 + 2} y={PAD.t + plotH - 3}
                    textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="8">—</text>
            )}

            <text x={cx} y={VH - 5} textAnchor="middle"
                  fill="rgba(255,255,255,0.3)" fontSize="7.5">
              {row.action.length > 4 ? row.action.slice(0, 3) + '…' : row.action}
            </text>
          </g>
        );
      })}

      <g transform={`translate(${VW - 78}, 3)`}>
        <rect x="0" y="0" width="9" height="9" fill="rgba(255,255,255,0.12)" rx="1.5" />
        <text x="12" y="8" fill="rgba(255,255,255,0.3)" fontSize="7.5">계획</text>
        <rect x="30" y="0" width="9" height="9" fill="#4ade80" rx="1.5" opacity="0.85" />
        <text x="42" y="8" fill="rgba(255,255,255,0.3)" fontSize="7.5">실제</text>
      </g>
    </svg>
  );
}

// ── Sub-badges ────────────────────────────────────────────────────────────────

function VarianceBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-white/20">—</span>;
  const cls = pct <= 10 ? 'text-green-400' : pct <= 20 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-xs font-semibold tabular-nums ${cls}`}>{pct.toFixed(1)}%</span>;
}

function MethodBadge({ method }: { method: MergedRow['inputMethod'] }) {
  const cfg = {
    voice:   { icon: '🎤', text: '음성',   cls: 'text-blue-400/70'  },
    manual:  { icon: '✏️', text: '수동',   cls: 'text-amber-400/70' },
    skipped: { icon: '⏭',  text: '건너뜀', cls: 'text-white/25'     },
    missing: { icon: '●',  text: '누락',   cls: 'text-red-400/50'   },
  }[method];
  return (
    <span className={`text-[10px] leading-none ${cfg.cls}`}>
      {cfg.icon} {cfg.text}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
//
// [Fix 7] 부모에서 <AnimatePresence> 한 줄로 Module C → D 끊김 없는 전환:
//
//   <AnimatePresence mode="wait">
//     {showReport
//       ? <AuditReport key="report" ... />
//       : <AppleMusicUI key="timer" ... />
//     }
//   </AnimatePresence>
//
// AuditReport는 motion.div로 자체 래핑되어 있어 exit/enter 모두 동작함.

export default function AuditReport({
  steps,
  auditLog,
  totalElapsedMs,
  plannedTotalMs,
  methodName = 'Brew',
  onClose,
}: AuditReportProps) {

  // ── [Fix 1] 모든 Hook을 조건부 return 이전에 선언 ─────────────────────────
  // buildRows([], []) = [] 이므로 빈 배열에서도 안전하게 실행됨

  const rows = useMemo(
    () => buildRows(steps ?? [], auditLog ?? []),
    [steps, auditLog],
  );

  const insights = useMemo(() => generateInsights(rows), [rows]);

  const avgVariance = useMemo<number | null>(() => {
    const vals = rows
      .flatMap(r => [r.waterVariancePct, r.timeVariancePct])
      .filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [rows]);

  // [Fix 4] devAuditLog side-effect → useEffect
  useEffect(() => { devAuditLog(rows); }, [rows]);

  // [Fix 3] NaN/undefined 런타임 방어
  const safeTotal   = isFinite(totalElapsedMs)  ? totalElapsedMs  : 0;
  const safePlanned = isFinite(plannedTotalMs)   ? plannedTotalMs  : 0;
  const totalDiff   = safeTotal - safePlanned;

  const grade     = gradeOf(avgVariance);
  const gradeMeta = GRADE_META[grade];

  // ── 빈 스텝 가드 (Hook 이후로 이동 — Rules of Hooks 준수) ─────────────────
  if (!steps || steps.length === 0) {
    return (
      <div className="flex h-full items-center justify-center"
           style={{ background: REPORT_BG }}>
        <p className="text-sm text-white/30">레시피 데이터가 없습니다.</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    // [Fix 7] motion.div 자체 래핑 → 부모 AnimatePresence에서 exit 제어 가능
    <motion.div
      className="relative flex h-full flex-col overflow-y-auto text-white"
      style={{ background: REPORT_BG }}
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0  }}
      exit={{ opacity: 0, y: -32   }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* [Fix 5] grain texture — Module C와 동일한 오버레이 ─────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: 0.04, backgroundImage: GRAIN_URI, backgroundSize: '256px' }}
        aria-hidden
      />

      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between
                   px-5 pb-3 pt-12 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(2,6,23,0.85)' }}
      >
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30">
            {methodName}
          </p>
          <h1 className="text-xl font-bold tracking-tight">추출 감사 리포트</h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center
                       rounded-full bg-white/10 text-white/50 active:bg-white/20"
            aria-label="닫기"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="relative z-10 flex flex-col gap-6 px-5 pb-14 pt-2">

        {/* ── 종합 점수 카드 ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="flex items-center gap-4 rounded-2xl p-5"
          style={{
            backgroundColor: `${gradeMeta.color}10`,
            border: `1px solid ${gradeMeta.color}30`,
          }}
        >
          <div
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center
                       rounded-2xl text-4xl font-black"
            style={{ backgroundColor: `${gradeMeta.color}1a`, color: gradeMeta.color }}
          >
            {grade}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold" style={{ color: gradeMeta.color }}>
              {gradeMeta.label}
            </p>
            <p className="mt-0.5 text-xs text-white/40">{gradeMeta.desc}</p>
            <div className="mt-2.5 flex items-center gap-3 text-xs">
              <span className="text-white/35">계획 {fmtMs(safePlanned)}</span>
              <span className={
                Math.abs(totalDiff) < 5000 ? 'text-green-400' :
                totalDiff > 0 ? 'text-amber-400' : 'text-sky-400'
              }>
                실제 {fmtMs(safeTotal)}&nbsp;
                ({totalDiff > 0 ? '+' : ''}{fmtSec(totalDiff)})
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── SVG 물 투입량 비교 차트 ────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-[10px] font-semibold tracking-[0.18em] uppercase text-white/30">
            물 투입량 비교
          </h2>
          <div className="rounded-2xl p-4"
               style={{ backgroundColor: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.07)' }}>
            <WaterBarChart rows={rows} />
            <div className="mt-3 flex justify-center gap-4">
              {[
                { color: 'rgba(255,255,255,0.15)', label: '계획'    },
                { color: '#4ade80',                label: '≤10%'   },
                { color: '#fbbf24',                label: '≤20%'   },
                { color: '#f87171',                label: '>20%'   },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-[10px] text-white/30">
                  <span className="block h-2 w-3 rounded-sm" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 단계별 상세 테이블 ──────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-[10px] font-semibold tracking-[0.18em] uppercase text-white/30">
            단계별 상세
          </h2>
          <div className="overflow-hidden rounded-2xl"
               style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="grid grid-cols-[1fr_52px_52px_44px] gap-x-2
                            bg-white/[0.04] px-4 py-2.5">
              {['단계', '계획', '실제', '오차'].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase
                                         tracking-wider text-white/30">
                  {h}
                </span>
              ))}
            </div>

            {rows.map((row, i) => (
              <motion.div
                key={row.stepIndex}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 + i * 0.04, duration: 0.28 }}
                className="grid grid-cols-[1fr_52px_52px_44px] gap-x-2
                           items-start border-t px-4 py-3.5"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium leading-tight">{row.action}</span>
                  <MethodBadge method={row.inputMethod} />
                </div>
                <span className="pt-0.5 text-sm tabular-nums text-white/40">
                  {row.plannedWaterMl != null ? `${row.plannedWaterMl}ml` : '—'}
                </span>
                <span className="pt-0.5 text-sm tabular-nums">
                  {!row.hasData
                    ? <span className="text-[11px] text-white/20">부족</span>
                    : row.actualWaterMl != null
                    ? `${row.actualWaterMl}ml`
                    : <span className="text-white/20">—</span>
                  }
                </span>
                <span className="pt-0.5">
                  <VarianceBadge pct={row.waterVariancePct} />
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── 핵심 인사이트 ───────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-[10px] font-semibold tracking-[0.18em] uppercase text-white/30">
            핵심 인사이트
          </h2>

          {insights.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2 rounded-2xl py-7"
              style={{ border: '1px solid rgba(74,222,128,0.2)',
                       backgroundColor: 'rgba(74,222,128,0.05)' }}
            >
              <span className="text-2xl">✓</span>
              <p className="text-sm text-green-400/80">모든 항목이 허용 오차(10%) 이내입니다.</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {insights.map((ins, i) => (
                <motion.div
                  key={`${ins.stepIndex}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: ins.severity === 'warn'
                      ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.08)',
                    border: `1px solid ${ins.severity === 'warn'
                      ? 'rgba(248,113,113,0.25)' : 'rgba(251,191,36,0.2)'}`,
                  }}
                >
                  <div className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-base leading-none">
                      {ins.severity === 'warn' ? '⚠️' : 'ℹ️'}
                    </span>
                    <p className="text-sm leading-relaxed text-white/75">{ins.message}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

      </div>
    </motion.div>
  );
}
