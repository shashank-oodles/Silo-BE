import express from "express";

import { requireCommonAuth } from "../middlewares/requireCommonAuth.js";
import { authenticate } from "../middlewares/authenticate.js";
import { attachUserContext, getAttachUserContext } from "../middlewares/attachUserContext.js";
import { createTicketMessage, createComment, getTicketMessages, getTicketComments, getTicketDetails, getAllTickets, getTicketsForReview, getTicketStatus, generateUsageReport } from "../controllers/commonFunctionalities.controller.js";

const router = express.Router();

router.post('/ticket-message/:ticketId', attachUserContext, createTicketMessage);
router.post('/ticket-comment/:ticketId', attachUserContext, createComment);

// router.get('/ticket-message/:ticketId', getAttachUserContext, getTicketMessages);
router.get('/ticket-message/:ticketId', getAttachUserContext, getTicketMessages);
router.get('/ticket-comments/:ticketId', getAttachUserContext, getTicketComments);
router.get('/tickets/:ticket_id', getTicketStatus)

router.get('/get-ticket-detail/:ticketId', getTicketDetails)
router.get('/get-all-tickets', requireCommonAuth, getAllTickets)
router.get('/get-all-tickets-review', requireCommonAuth, getTicketsForReview)

router.get('/reports/usage', authenticate, generateUsageReport);

export default router;