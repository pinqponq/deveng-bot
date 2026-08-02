#!/usr/bin/env python3
"""Translate legal/*.json from en + terms/privacy sections 5–8 in main locale files."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ROOT / "src" / "locales"
LEGAL_EN = LOCALES / "legal" / "en.json"
MAIN_EN = LOCALES / "en.json"

# Panel locale -> Google Translate target code
LANG_TARGETS: dict[str, str] = {
    "fr": "fr",
    "es": "es",
    "de": "de",
    "ar": "ar",
    "pt": "pt",
    "zh": "zh-TW",
    "ru": "ru",
    "ko": "ko",
    "hr": "hr",
    "cnr": "bs",  # Latin; blizak crnogorskom (BCS)
}


def collect_strings(obj: object, out: list[str]) -> None:
    if isinstance(obj, dict):
        for v in obj.values():
            collect_strings(v, out)
    elif isinstance(obj, list):
        for v in obj:
            collect_strings(v, out)
    elif isinstance(obj, str) and obj.strip():
        out.append(obj)


def apply_translation_map(obj: object, m: dict[str, str]) -> object:
    if isinstance(obj, dict):
        return {k: apply_translation_map(v, m) for k, v in obj.items()}
    if isinstance(obj, list):
        return [apply_translation_map(v, m) for v in obj]
    if isinstance(obj, str) and obj in m:
        return m[obj]
    return obj


def build_map(unique: list[str], target: str, delay: float = 0.05) -> dict[str, str]:
    tr = GoogleTranslator(source="en", target=target)
    m: dict[str, str] = {}
    for i, s in enumerate(unique):
        if s in m:
            continue
        try:
            translated = tr.translate(s)
            m[s] = translated if translated else s
        except Exception:
            m[s] = s
        if (i + 1) % 25 == 0:
            print(f"    … {i + 1}/{len(unique)}", flush=True)
        time.sleep(delay)
    return m


def main() -> None:
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    legal_src = json.loads(LEGAL_EN.read_text(encoding="utf-8"))
    main_en = json.loads(MAIN_EN.read_text(encoding="utf-8"))

    terms_keys = [f"section{i}{t}" for i in range(5, 9) for t in ("Title", "Content")]
    terms_slice = {k: main_en["terms"][k] for k in terms_keys}
    privacy_slice = {k: main_en["privacy"][k] for k in terms_keys}

    for panel_lang, google_target in LANG_TARGETS.items():
        if only and panel_lang not in only:
            continue
        print(f"== {panel_lang} ({google_target}) ==", flush=True)

        legal_strings: list[str] = []
        collect_strings(legal_src, legal_strings)
        for d in (terms_slice, privacy_slice):
            collect_strings(d, legal_strings)
        legal_strings.append(main_en["terms"]["lastUpdated"])
        legal_strings.append(main_en["privacy"]["lastUpdated"])

        unique = list(dict.fromkeys(legal_strings))
        print(f"  unique strings: {len(unique)}", flush=True)

        mapping = build_map(unique, google_target)
        legal_out = apply_translation_map(legal_src, mapping)
        out_path = LOCALES / "legal" / f"{panel_lang}.json"
        out_path.write_text(
            json.dumps(legal_out, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"  wrote {out_path.relative_to(ROOT)}", flush=True)

        main_path = LOCALES / f"{panel_lang}.json"
        main_data = json.loads(main_path.read_text(encoding="utf-8"))
        for k in terms_keys:
            orig = main_en["terms"][k]
            main_data["terms"][k] = mapping.get(orig, orig)
            orig_p = main_en["privacy"][k]
            main_data["privacy"][k] = mapping.get(orig_p, orig_p)
        main_data["terms"]["lastUpdated"] = mapping.get(
            main_en["terms"]["lastUpdated"], main_data["terms"]["lastUpdated"]
        )
        main_data["privacy"]["lastUpdated"] = mapping.get(
            main_en["privacy"]["lastUpdated"], main_data["privacy"]["lastUpdated"]
        )
        # Modal içi çapraz link: gizlilik <-> şartlar başlığı uyumu
        main_data["privacy"]["termsLink"] = main_data["terms"]["title"]

        main_path.write_text(
            json.dumps(main_data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"  updated {main_path.relative_to(ROOT)} terms/privacy §5–8", flush=True)

    print("Done.", flush=True)


if __name__ == "__main__":
    main()
