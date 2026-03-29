"""
Coffee Note — CQI 씨드 데이터 import
사용법:
  1. pip install supabase python-dotenv
  2. 이 파일과 같은 폴더에 arabica_data_cleaned.csv 위치
  3. python3 seed_cqi.py

환경변수 (터미널에서 직접 설정하거나 .env 파일 사용):
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY=eyJ...
"""

import os, csv, sys, time
from pathlib import Path

# ── 환경변수 로드 ──────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env.local")
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ 환경변수 없음. 터미널에서 직접 입력하세요:")
    SUPABASE_URL = input("SUPABASE_URL: ").strip()
    SUPABASE_KEY = input("SUPABASE_SERVICE_KEY: ").strip()

try:
    from supabase import create_client
except ImportError:
    print("❌ supabase 패키지 없음. 설치: pip install supabase")
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── CSV 파일 위치 ──────────────────────────────────────
CSV_PATH = Path(__file__).parent / "arabica_data_cleaned.csv"
if not CSV_PATH.exists():
    # 상위 폴더도 확인
    CSV_PATH = Path(__file__).parent.parent / "arabica_data_cleaned.csv"
if not CSV_PATH.exists():
    print(f"❌ CSV 파일을 찾을 수 없습니다: {CSV_PATH}")
    print("   arabica_data_cleaned.csv를 scripts/ 폴더에 넣어주세요.")
    sys.exit(1)

print(f"✅ CSV 파일 발견: {CSV_PATH}")

# ── CQI 컬럼 매핑 (CSV 헤더 → Supabase 컬럼) ──────────
# CSV 컬럼명은 버전마다 다를 수 있어 유연하게 처리
FIELD_MAP = {
    # coffee info
    "Species":                  None,           # 항상 Arabica
    "Owner":                    None,
    "Country.of.Origin":        "country",
    "Farm.Name":                None,
    "Lot.Number":               None,
    "Mill":                     None,
    "ICO.Number":               None,
    "Company":                  "grader",
    "Altitude":                 None,
    "Region":                   None,
    "Producer":                 None,
    "Number.of.Bags":           None,
    "Bag.Weight":               None,
    "In.Country.Partner":       None,
    "Harvest.Year":             None,
    "Grading.Date":             None,
    "Owner.1":                  None,
    "Variety":                  "variety",
    "Status":                   None,
    "Processing.Method":        "process",
    "Moisture":                 "moisture",
    "Category.One.Defects":     None,
    "Quakers":                  None,
    "Color":                    "color",
    "Category.Two.Defects":     "defects",
    "Expiration":               None,
    "Certification.Body":       None,
    "Certification.Address":    None,
    "Certification.Contact":    None,
    "unit_of_measurement":      None,
    "altitude_low_meters":      None,
    "altitude_high_meters":     None,
    "altitude_mean_meters":     None,
    # sensory scores
    "Aroma":                    "aroma",
    "Flavor":                   "flavor",
    "Aftertaste":               "aftertaste",
    "Acidity":                  "acidity",
    "Body":                     "body",
    "Balance":                  "balance",
    "Uniformity":               "uniformity",
    "Clean.Cup":                "clean_cup",
    "Sweetness":                "sweetness",
    "Cupper.Points":            None,
    "Total.Cup.Points":         "total_score",
}

def safe_float(val, default=None):
    try:
        v = float(str(val).strip())
        return round(v, 1) if v > 0 else default
    except:
        return default

def safe_int(val, default=0):
    try:
        return int(float(str(val).strip()))
    except:
        return default

def clean_text(val):
    return str(val).strip() if val and str(val).strip() not in ("", "None", "nan") else ""

# ── CSV 읽기 ──────────────────────────────────────────
rows_to_insert = []
skipped = 0

with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    headers = reader.fieldnames or []
    print(f"📋 컬럼 수: {len(headers)}")

    for i, row in enumerate(reader):
        # 원두명: 없으면 국가+품종+가공으로 생성
        name_parts = [
            clean_text(row.get("Country.of.Origin", "")),
            clean_text(row.get("Variety", "")),
            clean_text(row.get("Processing.Method", "")),
        ]
        coffee_name = " ".join(p for p in name_parts if p) or f"Unknown #{i}"

        total = safe_float(row.get("Total.Cup.Points", ""))
        if total is None or total < 60:
            skipped += 1
            continue  # 60점 미만 제외 (품질 필터)

        record = {
            "coffee_name": coffee_name,
            "country":     clean_text(row.get("Country.of.Origin", "")),
            "variety":     clean_text(row.get("Variety", "")),
            "process":     clean_text(row.get("Processing.Method", "")),
            "color":       clean_text(row.get("Color", "")),
            "aroma":       safe_float(row.get("Aroma", "")),
            "flavor":      safe_float(row.get("Flavor", "")),
            "aftertaste":  safe_float(row.get("Aftertaste", "")),
            "acidity":     safe_float(row.get("Acidity", "")),
            "body":        safe_float(row.get("Body", "")),
            "balance":     safe_float(row.get("Balance", "")),
            "uniformity":  safe_float(row.get("Uniformity", "")),
            "clean_cup":   safe_float(row.get("Clean.Cup", "")),
            "sweetness":   safe_float(row.get("Sweetness", "")),
            "total_score": total,
            "moisture":    safe_float(row.get("Moisture", "")),
            "defects":     safe_int(row.get("Category.Two.Defects", ""), 0),
            "grader":      clean_text(row.get("Company", "")),
        }
        rows_to_insert.append(record)

print(f"📊 import 대상: {len(rows_to_insert)}건 (건너뜀: {skipped}건)")

# ── Supabase에 배치 insert ────────────────────────────
BATCH = 100
success, fail = 0, 0

for start in range(0, len(rows_to_insert), BATCH):
    batch = rows_to_insert[start:start+BATCH]
    try:
        result = sb.table("cqi_benchmarks").insert(batch).execute()
        success += len(batch)
        print(f"  ✅ {start+len(batch)}/{len(rows_to_insert)} 완료")
    except Exception as e:
        fail += len(batch)
        print(f"  ❌ 배치 {start}~{start+len(batch)} 오류: {e}")
    time.sleep(0.3)  # rate limit 방지

print(f"\n🎉 완료: 성공 {success}건 / 실패 {fail}건")
print("Supabase Table Editor → cqi_benchmarks 에서 확인하세요.")
