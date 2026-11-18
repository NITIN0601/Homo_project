import os, re, json

repo_root = "frontend/src"
all_files = []
for dirpath, _, filenames in os.walk(repo_root):
    for f in filenames:
        if f.endswith((".ts", ".tsx")):
            all_files.append(os.path.normpath(os.path.join(dirpath, f)))

legacy_roots = [
    "frontend/src/components",
    "frontend/src/services",
    "frontend/src/pages",
    "frontend/src/context",
    "frontend/src/hooks",
    "frontend/src/utils",
    "frontend/src/types",
    "frontend/src/config",
    "frontend/src/data",
    "frontend/src/router",
]

legacy_files = []
new_files = []

for f in all_files:
    is_legacy = any(f.startswith(os.path.normpath(lr)) for lr in legacy_roots)
    if is_legacy:
        legacy_files.append(f)
    else:
        new_files.append(f)

test_files = [f for f in legacy_files if "frontend/src/test/" in f]
legacy_files = [f for f in legacy_files if "frontend/src/test/" not in f]

# Reference regex
import_pattern = re.compile(r"""(?:import|export)\s+(?:.*?from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)""")

references_to_file = {f: {"new_refs": [], "legacy_refs": [], "test_refs": []} for f in legacy_files}

for source_file in all_files:
    is_source_new = source_file in new_files
    is_source_test = "frontend/src/test" in source_file or "frontend/src/tests" in source_file
    
    with open(source_file, "r", errors="ignore") as fl:
        text = fl.read()
    
    for match in import_pattern.finditer(text):
        target_str = match.group(1) or match.group(2)
        if not target_str or not target_str.startswith("."):
            continue
        
        src_dir = os.path.dirname(source_file)
        resolved = os.path.normpath(os.path.join(src_dir, target_str))
        
        target_matched = None
        for cand in [resolved, resolved + ".ts", resolved + ".tsx", os.path.join(resolved, "index.ts"), os.path.join(resolved, "index.tsx")]:
            if cand in references_to_file:
                target_matched = cand
                break
        
        if target_matched:
            ref_category = "test_refs" if is_source_test else ("new_refs" if is_source_new else "legacy_refs")
            if source_file not in references_to_file[target_matched][ref_category]:
                references_to_file[target_matched][ref_category].append(source_file)

# Classify files
# Statuses:
# VERIFIED_FOR_DELETION
# MIGRATION_REQUIRED
# TESTING_REQUIRED
# ACTIVE_LEGACY_DEPENDENCY
# SHARED_DEPENDENCY
# MERGED_INTO_NEW_IMPLEMENTATION
# INTENTIONALLY_RETAINED
# NOT_REQUIRED

classification = {}

for f in legacy_files:
    with open(f, "r", errors="ignore") as fl:
        lines = [l.strip() for l in fl.readlines() if l.strip()]
    # A file is a shim if it contains purely re-export statements without primary implementations (no state, hooks, or component JSX)
    has_implementation = any(
        any(l.startswith(prefix) for prefix in ["const ", "function ", "class ", "let ", "var "])
        and not any(l.startswith(exp) for exp in ["export *", "export {", "export default"])
        for l in lines if not l.startswith("//") and not l.startswith("/*") and not l.startswith("*")
    ) or any("return (" in l or "return <" in l or "useState" in l for l in lines)

    is_pure_reexport = not has_implementation
    is_shim = is_pure_reexport and (
        any(target_dir in l for target_dir in ["app", "core", "domains", "shared", "mocks", "./", "../"] for l in lines)
    )
    
    new_refs = references_to_file[f]["new_refs"]
    legacy_refs = references_to_file[f]["legacy_refs"]
    test_refs = references_to_file[f]["test_refs"]
    total_refs = len(new_refs) + len(legacy_refs) + len(test_refs)
    
    if not is_shim:
        # File still has real implementation in legacy
        if total_refs > 0:
            classification[f] = {
                "status": "ACTIVE_LEGACY_DEPENDENCY",
                "reason": f"Holds active primary implementation; referenced by {len(legacy_refs)} legacy files, {len(new_refs)} new files, {len(test_refs)} tests.",
                "is_shim": False
            }
        else:
            classification[f] = {
                "status": "MIGRATION_REQUIRED",
                "reason": "Holds implementation in legacy directory; needs physical extraction into target domain.",
                "is_shim": False
            }
    else:
        # File is a shim re-exporting to canonical target
        if len(new_refs) > 0:
            # Critical deletion rule: new architecture still references legacy shim
            classification[f] = {
                "status": "SHARED_DEPENDENCY" if len(new_refs) > 2 else "MIGRATION_REQUIRED",
                "reason": f"New architecture still references this legacy path ({len(new_refs)} new references). Must update new imports to canonical target before deleting.",
                "is_shim": True
            }
        elif len(legacy_refs) > 0 or len(test_refs) > 0:
            classification[f] = {
                "status": "INTENTIONALLY_RETAINED",
                "reason": f"Active backward-compatibility shim. Implementation is migrated to target, but retained for {len(legacy_refs)} legacy files and {len(test_refs)} tests.",
                "is_shim": True
            }
        else:
            classification[f] = {
                "status": "VERIFIED_FOR_DELETION",
                "reason": "Implementation fully migrated and verified in target architecture; zero active references across repository.",
                "is_shim": True
            }

status_counts = {}
for f, info in classification.items():
    st = info["status"]
    status_counts[st] = status_counts.get(st, 0) + 1

print("\n=== CLASSIFICATION SUMMARY ===")
for st, cnt in sorted(status_counts.items()):
    print(f"{st}: {cnt}")

print(f"\nTotal legacy files analyzed: {len(legacy_files)}")

print("\n=== MIGRATION_REQUIRED & SHARED_DEPENDENCY ===")
for f, info in sorted(classification.items()):
    if info["status"] in ["MIGRATION_REQUIRED", "SHARED_DEPENDENCY"]:
        print(f"| `{f}` | {info['status']} | is_shim={info['is_shim']} | {info['reason']} |")


print("\n=== DELETION REVIEW CANDIDATES (VERIFIED_FOR_DELETION: 0 ACTIVE REFERENCES) ===")
print("| Legacy File | Canonical Target | References (New/Legacy/Test) | Status |")
print("|---|---|---|---|")
for f, info in sorted(classification.items()):
    if info["status"] == "VERIFIED_FOR_DELETION":
        with open(f, "r") as fl:
            first_line = [l.strip() for l in fl.readlines() if "from " in l][0]
        # extract target inside quotes
        m = re.search(r'["\x27]([^"\x27]+)["\x27]', first_line)
        target = m.group(1) if m else "target"
        print(f"| `{f}` | `{target}` | 0 / 0 / 0 | **VERIFIED_FOR_DELETION** |")

