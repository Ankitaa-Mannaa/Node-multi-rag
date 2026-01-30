const express = require("express");
const auth = require("../middlewares/auth");
const jobsController = require("../controllers/jobs.controller");

const router = express.Router();

router.get("/jobs", auth, jobsController.listJobs);

module.exports = router;
