import express from "express";
import {createRequestForm} from "../controllers/newPublicForm.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOwner } from "../middlewares/requireOwner.js";
import { submitPublicTicket } from "../controllers/newPublicForm.js";
import { updateFormReviewerId } from "../controllers/newPublicForm.js";
import { getFormReviewers } from "../controllers/newPublicForm.js";
import { getRequestFormsByOrganization } from "../controllers/newPublicForm.js";
import { updateRequestForm } from "../controllers/newPublicForm.js";
import { deleteRequestForm } from "../controllers/newPublicForm.js";

const router = express.Router();

router.post("/createForm", requireAuth, requireOwner, createRequestForm)  //✅
router.post("/forms/:slug/submit", requireAuth, requireOwner, submitPublicTicket); //✅
router.patch("/form/reviewer-id-update", requireAuth, requireOwner, updateFormReviewerId); //✅
router.get("/form/reviewers/:organizationId", requireAuth, requireOwner, getFormReviewers); //✅
router.get("/get-request-forms/:organizationId", requireAuth, requireOwner, getRequestFormsByOrganization); //✅
router.put("/update-request-form/:formId/:organizationId", requireAuth, requireOwner, updateRequestForm) //✅
router.delete("/delete-request-form/:formId/:organizationId", requireAuth, requireOwner, deleteRequestForm) //✅


export default router