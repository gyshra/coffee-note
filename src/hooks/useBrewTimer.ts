/**
 * useBrewTimer.ts — 정밀 브루잉 타이머 엔진
 *
 * ── 핵심 원리 ──
 * • requestAnimationFrame 루프로 ~16ms 주기 폴링, 0.1초 단위 UI 갱신
 * • 시간 기준은 performance.now() 델타 누적(wallClock) — setTimeout/setInterval의
 *   드리프트 없음. 탭이 백그라운드로 전환되면 rAF가 throttle되지만,
 *   다음 프레임에서 실제 경과 시간을 한 번에 반영하므로 오차 자동 보정.
 * • 스텝 전환: 현재 스텝의 목표 시간(stepEndMs)을 초과하면 자동 advance.
 *   마지막 스텝 초과 시 타이머를 FINISHED 상태로 전환.
 *
 * ── 에러 방어 ──
 * • rAF 핸들러 내부를 try-catch로 감싸 렌더 루프 전체 크래시 차단
 * • cleanup에서 cancelAnimationFrame 보장 (StrictMode 이중 마운트 대응)
 * • steps 배열이 비어 있거나 time 파싱 실패 시 graceful fallback
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

export interface BrewStep {
  action: string;
  detail: string;
  waterMl: number | null; // null = 물 투입 없는 스텝
  time: string;           // "분:초" 형식 (예: "1:30")
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface BrewTimerState {
  status: TimerStatus;
  stepIndex: number;       // 현재 진행 중인 스텝 인덱스
  stepElapsedMs: number;   // 현재 스텝 내 경과 시간 (ms)
  stepRemainingMs: number; // 현재 스텝 남은 시간 (ms)
  totalElapsedMs: number;  // 전체 경과 시간 (ms)
}

export interface BrewTimerControls {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  forceNextStep: () => void;  // 음성 인식 실패 시 수동 전환 fallback
}

// ── 유틸리티 ──────────────────────────────────────────────────────────────────

/**
 * "분:초" 문자열 → 밀리초 변환
 * 파싱 실패 시 0 반환 (크래시 방지)
 */
function parseTimeToMs(timeStr: string): number {
  try {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (isNaN(minutes) || isNaN(seconds)) return 0;
    return (minutes * 60 + seconds) * 1000;
  } catch {
    return 0;
  }
}

/**
 * steps 배열을 절대 타임라인으로 변환
 * 각 스텝의 time은 해당 스텝 종료 시점의 누적 시간임
 * (예: [{time:'0:30'}, {time:'1:00'}] → [30000ms, 60000ms])
 */
function buildStepEndpoints(steps: BrewStep[]): number[] {
  return steps.map(s => parseTimeToMs(s.time));
}

// ── 훅 ───────────────────────────────────────────────────────────────────────

export function useBrewTimer(steps: BrewStep[]): [BrewTimerState, BrewTimerControls] {
  const stepEndpoints = useRef<number[]>([]);

  // rAF 핸들 & 내부 가변 상태 (ref — 렌더 트리거 없이 빠르게 접근)
  const rafHandle = useRef<number>(0);
  const startWallClock = useRef<number>(0);    // 현재 스텝 시작 시각 (performance.now)
  const totalOffsetMs = useRef<number>(0);     // 이전 스텝들의 누적 경과 시간
  const pausedAtMs = useRef<number>(0);        // pause 시점의 stepElapsedMs (resume 보정용)

  const [timerState, setTimerState] = useState<BrewTimerState>({
    status: 'idle',
    stepIndex: 0,
    stepElapsedMs: 0,
    stepRemainingMs: 0,
    totalElapsedMs: 0,
  });

  // steps 변경 시 endpoints 재계산, 타이머 초기화
  useEffect(() => {
    stepEndpoints.current = buildStepEndpoints(steps);
    setTimerState({
      status: 'idle',
      stepIndex: 0,
      stepElapsedMs: 0,
      stepRemainingMs: stepEndpoints.current[0] ?? 0,
      totalElapsedMs: 0,
    });
  }, [steps]);

  // ── rAF 루프 ──────────────────────────────────────────────────────────────

  const stopLoop = useCallback(() => {
    if (rafHandle.current) {
      cancelAnimationFrame(rafHandle.current);
      rafHandle.current = 0;
    }
  }, []);

  const tick = useCallback(() => {
    try {
      const now = performance.now();
      const stepElapsedMs = now - startWallClock.current;
      const totalElapsedMs = totalOffsetMs.current + stepElapsedMs;

      setTimerState(prev => {
        let { stepIndex } = prev;
        const endpoints = stepEndpoints.current;

        // 스텝 자동 전환: 현재 스텝 목표 시간 초과 시
        let adjustedStepElapsed = stepElapsedMs;
        let adjustedStepIndex = stepIndex;

        const stepDuration = endpoints[stepIndex] - (stepIndex > 0 ? endpoints[stepIndex - 1] : 0);

        if (stepElapsedMs >= stepDuration && stepIndex < steps.length - 1) {
          // 초과분을 다음 스텝의 시작 경과로 이관
          const overflow = stepElapsedMs - stepDuration;
          adjustedStepIndex = stepIndex + 1;
          adjustedStepElapsed = overflow;
          // 기준 시각을 overflow만큼 앞당겨 보정
          startWallClock.current = now - overflow;
          totalOffsetMs.current = endpoints[stepIndex];
        }

        const currentStepDuration =
          endpoints[adjustedStepIndex] -
          (adjustedStepIndex > 0 ? endpoints[adjustedStepIndex - 1] : 0);

        const remaining = Math.max(0, currentStepDuration - adjustedStepElapsed);

        // 마지막 스텝 완료
        if (adjustedStepIndex === steps.length - 1 && remaining === 0) {
          stopLoop();
          return {
            status: 'finished',
            stepIndex: adjustedStepIndex,
            stepElapsedMs: currentStepDuration,
            stepRemainingMs: 0,
            totalElapsedMs: endpoints[steps.length - 1] ?? totalElapsedMs,
          };
        }

        return {
          ...prev,
          stepIndex: adjustedStepIndex,
          stepElapsedMs: adjustedStepElapsed,
          stepRemainingMs: remaining,
          totalElapsedMs,
        };
      });
    } catch (err) {
      console.error('[useBrewTimer] tick error:', err);
    }

    rafHandle.current = requestAnimationFrame(tick);
  }, [steps.length, stopLoop]);

  // ── 컨트롤 ────────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (steps.length === 0) return;
    stopLoop();
    startWallClock.current = performance.now();
    totalOffsetMs.current = 0;
    setTimerState({
      status: 'running',
      stepIndex: 0,
      stepElapsedMs: 0,
      stepRemainingMs: stepEndpoints.current[0] ?? 0,
      totalElapsedMs: 0,
    });
    rafHandle.current = requestAnimationFrame(tick);
  }, [steps.length, stopLoop, tick]);

  const pause = useCallback(() => {
    stopLoop();
    setTimerState(prev => {
      pausedAtMs.current = prev.stepElapsedMs;
      return { ...prev, status: 'paused' };
    });
  }, [stopLoop]);

  const resume = useCallback(() => {
    // resume 시 시작 기준을 현재 시각 - pausedAtMs로 보정하여 갭 제거
    startWallClock.current = performance.now() - pausedAtMs.current;
    setTimerState(prev => ({ ...prev, status: 'running' }));
    rafHandle.current = requestAnimationFrame(tick);
  }, [tick]);

  const reset = useCallback(() => {
    stopLoop();
    totalOffsetMs.current = 0;
    pausedAtMs.current = 0;
    setTimerState({
      status: 'idle',
      stepIndex: 0,
      stepElapsedMs: 0,
      stepRemainingMs: stepEndpoints.current[0] ?? 0,
      totalElapsedMs: 0,
    });
  }, [stopLoop]);

  /**
   * forceNextStep — 음성 인식 실패 시 수동 스텝 전환 fallback
   * running 상태일 때 현재 스텝을 즉시 완료하고 다음 스텝으로 진입
   */
  const forceNextStep = useCallback(() => {
    setTimerState(prev => {
      if (prev.status !== 'running' && prev.status !== 'paused') return prev;
      const endpoints = stepEndpoints.current;
      const nextIndex = prev.stepIndex + 1;
      if (nextIndex >= steps.length) return prev;

      // 타임라인 기준 재조정
      totalOffsetMs.current = endpoints[prev.stepIndex];
      startWallClock.current = performance.now();
      pausedAtMs.current = 0;

      const nextDuration =
        endpoints[nextIndex] - (endpoints[prev.stepIndex] ?? 0);

      return {
        ...prev,
        stepIndex: nextIndex,
        stepElapsedMs: 0,
        stepRemainingMs: nextDuration,
        totalElapsedMs: totalOffsetMs.current,
      };
    });
  }, [steps.length]);

  // cleanup
  useEffect(() => () => stopLoop(), [stopLoop]);

  const controls: BrewTimerControls = { start, pause, resume, reset, forceNextStep };
  return [timerState, controls];
}
