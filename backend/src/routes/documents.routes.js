const express = require("express");
const auth = require("../middlewares/auth");
const documentsController = require("../controllers/documents.controller");
const documentsListController = require("../controllers/documents.list.controller");
const documentsDeleteController = require("../controllers/documents.delete.controller");
const { createUpload } = require("../utils/fileUpload");
const validate = require("../middlewares/validate");
const { uploadDocumentSchema } = require("../schemas/documents.schema");

const router = express.Router();
const upload = createUpload();

router.post(
  "/documents/upload",
  auth,
  upload.single("file"),
  validate(uploadDocumentSchema),
  documentsController.uploadDocument
);

router.get("/documents", auth, documentsListController.listDocuments);

router.delete("/documents/:id", auth, documentsDeleteController.deleteDocument);

module.exports = router;
