from pathlib import Path
import subprocess

# Restore V3 exactly to the commit immediately before the accidental PO/Dev label mode.
BASE='ea0f7360261ee73ff33ff97317743bdf77619867'
TARGET='net-cao-hon-co-that-tot-hon-v3.html'
content=subprocess.check_output(['git','show',f'{BASE}:{TARGET}'])
Path(TARGET).write_bytes(content)
label_test=Path('tests/v3-ui-component-labels.mjs')
if label_test.exists(): label_test.unlink()
print('RESTORED V3 freeze baseline',BASE)
