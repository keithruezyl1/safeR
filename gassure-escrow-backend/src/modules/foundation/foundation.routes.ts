import { Router } from 'express';
import {
  confirmEscrowHandler,
  fundAccountHandler,
  fundEscrowHandler,
  getLogsHandler,
  getStateHandler,
  resetHandler,
  clearLogsHandler,
  toggleBlockchainHandler,
} from './foundation.controller';

const router = Router();

router.get('/state', getStateHandler);
router.post('/blockchain/toggle', toggleBlockchainHandler);
router.post('/escrow/fund', fundEscrowHandler);
router.post('/escrow/confirm', confirmEscrowHandler);
router.post('/reset', resetHandler);
router.post('/fund-account', fundAccountHandler);
router.get('/logs', getLogsHandler);
router.delete('/logs', clearLogsHandler);

export default router;

