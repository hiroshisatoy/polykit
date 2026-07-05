#!/usr/bin/env python3

import json
import os
import sys
import zipfile

print("PolyKit extension packager")
print("Usage: ./pack-ext.py ./")


def zipdir(path, name):
    zipf = zipfile.ZipFile(name, 'w', zipfile.ZIP_DEFLATED)
    exclude_prefixes = ['__', '.', 'eslint', 'tests']
    exclude_suffixes = ['.xpi', '.zip', '.py', 'ISSUE_TEMPLATE.md', 'README.md']
    for dirpath, dirnames, filenames in os.walk(path):
        dirnames[:] = [
            dirname for dirname in dirnames
            if all(not dirname.startswith(prefix) for prefix in exclude_prefixes)
        ]
        filenames[:] = [
            filename for filename in filenames
            if all(not filename.startswith(prefix) for prefix in exclude_prefixes)
            and all(not filename.endswith(suffix) for suffix in exclude_suffixes)
        ]
        for file_found in filenames:
            zipf.write(os.path.join(dirpath, file_found))
    zipf.close()


if len(sys.argv) > 1 and os.path.isdir(sys.argv[1]):
    manifest_path = os.path.join(sys.argv[1], 'manifest.json')
    if os.path.isfile(manifest_path):
        with open(manifest_path, encoding='utf-8') as content:
            data = json.load(content)
            name = data['name'].replace(' ', '-') + '_v' + data['version']
            zipdir(sys.argv[1], name + '.zip')
            print("- Chrome package done: " + name + '.zip')
            zipdir(sys.argv[1], name + '.xpi')
            print("- Firefox package done: " + name + '.xpi')
    else:
        print("Manifest not found: " + manifest_path)
        sys.exit(1)
else:
    print("Path not found")
    sys.exit(1)
