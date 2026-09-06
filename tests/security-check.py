#!/usr/bin/env python3
"""Security check of baw-json.js: the library must not open network connections (no egress), listen (no ingress), touch files, run
external code or use reflection. It may only use the engine's own tw.object / tw.system.serializer and plain JavaScript / E4X.
usage: python3 tests/security-check.py [path/to/baw-json.js]   -> exit code 0 = clean"""
import re, sys, os
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'baw-json.js')
src = open(path, encoding='utf-8').read()
# strip comments and string literals so that documentation cannot trigger a finding
code = re.sub(r'/\*[\s\S]*?\*/|//[^\n]*', '', src)
code = re.sub(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'', '""', code)
FORBIDDEN = [
    (r'\bjava\.net\b|\bjavax\.net\b|HttpURLConnection|\bURL\s*\(|Socket|ServerSocket|DatagramSocket', 'network access (egress / ingress)'),
    (r'\bjava\.io\b|\bjava\.nio\b|FileInputStream|FileOutputStream|FileReader|FileWriter|RandomAccessFile', 'file system access'),
    (r'\bjava\.lang\.Runtime\b|getRuntime\s*\(|ProcessBuilder|System\.exit|System\.setProperty', 'process / JVM control'),
    (r'\bjava\.lang\.reflect\b|Class\.forName|getDeclaredMethod|getMethod\s*\(|\.invoke\s*\(|setAccessible', 'reflection'),
    (r'\beval\s*\(|new\s+Function\s*\(|importClass|importPackage|\bload\s*\(', 'dynamic code loading'),
    (r'\bjava\.sql\b|javax\.sql|DriverManager|DataSource', 'database access'),
    (r'tw\.system\.invokeREST|tw\.system\.executeService|tw\.system\.startProcess|XMLHttpRequest|\bfetch\s*\(', 'engine calls that reach other systems'),
    (r'javax\.naming|InitialContext|javax\.jms|javax\.mail', 'JNDI / messaging / mail'),
]
ALLOWED_PACKAGES = re.compile(r'Packages\.java\.lang\.Object\b')
findings = []
for pattern, what in FORBIDDEN:
    for m in re.finditer(pattern, code):
        line = code.count('\n', 0, m.start()) + 1
        findings.append(f'{what}: "{m.group(0)}" (line ~{line})')
for m in re.finditer(r'Packages\.[A-Za-z0-9_.]+', code):
    if not ALLOWED_PACKAGES.match(m.group(0)):
        findings.append(f'Java package reference outside the allow-list: {m.group(0)}')
for m in re.finditer(r'\btw\.system\.(?!serializer\b)[A-Za-z_]+|\btw\.(?!object\b|system\b)[A-Za-z_]+', code):
    findings.append(f'engine API outside tw.object / tw.system.serializer: {m.group(0)}')
print(f'baw-json.js security check: {len(src.splitlines())} lines, {"CLEAN - no network, file, database, reflection or dynamic code use" if not findings else str(len(findings)) + " finding(s)"}')
for f in findings: print(' -', f)
sys.exit(1 if findings else 0)
