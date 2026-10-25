from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
script = (root / 'docs/demo_script.md').read_text()
pattern = r'^## (\d{2}:\d{2})–(\d{2}:\d{2}) — Person ([1-4]) — ([^\n]+)\n(.*?)(?=^## |\Z)'
segments = re.findall(pattern, script, re.M | re.S)
assert len(segments) == 4, 'Exactly four timed speaker segments required'
seconds = lambda value: int(value[:2]) * 60 + int(value[3:])
roles = ['Data & Topology', 'Twin & Labor Engine', 'Utility Interface & Controls', 'Customer Concierge & Orchestration']
expected_durations = [40, 45, 50, 45]
expected_words = []
previous_end = 0
results = []
for i, (start, end, speaker, role, body) in enumerate(segments):
    begin, finish = seconds(start), seconds(end)
    assert begin == previous_end, 'Timecode gap or overlap'
    assert finish - begin == expected_durations[i]
    assert speaker == str(i + 1) and role == roles[i]
    blocks = re.findall(r'^> (.+)$', body, re.M)
    assert len(blocks) == 1, 'One spoken block per speaker required'
    count = len(blocks[0].split())
    assert body.count('[UI Variation Note]') == 1
    expected_words.append(count)
    results.append({'speaker': int(speaker), 'role': role, 'start': start, 'end': end, 'duration_seconds': finish - begin, 'spoken_words': count, 'delivery_seconds': finish - begin - 2, 'words_per_delivery_minute': round(count / (finish - begin - 2) * 60, 2)})
    previous_end = finish
assert previous_end == 180
assert script.count('[UI Variation Note]') == 4
assert 380 <= sum(expected_words) <= 420
assert f'**Spoken budget:** {sum(expected_words)} words.' in script
for i, count in enumerate(expected_words):
    assert f'| Person {i+1} — {roles[i]}' in script
    row = next(line for line in script.splitlines() if line.startswith(f'| Person {i+1} —'))
    assert f'| {count} words |' in row
    segment = results[i]
    assert f"| {segment['start']}–{segment['end']} | {segment['duration_seconds']} s |" in row
assert f"Counts by Person 1–4: **{' / '.join(map(str, expected_words))}**" in script
assert '**03:00**' in script and '02:58–03:00' in script
assert '(C21 + D21) × 4.5' in script
assert '117,549' in script and '52 public facilities' in script
assert '2–8' in script and '0–24 h' in script
assert '45-degree cutout' in script and '-2.05' in script
result = {'passed': True, 'total_seconds': previous_end, 'total_spoken_words': sum(expected_words), 'delivery_seconds': 172, 'silent_seconds': 8, 'segments': results, 'word_count_rule': 'Whitespace-delimited words in the four quoted narration blocks only; numeric facts spelled out.', 'scope': 'Script timing and word budget; recorded media duration not yet verified.'}
(root / 'verification/timecodes-and-words.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
