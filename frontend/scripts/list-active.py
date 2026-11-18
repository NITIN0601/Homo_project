with open("frontend/scripts/analyze-dependencies.py") as f:
    code = f.read()

active_code = """
print("\\n--- ACTIVE_LEGACY_DEPENDENCY FILES ---")
count = 0
for f, info in sorted(classification.items()):
    if info["status"] == "ACTIVE_LEGACY_DEPENDENCY":
        count += 1
        print(f"{count}. {f}")
"""
exec(code + active_code)
