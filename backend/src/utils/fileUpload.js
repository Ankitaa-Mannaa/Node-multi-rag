const path = require("path");
const multer = require("multer");
const ApiError = require("./ApiError");
const { ensureDirSync } = require("./ensureDir");

const ALLOWED_BY_RAG = {
  support: ["application/pdf"],
  resume: ["application/pdf"],
  expense: ["text/csv", "application/vnd.ms-excel"],
};

const EXTENSIONS_BY_RAG = {
  support: [".pdf"],
  resume: [".pdf"],
  expense: [".csv"],
};

const createUpload = () => {
  const baseDir =
    process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads");

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const ragType = (req.body.rag_type || "").toLowerCase();
      const userId = req.user?.id || "anonymous";

      if (!ALLOWED_BY_RAG[ragType]) {
        return cb(new ApiError("Invalid rag_type for upload", 400));
      }

      const dest = path.join(baseDir, userId, ragType);
      ensureDirSync(dest);
      return cb(null, dest);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${timestamp}_${safeName}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const ragType = (req.body.rag_type || "").toLowerCase();
    const allowed = ALLOWED_BY_RAG[ragType];
    const allowedExt = EXTENSIONS_BY_RAG[ragType] || [];
    if (!allowed) {
      return cb(new ApiError("Invalid rag_type for upload", 400));
    }

    if (!allowed.includes(file.mimetype)) {
      return cb(new ApiError("Unsupported file type", 400));
    }

    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!allowedExt.includes(ext)) {
      return cb(new ApiError("Unsupported file extension", 400));
    }

    return cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  });
};

module.exports = { createUpload };
