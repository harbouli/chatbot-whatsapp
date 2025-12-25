import { Router } from 'express';
import { getWhatsAppService } from '../services/whatsapp.service';

const router = Router();

/**
 * GET /whatsapp/status
 * Get current WhatsApp connection status
 */
router.get('/status', (req, res) => {
  const whatsappService = getWhatsAppService();
  const status = whatsappService.getStatus();
  res.json(status);
});

/**
 * POST /whatsapp/connect
 * Initialize WhatsApp connection (starts QR code generation)
 */
router.post('/connect', async (req, res) => {
  try {
    const whatsappService = getWhatsAppService();
    await whatsappService.connect();
    res.json({ success: true, message: 'WhatsApp connection initiated' });
  } catch (error: any) {
    console.error('WhatsApp connect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /whatsapp/qrcode
 * Get current QR code as base64 data URL
 */
router.get('/qrcode', (req, res) => {
  const whatsappService = getWhatsAppService();
  const status = whatsappService.getStatus();
  
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
 * Body: { phoneNumber: "212XXXXXXXXX" } (E.164 format without +)
 */
router.post('/pair', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const whatsappService = getWhatsAppService();
    const pairingCode = await whatsappService.requestPairingCode(phoneNumber);
    
    res.json({ 
      success: true, 
      pairingCode,
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
 */
router.post('/disconnect', async (req, res) => {
  try {
    const whatsappService = getWhatsAppService();
    await whatsappService.disconnect();
    res.json({ success: true, message: 'Disconnected from WhatsApp' });
  } catch (error: any) {
    console.error('WhatsApp disconnect error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
