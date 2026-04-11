/**
 * AppleMusicUI.tsx — 실시간 브루잉 감사 인터페이스 (Module C)
 *
 * ── 구조 원리 ──
 * • 배경: 스텝 키워드 → 테마 감지 → 이전/현재 두 레이어 opacity 크로스페이드
 * • 텍스트: AnimatePresence mode="wait" + y + blur spring 전환 (Apple Music Lyrics)
 * • 타이머 링: SVG strokeDashoffset → Framer Motion animate (0.1s linear)
 * • Fallback: voice.pendingManualInput → 전체화면 invisible 탭 오버레이 + 직접입력 시트
 *
 * ── 에러 방어 ──
 * • steps 빈 배열 가드 (EmptyState 렌더)
 * • stepDuration = 0 인 경우 progress = 0 처리
 * • SVG transform attribute 사용 (style prop 대신, SVG 호환성)
 */

'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBrewTimer } from '../hooks/useBrewTimer';
import { useVoiceSync } from '../hooks/useVoiceSync';
import type { BrewStep } from '../hooks/useBrewTimer';
import type { AuditRecord } from '../hooks/useVoiceSync';

// ── Props ─────────────────────────────────────────────────────────────────────

interface AppleMusicUIProps {
  steps: BrewStep[];
  methodName?: string;
  onComplete?: (auditLog: AuditRecord[]) => void;
}

// ── 스텝 테마 ─────────────────────────────────────────────────────────────────

interface StepTheme {
  background: string;
  accent: string;
}

const THEMES: Record<string, StepTheme> = {
  bloom: {
    background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 55%, #020617 100%)',
    accent: '#818cf8',
  },
  pour: {
    background: 'linear-gradient(160deg, #1c0a00 0%, #7c2d12 55%, #0c0a09 100%)',
    accent: '#fb923c',
  },
  stir: {
    background: 'linear-gradient(160deg, #022c22 0%, #065f46 55%, #020617 100%)',
    accent: '#34d399',
  },
  press: {
    background: 'linear-gradient(160deg, #1e0030 0%, #4c1d95 55%, #020617 100%)',
    accent: '#c084fc',
  },
  wait: {
    background: 'linear-gradient(160deg, #0a1628 0%, #1e3a5f 55%, #020617 100%)',
    accent: '#60a5fa',
  },
  done: {
    background: 'linear-gradient(160deg, #022c1a 0%, #14532d 55%, #020617 100%)',
    accent: '#4ade80',
  },
  default: {
    background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #020617 100%)',
    accent: '#94a3b8',
  },
};

function resolveThemeKey(action: string): string {
  if (/뜸|블룸|bloom|pre.?infus/i.test(action)) return 'bloom';
  if (/붓기|pour|water/i.test(action))            return 'pour';
  if (/교반|stir|저어/i.test(action))             return 'stir';
  if (/프레스|press/i.test(action))               return 'press';
  if (/대기|wait|기다/i.test(action))             return 'wait';
  if (/완료|done|finish|제거/i.test(action))      return 'done';
  return 'default';
}

// ── 유틸리티 ──────────────────────────────────────────────────────────────────

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function buildDurations(steps: BrewStep[]): number[] {
  const endpoints = steps.map(s => {
    const [m, sec] = s.time.split(':').map(Number);
    return ((m || 0) * 60 + (sec || 0)) * 1000;
  });
  return endpoints.map((end, i) => Math.max(1, end - (i > 0 ? endpoints[i - 1] : 0)));
}

// ── Timer Ring (SVG) ──────────────────────────────────────────────────────────

const R = 110;
const C = 2 * Math.PI * R; // ≈ 691

function TimerRing({ progress, accent }: { progress: number; accent: string }) {
  const offset = C * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <svg
      className="absolute inset-0 m-auto pointer-events-none"
      width="264"
      height="264"
      viewBox="0 0 264 264"
      aria-hidden
    >
      {/* track */}
      <circle cx="132" cy="132" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2" />
      {/* fill arc */}
      <motion.circle
        cx="132" cy="132" r={R}
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={C}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.12, ease: 'linear' }}
        transform="rotate(-90 132 132)"
      />
      {/* glow dot at arc head */}
      <motion.circle
        cx="132"
        cy={132 - R}
        r="4"
        fill={accent}
        animate={{ opacity: progress > 0.01 ? 1 : 0 }}
        style={{ filter: `drop-shadow(0 0 6px ${accent})` }}
        transform={`rotate(${360 * progress - 90} 132 132)`}
      />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AppleMusicUI({
  steps,
  methodName = 'Brew',
  onComplete,
}: AppleMusicUIProps) {

  // ── 빈 스텝 가드
  if (!steps || steps.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <p className="text-sm text-white/30">레시피 스텝이 없습니다.</p>
      </div>
    );
  }

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const [timer, timerControls] = useBrewTimer(steps);

  const [showSheet, setShowSheet]     = useState(false);
  const [manualVal, setManualVal]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFallback    = useCallback(() => setShowSheet(true), []);
  const handleStepAudited = useCallback(() => setShowSheet(false), []);

  const [voice, voiceControls] = useVoiceSync({
    timerState: timer,
    steps,
    onFallback: handleFallback,
    onStepAudited: handleStepAudited,
    latencyCompensationMs: 500,
  });

  // ── 파생 값 ────────────────────────────────────────────────────────────────
  const durations    = useMemo(() => buildDurations(steps), [steps]);
  const currentStep  = steps[timer.stepIndex];
  const nextStep     = steps[timer.stepIndex + 1] ?? null;
  const themeKey     = resolveThemeKey(currentStep?.action ?? '');
  const theme        = THEMES[themeKey];
  const stepProgress = timer.stepElapsedMs / durations[timer.stepIndex];

  // ── 배경 크로스페이드 ──────────────────────────────────────────────────────
  const [bgState, setBgState] = useState({
    prev: theme.background,
    curr: theme.background,
    key:  0,
  });
  const prevKeyRef = useRef(themeKey);

  useEffect(() => {
    if (prevKeyRef.current !== themeKey) {
      setBgState(s => ({
        prev: THEMES[prevKeyRef.current]?.background ?? s.curr,
        curr: theme.background,
        key:  s.key + 1,
      }));
      prevKeyRef.current = themeKey;
    }
  }, [themeKey, theme.background]);

  // ── 완료 콜백 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timer.status === 'finished') onComplete?.(voice.auditLog);
  }, [timer.status]); // eslint-disable-line

  // ── 시트 열릴 때 입력 포커스 ───────────────────────────────────────────────
  useEffect(() => {
    if (showSheet) setTimeout(() => inputRef.current?.focus(), 320);
    else           setManualVal('');
  }, [showSheet]);

  // ── 수동 입력 제출 ─────────────────────────────────────────────────────────
  const submitManual = useCallback(() => {
    const v = parseFloat(manualVal);
    if (!isNaN(v) && v > 0) voiceControls.submitManual(v);
    timerControls.forceNextStep();
    setShowSheet(false);
  }, [manualVal, voiceControls, timerControls]);

  const skipStep = useCallback(() => {
    voiceControls.skipStep();
    timerControls.forceNextStep();
    setShowSheet(false);
  }, [voiceControls, timerControls]);

  // ── 전체화면 탭 → 다음 스텝 (Fallback invisible overlay) ─────────────────
  const handleOverlayTap = useCallback(() => {
    voiceControls.skipStep();
    timerControls.forceNextStep();
  }, [voiceControls, timerControls]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-screen w-full overflow-hidden touch-none select-none">

      {/* ── 배경 레이어 1: 이전 테마 (static) ───────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{ background: bgState.prev }}
      />

      {/* ── 배경 레이어 2: 현재 테마 (fade in) ──────────────────────────────── */}
      <AnimatePresence>
        <motion.div
          key={bgState.key}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ background: bgState.curr }}
        />
      </AnimatePresence>

      {/* ── 그레인 텍스처 ──────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.04,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '256px',
        }}
      />

      {/* ── 메인 콘텐츠 (z-10) ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex h-full flex-col">

        {/* 상단 상태바 */}
        <div className="flex items-center justify-between px-6 pt-14 pb-2">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/30">
            {methodName}
          </span>

          {/* 스텝 진행 도트 */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <motion.div
                key={i}
                className="h-[3px] rounded-full"
                animate={{
                  width:           i === timer.stepIndex ? 18 : 5,
                  opacity:         i <  timer.stepIndex ? 1 : i === timer.stepIndex ? 1 : 0.2,
                  backgroundColor: i === timer.stepIndex ? theme.accent : '#ffffff',
                }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              />
            ))}
          </div>
        </div>

        {/* ── 타이머 링 영역 ──────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-center" style={{ height: 264 }}>
          <TimerRing progress={stepProgress} accent={theme.accent} />

          <div className="flex flex-col items-center z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={`t-${timer.stepIndex}`}
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.15 }}
                transition={{ duration: 0.28 }}
                className="flex flex-col items-center"
              >
                <span className="text-[56px] font-thin tracking-tight tabular-nums text-white leading-none">
                  {fmtMs(timer.stepRemainingMs)}
                </span>
                <span className="mt-1.5 text-[10px] font-medium tracking-[0.22em] uppercase text-white/25">
                  남은 시간
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── 현재 스텝 — Apple Music Lyrics Style ───────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 -mt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={`s-${timer.stepIndex}`}
              initial={{ opacity: 0, y: 72, filter: 'blur(16px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -72, filter: 'blur(16px)' }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="flex flex-col items-center text-center gap-3 w-full"
            >
              {/* 액션명 (대형 Bold) */}
              <h1
                className="text-[52px] font-bold tracking-tight leading-none text-white"
                style={{ textShadow: `0 0 80px ${theme.accent}50` }}
              >
                {currentStep?.action ?? '준비'}
              </h1>

              {/* 세부 설명 */}
              <p className="text-sm font-light leading-relaxed text-white/55 max-w-[280px]">
                {currentStep?.detail ?? ''}
              </p>

              {/* 물 투입량 배지 */}
              {currentStep?.waterMl != null && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.18, type: 'spring', stiffness: 440 }}
                  className="flex items-baseline gap-1.5 rounded-full px-5 py-2 mt-1"
                  style={{
                    backgroundColor: `${theme.accent}18`,
                    border: `1px solid ${theme.accent}40`,
                  }}
                >
                  <span
                    className="text-3xl font-semibold tabular-nums"
                    style={{ color: theme.accent }}
                  >
                    {currentStep.waterMl}
                  </span>
                  <span className="text-sm font-medium text-white/40">ml</span>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── 다음 스텝 — Blur 8px · Opacity 0.3 ─────────────────────────── */}
        <div className="flex min-h-[72px] flex-col items-center justify-end pb-2 px-8">
          <AnimatePresence mode="wait">
            {nextStep && timer.status !== 'finished' && (
              <motion.div
                key={`n-${timer.stepIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center text-center gap-0.5"
                style={{ filter: 'blur(8px)' }}
                aria-hidden
              >
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/60">
                  다음
                </p>
                <p className="text-xl font-semibold text-white">{nextStep.action}</p>
                {nextStep.waterMl != null && (
                  <p className="text-sm text-white/70">{nextStep.waterMl}ml</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── 하단 컨트롤 ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 pb-14 pt-4">

          {/* 🎤 음성 인식 버튼 */}
          <motion.button
            onClickCapture={e => {
              e.stopPropagation();
              voice.isListening
                ? voiceControls.stopListening()
                : voiceControls.startListening();
            }}
            disabled={!voice.isSupported || timer.status !== 'running'}
            whileTap={{ scale: 0.88 }}
            className="relative flex h-14 w-14 items-center justify-center rounded-full disabled:opacity-20"
            style={{
              backgroundColor: voice.isListening ? theme.accent : `${theme.accent}1a`,
              border: `1.5px solid ${theme.accent}55`,
            }}
            aria-label={voice.isListening ? '음성 인식 중지' : '음성 인식 시작'}
          >
            {/* pulse ring */}
            {voice.isListening && (
              <motion.span
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
                style={{ backgroundColor: theme.accent }}
              />
            )}
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect
                x="9" y="2" width="6" height="13" rx="3"
                fill={voice.isListening ? '#000' : theme.accent}
              />
              <path
                d="M5 10a7 7 0 0014 0"
                stroke={voice.isListening ? '#000' : theme.accent}
                strokeWidth="2" strokeLinecap="round"
              />
              <line x1="12" y1="17" x2="12" y2="21" stroke={voice.isListening ? '#000' : theme.accent} strokeWidth="2" strokeLinecap="round" />
              <line x1="9"  y1="21" x2="15" y2="21" stroke={voice.isListening ? '#000' : theme.accent} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.button>

          {/* 총 경과 시간 */}
          <span className="text-xs tabular-nums text-white/30 font-light tracking-widest">
            {fmtMs(timer.totalElapsedMs)}
          </span>

          {/* ▶ / ⏸ 버튼 */}
          <motion.button
            onClickCapture={e => {
              e.stopPropagation();
              if      (timer.status === 'idle')    timerControls.start();
              else if (timer.status === 'running') timerControls.pause();
              else if (timer.status === 'paused')  timerControls.resume();
            }}
            whileTap={{ scale: 0.88 }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white"
            aria-label={timer.status === 'running' ? '일시정지' : '시작'}
          >
            <AnimatePresence mode="wait">
              {(timer.status === 'idle' || timer.status === 'paused') && (
                <motion.svg
                  key="play"
                  className="h-[18px] w-[18px] translate-x-0.5"
                  fill="#000" viewBox="0 0 24 24"
                  initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.18 }}
                >
                  <path d="M5 3l14 9-14 9V3z" />
                </motion.svg>
              )}
              {timer.status === 'running' && (
                <motion.svg
                  key="pause"
                  className="h-[18px] w-[18px]"
                  fill="#000" viewBox="0 0 24 24"
                  initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.18 }}
                >
                  <rect x="5"  y="3" width="5" height="18" rx="1" />
                  <rect x="14" y="3" width="5" height="18" rx="1" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
       * Fallback 레이어 (z-20)
       * 음성 인식 실패 시: 전체화면 invisible 탭 → forceNextStep (skip)
       * ──────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {voice.pendingManualInput && !showSheet && (
          <motion.button
            key="tap-overlay"
            className="absolute inset-0 z-20 w-full h-full flex flex-col items-center justify-end pb-36"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayTap}
            aria-label="화면을 탭하여 다음 단계로"
          >
            {/* 힌트 배지 (pulse) */}
            <motion.div
              animate={{ opacity: [0.45, 0.9, 0.45] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2 rounded-full px-4 py-2"
              style={{
                backgroundColor: `${theme.accent}22`,
                border: `1px solid ${theme.accent}50`,
              }}
            >
              <motion.span
                className="block h-1.5 w-1.5 rounded-full"
                animate={{ scale: [1, 1.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ backgroundColor: theme.accent }}
              />
              <span className="text-xs font-medium text-white/70">
                탭하여 다음 단계로
              </span>
            </motion.div>

            {/* 직접 입력 버튼 (propagation 차단 → skip 대신 sheet open) */}
            <motion.button
              className="mt-3 rounded-full px-4 py-1.5 text-xs font-medium"
              style={{ color: theme.accent }}
              onClickCapture={e => {
                e.stopPropagation();
                setShowSheet(true);
              }}
              aria-label="ml 직접 입력"
            >
              ml 직접 입력 →
            </motion.button>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────────────
       * Manual Input Bottom Sheet (z-40/50)
       * ──────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div
              key="backdrop"
              className="absolute inset-0 z-40 bg-black/60"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={e => e.stopPropagation()}
            />
            <motion.div
              key="sheet"
              className="absolute bottom-0 left-0 right-0 z-50 rounded-t-[28px] px-6 pb-12 pt-5"
              style={{ backgroundColor: '#111827' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              onClick={e => e.stopPropagation()}
            >
              {/* drag handle */}
              <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-white/20" />

              <p className="mb-0.5 text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30">
                {currentStep?.action}
              </p>
              <p className="mb-5 text-lg font-semibold text-white">
                물 투입량을 입력하세요
              </p>

              {currentStep?.waterMl != null && (
                <p className="mb-4 text-sm text-white/40">
                  예상&nbsp;
                  <span style={{ color: theme.accent }} className="font-semibold">
                    {currentStep.waterMl}ml
                  </span>
                </p>
              )}

              {/* 숫자 입력 */}
              <div
                className="mb-5 flex items-baseline rounded-2xl px-4"
                style={{
                  backgroundColor: '#1f2937',
                  border: `1px solid ${theme.accent}40`,
                }}
              >
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  value={manualVal}
                  onChange={e => setManualVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitManual()}
                  placeholder="0"
                  className="flex-1 bg-transparent py-4 text-[40px] font-extralight text-white outline-none placeholder:text-white/15 tabular-nums"
                />
                <span className="pb-1 text-lg font-medium text-white/30">ml</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={skipStep}
                  className="flex-1 rounded-2xl py-4 text-sm font-medium text-white/40"
                  style={{ backgroundColor: '#1f2937' }}
                >
                  건너뛰기
                </button>
                <motion.button
                  onClick={submitManual}
                  disabled={!manualVal || isNaN(parseFloat(manualVal))}
                  whileTap={{ scale: 0.96 }}
                  className="flex-[2] rounded-2xl py-4 text-base font-semibold text-black disabled:opacity-25"
                  style={{ backgroundColor: theme.accent }}
                >
                  확인
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────────────
       * 완료 오버레이 (z-60)
       * ──────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {timer.status === 'finished' && (
          <motion.div
            key="finished"
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            style={{ background: THEMES.done.background }}
          >
            {/* 체크 아이콘 */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.15 }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                backgroundColor: `${THEMES.done.accent}20`,
                border: `2px solid ${THEMES.done.accent}55`,
                boxShadow: `0 0 48px ${THEMES.done.accent}30`,
              }}
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24"
                stroke={THEMES.done.accent} strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>

            <motion.p
              className="text-[44px] font-bold text-white"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              완료
            </motion.p>
            <motion.p
              className="mt-2 text-sm text-white/40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              총 {fmtMs(timer.totalElapsedMs)} · {voice.auditLog.length}단계 기록됨
            </motion.p>

            {/* 다시 시작 */}
            <motion.button
              onClick={() => timerControls.reset()}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.96 }}
              className="absolute bottom-16 rounded-2xl px-8 py-4 text-sm font-medium text-white"
              style={{
                backgroundColor: `${THEMES.done.accent}1a`,
                border: `1px solid ${THEMES.done.accent}40`,
              }}
            >
              다시 시작
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
