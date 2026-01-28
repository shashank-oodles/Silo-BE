import express from "express";

import { requireCommonAuth } from "../middlewares/requireCommonAuth.js";
import { attachUserContext } from "../middlewares/attachUserContext.js";
import { createTicketMessage, getTicketMessages } from "../controllers/commonFunctionalities.controller.js";

const router = express.Router();

router.post('/ticket-message/:ticketId', attachUserContext, createTicketMessage);
router.get('/ticket-message/:ticketId', attachUserContext, getTicketMessages);

export default router;