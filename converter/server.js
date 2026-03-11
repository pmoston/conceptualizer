const express = require("express");
const { execFile } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");

const execFileAsync = promisify(execFile);

// Prefix all log output with an ISO timestamp
const _log = console.log.bind(console);
const _err = console.error.bind(console);
console.log = (...a) => _log(new Date().toISOString(), ...a);
console.error = (...a) => _err(new Date().toISOString(), ...a);

const app = express();
app.use(express.json());

// Both app and converter mount the uploads volume at /app/uploads.
// Paths arriving from the app are relative to /app (e.g. "uploads/projectId/file.docx").
const APP_ROOT = "/app";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const EXEC_TIMEOUT = 60_000;

app.get("/health", (_req, res) => res.json({ ok: true }));

// POST /process
// Body: { filePath: string, mimeType: string }
// filePath is relative to APP_ROOT, e.g. "uploads/proj123/1234-doc.docx"
// Returns: { previewPath: string, ocrText: string | null }
app.post("/process", async (req, res) => {
  const { filePath, mimeType } = req.body;
  if (!filePath || !mimeType) {
    return res.status(400).json({ error: "filePath and mimeType required" });
  }

  const absInput = path.join(APP_ROOT, filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const previewRelPath = path.join(path.dirname(filePath), `${baseName}_preview.png`);
  const absPreview = path.join(APP_ROOT, previewRelPath);

  // Unique scratch directory in /tmp — avoids HOME=/tmp conflicts with LibreOffice
  // and keeps the uploads volume clean during conversion.
  const scratchDir = `/tmp/conv_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    let ocrText = null;

    if (IMAGE_TYPES.includes(mimeType)) {
      await sharp(absInput).png().toFile(absPreview);

      const { stdout } = await execFileAsync(
        "tesseract",
        [absPreview, "stdout", "-l", "deu+eng"],
        { timeout: EXEC_TIMEOUT }
      );
      ocrText = stdout.trim() || null;
    } else {
      await fs.mkdir(scratchDir, { recursive: true });

      let absPdf = absInput;

      if (mimeType !== "application/pdf") {
        // Copy input to a simple filename inside scratchDir.
        // LibreOffice derives the output name from the input filename; long names
        // with special characters can cause silent failures or unexpected output paths.
        const ext = path.extname(absInput).toLowerCase() || ".docx";
        const tmpInput = path.join(scratchDir, `input${ext}`);
        await fs.copyFile(absInput, tmpInput);

        const { stdout, stderr } = await execFileAsync(
          "soffice",
          ["--headless", "--norestore", "--nofirststartwizard",
           "--convert-to", "pdf", "--outdir", scratchDir, tmpInput],
          { timeout: EXEC_TIMEOUT }
        );
        if (stdout) console.log("LibreOffice stdout:", stdout.trim());
        if (stderr) console.log("LibreOffice stderr:", stderr.trim());

        absPdf = path.join(scratchDir, "input.pdf");

        try {
          await fs.access(absPdf);
        } catch {
          const produced = await fs.readdir(scratchDir).catch(() => []);
          throw new Error(
            `LibreOffice did not produce a PDF. Scratch dir contains: [${produced.join(", ")}]`
          );
        }
      }

      // pdftoppm: -singlefile outputs {prefix}.png with no page-number suffix
      await execFileAsync(
        "pdftoppm",
        ["-r", "150", "-png", "-f", "1", "-l", "1", "-singlefile",
         absPdf, path.join(scratchDir, `${baseName}_preview`)],
        { timeout: EXEC_TIMEOUT }
      );

      // Copy the PNG from scratch to the uploads volume, then clean up source.
      // fs.rename fails across different filesystems (EXDEV), so use copy+unlink.
      await fs.copyFile(path.join(scratchDir, `${baseName}_preview.png`), absPreview);
      await fs.unlink(path.join(scratchDir, `${baseName}_preview.png`)).catch(() => {});
    }

    res.json({ previewPath: previewRelPath, ocrText });
  } catch (err) {
    const detail = [err.message, err.stderr, err.stdout].filter(Boolean).join(" | ");
    console.error("Converter error:", detail);
    res.status(500).json({ error: detail });
  } finally {
    // Always clean up scratch dir
    await fs.rm(scratchDir, { recursive: true, force: true }).catch(() => {});
  }
});

app.listen(3001, () => console.log("Converter listening on :3001"));
