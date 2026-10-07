import os
import zipfile
import shutil

ROOT_DIR = r"D:\antigravitry"
OUTPUT_ZIP = r"D:\antigravitry\KisanIQ-project.zip"
ARTIFACT_ZIP = r"C:\Users\shive\.gemini\antigravity\brain\c100c33d-33c9-4146-85ce-12bfb38ace88\KisanIQ-project.zip"

# Explicit folders belonging to KisanIQ project
KISANIQ_FOLDERS = [
    "frontend",
    "server",
    "prisma",
    "scripts",
    "docs",
    ".github",
    ".vscode"
]

# Root files belonging to KisanIQ project
KISANIQ_ROOT_FILES = [
    "package.json",
    "package-lock.json",
    "README.md",
    ".env.example",
    ".gitignore",
    "render.yaml",
    "netlify.toml",
    "run_backend.bat",
    "run_frontend.bat",
    "CHATGPT_PROJECT_CONTEXT.md"
]

EXCLUDE_DIRS = {
    "node_modules",
    "dist",
    ".git",
    "data",  # server/db/data (embedded PGlite database files)
    "__pycache__",
    ".tempmediaStorage",
    ".cache",
    ".venv",
    ".turbo",
    ".next",
}

EXCLUDE_EXTS = {
    ".log",
    ".zip",
    ".sqlite",
    ".pyc",
}

EXCLUDE_FILENAMES = {
    ".DS_Store",
    "Thumbs.db",
    ".env",  # exclude raw .env files containing live local credentials; .env.example files are preserved
}

def make_zip():
    print(f"Packaging clean KisanIQ project zip from {ROOT_DIR}...")
    file_count = 0
    total_size = 0

    os.makedirs(os.path.dirname(ARTIFACT_ZIP), exist_ok=True)

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
        # 1. Add root files
        for fname in KISANIQ_ROOT_FILES:
            fpath = os.path.join(ROOT_DIR, fname)
            if os.path.isfile(fpath):
                zipf.write(fpath, fname)
                file_count += 1
                total_size += os.path.getsize(fpath)
                print(f"  Added root file: {fname}")

        # 2. Add KisanIQ project folders
        for folder in KISANIQ_FOLDERS:
            folder_path = os.path.join(ROOT_DIR, folder)
            if not os.path.isdir(folder_path):
                continue

            for root, dirs, files in os.walk(folder_path):
                # Prune excluded directories
                dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in EXCLUDE_EXTS:
                        continue
                    if file in EXCLUDE_FILENAMES:
                        continue

                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, ROOT_DIR)

                    zipf.write(full_path, rel_path)
                    file_count += 1
                    total_size += os.path.getsize(full_path)

    zip_size_kb = os.path.getsize(OUTPUT_ZIP) / 1024
    zip_size_mb = zip_size_kb / 1024
    print(f"\n==========================================")
    print(f"Successfully generated {OUTPUT_ZIP}:")
    print(f"  Total KisanIQ files: {file_count}")
    print(f"  Uncompressed size: {total_size / (1024*1024):.2f} MB")
    print(f"  Clean ZIP size: {zip_size_kb:.1f} KB ({zip_size_mb:.2f} MB)")
    print(f"==========================================")

    # Copy to artifacts directory
    shutil.copy2(OUTPUT_ZIP, ARTIFACT_ZIP)
    print(f"  Copied to artifact directory: {ARTIFACT_ZIP}")

if __name__ == "__main__":
    make_zip()
