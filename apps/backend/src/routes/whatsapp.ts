import { Router } from 'express';
import { getWhatsAppService } from '../services/whatsapp.service';

const router = Router();

/**
 * GET /whatsapp/sessions
 * Get all active sessions
 */
router.get('/sessions', (req, res) => {
  const whatsappService = getWhatsAppService();
  const sessions = whatsappService.getAllSessions();
  res.json(sessions);
});

/**
 * GET /whatsapp/status
 * Get current WhatsApp connection status for a session
 * Query: ?sessionId=default
 */
router.get('/status', (req, res) => {
  const sessionId = (req.query.sessionId as string) || 'default';
  const whatsappService = getWhatsAppService();
  const status = whatsappService.getStatus(sessionId);
  res.json(status);
});

/**
 * POST /whatsapp/connect
 * Initialize WhatsApp connection (starts QR code generation)
 * Body: { sessionId: "optional-id" }
 */
router.post('/connect', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const whatsappService = getWhatsAppService();
    await whatsappService.connect(sessionId || 'default');
    res.json({ success: true, message: 'WhatsApp connection initiated', sessionId: sessionId || 'default' });
  } catch (error: any) {
    console.error('WhatsApp connect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /whatsapp/qrcode
 * Get current QR code as base64 data URL
 * Query: ?sessionId=default
 */
router.get('/qrcode', (req, res) => {
  const sessionId = (req.query.sessionId as string) || 'default';
  const whatsappService = getWhatsAppService();
  const status = whatsappService.getStatus(sessionId);
  
  if (status.qrCode) {
    res.json({ qrCode: status.qrCode });
  } else if (status.status === 'connected') {
    res.json({ message: 'Already connected', phoneNumber: status.phoneNumber });
  } else {
    res.status(404).json({ message: 'No QR code available. Call /whatsapp/connect first.' });
  }
});

/**
 * POST /whatsapp/pair
 * Request pairing code for phone number login
 * Body: { phoneNumber: "212XXXXXXXXX", sessionId: "optional-id" } (E.164 format without +)
 */
router.post('/pair', async (req, res) => {
  try {
    const { phoneNumber, sessionId } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const whatsappService = getWhatsAppService();
    const pairingCode = await whatsappService.requestPairingCode(sessionId || 'default', phoneNumber);
    
    res.json({ 
      success: true, 
      pairingCode,
      sessionId: sessionId || 'default',
      message: 'Enter this code in WhatsApp on your phone: Settings > Linked Devices > Link a Device'
    });
  } catch (error: any) {
    console.error('WhatsApp pairing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /whatsapp/disconnect
 * Disconnect and logout from WhatsApp
 * Body: { sessionId: "optional-id" }
 */
router.post('/disconnect', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const whatsappService = getWhatsAppService();
    await whatsappService.disconnect(sessionId || 'default');
    res.json({ success: true, message: 'Disconnected from WhatsApp' });
  } catch (error: any) {
    console.error('WhatsApp disconnect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
