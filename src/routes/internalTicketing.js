import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOwner } from "../middlewares/requireOwner.js";
import { createCategory, createInternalTicket, updateCategoryReviewerId, getTicketsByReviewer, getAllTeams, getAllLegalOwners } from "../controllers/internalTicketing.controller.js";
import { getFormReviewers } from "../controllers/newPublicForm.js";

const router = express.Router();

router.get('/get-all-teams/:organizationId',requireAuth, requireOwner, getAllTeams ) //✅
router.post('/create-category',requireAuth, requireOwner, createCategory ) //✅
// router.get('/get-reviewers',requireAuth, requireOwner, getFormReviewers )
router.patch('/update-category-reviewer',requireAuth, requireOwner, updateCategoryReviewerId) //✅
router.post('/create-internal-ticket',requireAuth, requireOwner, createInternalTicket ) //✅
router.get('/get-all-requests/:reviewerId/:organizationId',requireAuth, requireOwner, getTicketsByReviewer ) //✅
router.get('/get-legal-owners/:assignedTeamId',requireAuth, requireOwner,  getAllLegalOwners) //✅


export default router;