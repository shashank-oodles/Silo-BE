import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireOwner, requireOwnerLegalIncl } from "../middlewares/requireOwner.js";
import { createCategory, createInternalTicket, updateCategoryReviewerId, getTicketsByReviewer, getAllTeams, getAllLegalOwners, reviewTicket, getTicketReviewDetails, getCategoriesByOrganization, deleteCategory, updateCategory } from "../controllers/internalTicketing.controller.js";
import { getFormReviewers } from "../controllers/newPublicForm.js";

const router = express.Router();

router.get('/get-all-teams/:organizationId',requireAuth, requireOwner, getAllTeams ) //✅
router.post('/create-category',requireAuth, requireOwner, createCategory ) //✅
router.patch('/update-category/:id',requireAuth, updateCategory ) //✅
// router.get('/get-reviewers',requireAuth, requireOwner, getFormReviewers )
router.patch('/update-category-reviewer',requireAuth, requireOwner, updateCategoryReviewerId) //✅
router.post('/create-internal-ticket',requireAuth, createInternalTicket ) //✅
router.get('/get-all-requests/:reviewerId/:pendingReview',requireAuth, requireOwner, getTicketsByReviewer ) //✅

router.get('/get-legal-owners/:organizationId/:assignedTeamId',requireAuth, requireOwnerLegalIncl,  getAllLegalOwners)
router.get('/get-legal-owners/:organizationId',requireAuth, requireOwnerLegalIncl,  getAllLegalOwners) //✅

router.patch('/review-ticket/:ticketId', requireAuth, requireOwner, reviewTicket) //✅
router.get('/review-details/:ticketId', requireAuth, requireOwner, getTicketReviewDetails)
router.get('/get-all-categories/:organizationId', requireAuth, getCategoriesByOrganization) //✅
router.delete('/delete-category/:categoryId', requireAuth, requireOwner, deleteCategory)

// router.get('/get-all-internal-tickets', )

export default router;