import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOwner } from "../middlewares/requireOwner.js";
import { createCategory, createInternalTicket, updateCategoryReviewerId, getTicketsByReviewer, getAllTeams, getAllLegalOwners, reviewTicket, getTicketReviewDetails, getCategoriesByOrganization, deleteRequestForm } from "../controllers/internalTicketing.controller.js";
import { getFormReviewers } from "../controllers/newPublicForm.js";

const router = express.Router();

router.get('/get-all-teams/:organizationId',requireAuth, requireOwner, getAllTeams ) //✅
router.post('/create-category',requireAuth, requireOwner, createCategory ) //✅
// router.get('/get-reviewers',requireAuth, requireOwner, getFormReviewers )
router.patch('/update-category-reviewer',requireAuth, requireOwner, updateCategoryReviewerId) //✅
router.post('/create-internal-ticket',requireAuth, requireOwner, createInternalTicket ) //✅
router.get('/get-all-requests/:reviewerId/:pendingReview',requireAuth, requireOwner, getTicketsByReviewer ) //✅

router.get('/get-legal-owners/:organizationId/:assignedTeamId',requireAuth, requireOwner,  getAllLegalOwners)
router.get('/get-legal-owners/:organizationId',requireAuth, requireOwner,  getAllLegalOwners) //✅

router.patch('/review-ticket/:ticketId', requireAuth, requireOwner, reviewTicket) //✅
router.get('/review-details/:ticketId', requireAuth, requireOwner, getTicketReviewDetails)
router.get('/get-all-categories/:organizationId', requireAuth, requireOwner, getCategoriesByOrganization) //✅
router.delete('/delete-category/:categoryId', requireAuth, requireOwner, deleteRequestForm)

// router.get('/get-all-internal-tickets', )

export default router;