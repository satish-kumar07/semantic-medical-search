"""Scan and fix all .ipynb notebooks by removing 'metadata.widgets' entries that lack 'state'.
Creates a backup for each modified notebook with suffix .bak.YYYYMMDDHHMMSS
"""
import json
from pathlib import Path
from datetime import datetime

def remove_widgets_meta(obj):
    removed = 0
    if isinstance(obj, dict):
        if 'metadata' in obj and isinstance(obj['metadata'], dict) and 'widgets' in obj['metadata']:
            del obj['metadata']['widgets']
            removed += 1
        for v in obj.values():
            removed += remove_widgets_meta(v)
    elif isinstance(obj, list):
        for item in obj:
            removed += remove_widgets_meta(item)
    return removed

root = Path('.').resolve()
count = 0
for p in root.rglob('*.ipynb'):
    try:
        data = json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        print(f'Failed to read {p}: {e}')
        continue
    removed = remove_widgets_meta(data)
    if removed:
        ts = datetime.now().strftime('%Y%m%d%H%M%S')
        bak = p.with_name(p.name + f'.bak.{ts}')
        bak.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
        p.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
        print(f'Fixed {p} - removed {removed} entries (backup {bak.name})')
        count += 1
print(f'Done. Notebooks fixed: {count}')
