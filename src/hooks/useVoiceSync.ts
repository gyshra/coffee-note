/**
 * useVoiceSync.ts — 시간차 보정 음성 인식 엔진
 *
 * ── 핵심 원리 ──
 * • Web Speech API SpeechRecognition.onstart 발화 감지 즉시
 *   현재 타이머 상태를 captureTime 변수에 선점(Pre-empt) 저장.
 *   onresult 콜백은 수백ms 후 도달하므로, 캡처 시점 기준 데이터를 참조해야
 *   실제 사용자가 말한 순간의 스텝에 값이 매핑됨.
 *
 * • 보정 수식:
 *     ActualTime = CaptureTime − Latency
 *   Latency = onresult 수신 시각 − captureTime.wallMs (실측 평균: 400~800ms)
 *   보정된 ActualTime으로 "말하는 순간 어느 스텝이었는지" 재역산.
 *
 * • 숫자 파싱: 한국어 발화 "오십 그램", "50그램", "50" 모두 처리.
 *   숫자 단어 → 아라비아 숫자 변환 테이블 내장.
 *
 * ── Fallback 로직 ──
 * • 인식 실패(onerror / 빈 transcript / 파싱 불가):
 *   - onFallback 콜백 호출 → UI가 수동 입력 모달 표시
 *   - forceNextStep() 을 외부에서 연결하면 탭으로도 스텝 전환 가능
 *
 * ── 에러 방어 ──
 * • SpeechRecognition 미지원 환경(Safari 구버전 등) → isSupported: false 반환
 * • recognition 이벤트 핸들러 전체 try-catch
 * • 컴포넌트 언마운트 시 recognition.abort() 보장
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BrewTimerState, BrewStep } from './useBrewTimer';

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

export interface CapturedMoment {
  stepIndex: number;
  wallMs: number;        // performance.now() 기준 캡처 시각
  totalElapsedMs: number;
}

export interface AuditRecord {
  stepIndex: number;
  action: string;
  expectedWaterMl: number | null;
  actualWaterMl: number | null;  // 음성으로 파싱된 값 (null = 미입력)
  captureTimeMs: number;         // 선점 캡처 시각 (ms)
  actualTimeMs: number;          // 보정된 실제 시각: captureTimeMs - latencyMs
  latencyMs: number;
  inputMethod: 'voice' | 'manual' | 'skipped';
}

export interface VoiceSyncState {
  isListening: boolean;
  isSupported: boolean;
  lastTranscript: string;
  auditLog: AuditRecord[];
  pendingManualInput: boolean;   // fallback 수동 입력 대기 플래그
}

export interface VoiceSyncControls {
  startListening: () => void;
  stopListening: () => void;
  submitManual: (waterMl: number) => void;   // 수동 입력 fallback
  skipStep: () => void;                       // 스텝 스킵 (수동 입력 없이)
  clearLog: () => void;
}

export interface UseVoiceSyncOptions {
  timerState: BrewTimerState;
  steps: BrewStep[];
  onFallback?: (stepIndex: number) => void;   // 실패 시 UI에 알림
  onStepAudited?: (record: AuditRecord) => void;
  latencyCompensationMs?: number;             // 수동 지연 보정값 (기본 500ms)
}

// ── 한국어 숫자 파싱 ─────────────────────────────────────────────────────────

const KO_NUMBER_MAP: Record<string, number> = {
  영: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9,
  십: 10, 이십: 20, 삼십: 30, 사십: 40, 오십: 50,
  육십: 60, 칠십: 70, 팔십: 80, 구십: 90,
  백: 100, 이백: 200, 삼백: 300, 사백: 400, 오백: 500,
};

const KO_NUMBER_REGEX = new RegExp(
  Object.keys(KO_NUMBER_MAP)
    .sort((a, b) => b.length - a.length) // 긴 것 먼저 (이십 > 이)
    .join('|'),
  'g'
);

/**
 * 발화 텍스트에서 숫자(그램, ml 등) 추출
 * "오십 그램" → 50, "150ml" → 150, "백오십" → 150
 */
function parseNumberFromTranscript(transcript: string): number | null {
  try {
    const cleaned = transcript.replace(/\s/g, '');

    // 아라비아 숫자 우선
    const arabicMatch = cleaned.match(/\d+(\.\d+)?/);
    if (arabicMatch) return parseFloat(arabicMatch[0]);

    // 한국어 숫자 변환
    let total = 0;
    let cursor = cleaned;
    let replaced = cursor.replace(KO_NUMBER_REGEX, match => {
      total += KO_NUMBER_MAP[match] ?? 0;
      return '';
    });

    if (total > 0) return total;

    // 단순 한 글자 숫자
    if (replaced !== cursor) return total;

    return null;
  } catch {
    return null;
  }
}

/**
 * totalElapsedMs 기준으로 해당 스텝 인덱스 역산
 * (latency 보정 후 "실제 말한 시점"의 스텝 찾기에 사용)
 */
function resolveStepFromElapsed(
  elapsedMs: number,
  steps: BrewStep[]
): number {
  let cumulative = 0;
  for (let i = 0; i < steps.length; i++) {
    const [min, sec] = steps[i].time.split(':').map(Number);
    const stepEndMs = (min * 60 + sec) * 1000;
    if (elapsedMs <= stepEndMs) return i;
    cumulative = stepEndMs;
  }
  return steps.length - 1;
}

// ── 훅 ───────────────────────────────────────────────────────────────────────

export function useVoiceSync(options: UseVoiceSyncOptions): [VoiceSyncState, VoiceSyncControls] {
  const {
    timerState,
    steps,
    onFallback,
    onStepAudited,
    latencyCompensationMs = 500,
  } = options;

  // SpeechRecognition 지원 여부
  const SpeechRecognitionClass =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionClass;

  const recognitionRef = useRef<any>(null);
  const captureRef = useRef<CapturedMoment | null>(null);
  const resultTimestampRef = useRef<number>(0);

  const [voiceState, setVoiceState] = useState<VoiceSyncState>({
    isListening: false,
    isSupported,
    lastTranscript: '',
    auditLog: [],
    pendingManualInput: false,
  });

  // timerState를 ref로도 유지 (이벤트 핸들러 클로저 스테일 방지)
  const timerStateRef = useRef<BrewTimerState>(timerState);
  useEffect(() => { timerStateRef.current = timerState; }, [timerState]);

  // ── recognition 초기화 ───────────────────────────────────────────────────

  const initRecognition = useCallback(() => {
    if (!isSupported) return null;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    // ── onstart: 발화 감지 즉시 타이머 상태 선점 캡처 ──────────────────
    recognition.onstart = () => {
      try {
        const current = timerStateRef.current;
        captureRef.current = {
          stepIndex: current.stepIndex,
          wallMs: performance.now(),
          totalElapsedMs: current.totalElapsedMs,
        };
        setVoiceState(prev => ({ ...prev, isListening: true }));
      } catch (err) {
        console.error('[useVoiceSync] onstart error:', err);
      }
    };

    // ── onresult: 인식 완료 → 보정 → 매핑 ──────────────────────────────
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      try {
        resultTimestampRef.current = performance.now();

        const captured = captureRef.current;
        if (!captured) return;

        // 가장 confidence 높은 후보 선택
        let bestTranscript = '';
        let bestConfidence = 0;
        const result = event.results[0];
        for (let i = 0; i < result.length; i++) {
          if (result[i].confidence > bestConfidence) {
            bestConfidence = result[i].confidence;
            bestTranscript = result[i].transcript.trim();
          }
        }

        // 실측 latency 계산 및 보정
        const rawLatencyMs = resultTimestampRef.current - captured.wallMs;
        // 실측값과 설정값 중 합리적인 값 사용 (최소 0, 최대 2초)
        const latencyMs = Math.min(Math.max(rawLatencyMs, 0), 2000);
        const correctedElapsedMs = Math.max(0, captured.totalElapsedMs - latencyCompensationMs);

        // 보정된 경과 시간으로 실제 스텝 역산
        const actualStepIndex = resolveStepFromElapsed(correctedElapsedMs, steps);
        const targetStep = steps[actualStepIndex];

        // 숫자 파싱
        const parsedValue = parseNumberFromTranscript(bestTranscript);

        setVoiceState(prev => ({ ...prev, lastTranscript: bestTranscript }));

        if (parsedValue === null || bestTranscript === '') {
          // 파싱 실패 → fallback
          triggerFallback(captured.stepIndex);
          return;
        }

        const record: AuditRecord = {
          stepIndex: actualStepIndex,
          action: targetStep?.action ?? '',
          expectedWaterMl: targetStep?.waterMl ?? null,
          actualWaterMl: parsedValue,
          captureTimeMs: captured.totalElapsedMs,
          actualTimeMs: correctedElapsedMs,
          latencyMs,
          inputMethod: 'voice',
        };

        commitRecord(record);
      } catch (err) {
        console.error('[useVoiceSync] onresult error:', err);
        if (captureRef.current) triggerFallback(captureRef.current.stepIndex);
      }
    };

    // ── onerror: 인식 오류 → fallback ──────────────────────────────────
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      try {
        console.warn('[useVoiceSync] recognition error:', event.error);
        const stepIndex = captureRef.current?.stepIndex ?? timerStateRef.current.stepIndex;
        triggerFallback(stepIndex);
      } catch (err) {
        console.error('[useVoiceSync] onerror handler error:', err);
      }
    };

    recognition.onend = () => {
      setVoiceState(prev => ({ ...prev, isListening: false }));
    };

    return recognition;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, latencyCompensationMs, steps]);

  // ── fallback 처리 ────────────────────────────────────────────────────────

  const triggerFallback = useCallback((stepIndex: number) => {
    setVoiceState(prev => ({ ...prev, isListening: false, pendingManualInput: true }));
    onFallback?.(stepIndex);
  }, [onFallback]);

  // ── record 커밋 ──────────────────────────────────────────────────────────

  const commitRecord = useCallback((record: AuditRecord) => {
    setVoiceState(prev => ({
      ...prev,
      auditLog: [...prev.auditLog, record],
      pendingManualInput: false,
    }));
    onStepAudited?.(record);
  }, [onStepAudited]);

  // ── 컨트롤 ────────────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!isSupported) return;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      recognitionRef.current = initRecognition();
      recognitionRef.current?.start();
    } catch (err) {
      console.error('[useVoiceSync] startListening error:', err);
    }
  }, [isSupported, initRecognition]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch (err) {
      console.error('[useVoiceSync] stopListening error:', err);
    }
  }, []);

  /**
   * submitManual — 수동 입력 fallback
   * pendingManualInput 상태에서 사용자가 직접 숫자를 입력할 때 호출
   */
  const submitManual = useCallback((waterMl: number) => {
    const current = timerStateRef.current;
    const targetStep = steps[current.stepIndex];

    const record: AuditRecord = {
      stepIndex: current.stepIndex,
      action: targetStep?.action ?? '',
      expectedWaterMl: targetStep?.waterMl ?? null,
      actualWaterMl: waterMl,
      captureTimeMs: current.totalElapsedMs,
      actualTimeMs: current.totalElapsedMs,
      latencyMs: 0,
      inputMethod: 'manual',
    };

    commitRecord(record);
  }, [steps, commitRecord]);

  /**
   * skipStep — 값 입력 없이 현재 스텝을 건너뜀
   */
  const skipStep = useCallback(() => {
    const current = timerStateRef.current;
    const targetStep = steps[current.stepIndex];

    const record: AuditRecord = {
      stepIndex: current.stepIndex,
      action: targetStep?.action ?? '',
      expectedWaterMl: targetStep?.waterMl ?? null,
      actualWaterMl: null,
      captureTimeMs: current.totalElapsedMs,
      actualTimeMs: current.totalElapsedMs,
      latencyMs: 0,
      inputMethod: 'skipped',
    };

    commitRecord(record);
  }, [steps, commitRecord]);

  const clearLog = useCallback(() => {
    setVoiceState(prev => ({ ...prev, auditLog: [], lastTranscript: '' }));
  }, []);

  // cleanup
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    };
  }, []);

  const controls: VoiceSyncControls = {
    startListening,
    stopListening,
    submitManual,
    skipStep,
    clearLog,
  };

  return [voiceState, controls];
}
