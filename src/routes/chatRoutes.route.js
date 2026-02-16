// // routes/chatRoutes.js
// import express from 'express';
// import { createChat, getChatHistory, sendMessage, updateChatContext } from '../controllers/chatController.controller.js';
// import { authenticate } from '../middlewares/aiAuth.js';

// const router = express.Router();

// router.post('/chats', authenticate, createChat);
// router.get('/chats/:chat_id', authenticate, getChatHistory);
// router.post('/chats/:chat_id/messages', authenticate, sendMessage);
// router.put('/chats/:chat_id/context', authenticate, updateChatContext);

// export default router;

// routes/chatRoutes.js
import express from 'express';
import { 
  createChat, 
  getChatHistory, 
  sendMessage, 
  updateChatContext 
} from '../controllers/chatController.controller.js';
import { authenticate } from '../middlewares/aiAuth.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

router.post('/chats', authenticate, createChat);
router.get('/chats/:chat_id', authenticate, getChatHistory);

// Support multiple file uploads (max 5 files)
router.post(
  '/chats/:chat_id/messages', 
  authenticate, 
  upload.array('attachments', 5), 
  sendMessage
);

router.put('/chats/:chat_id/context', authenticate, updateChatContext);

export default router;