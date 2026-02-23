import express from "express";

import { requireCommonAuth } from "../middlewares/requireCommonAuth.js";
import { attachUserContext, getAttachUserContext } from "../middlewares/attachUserContext.js";
import { createTicketMessage, getTicketMessages, getTicketDetails, getAllTickets, getTicketsForReview, getTicketStatus } from "../controllers/commonFunctionalities.controller.js";

const router = express.Router();

router.post('/ticket-message/:ticketId', attachUserContext, createTicketMessage);

// router.get('/ticket-message/:ticketId', getAttachUserContext, getTicketMessages);
router.get('/ticket-message/:ticketId', getAttachUserContext, getTicketMessages);
router.get('/tickets/:ticket_id', getTicketStatus)

router.get('/get-ticket-detail/:ticketId', getTicketDetails)
router.get('/get-all-tickets', requireCommonAuth, getAllTickets)
router.get('/get-all-tickets-review', requireCommonAuth, getTicketsForReview)

export default router;