import { Router, Request, Response } from 'express';
import { Certificate, generateCertificateHash } from '../models/Certificate.js';
import { User } from '../models/User.js';
import { Event } from '../models/Event.js';
import { authenticate, requireAnyAdmin, AuthenticatedRequest } from '../middleware/auth.js';

export const certificateRouter = Router();

// PUBLIC: GET /api/certificates/verify/:certificateId
// Cryptographically verifies certificate validity and authenticity without authentication
certificateRouter.get('/verify/:certificateId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { certificateId } = req.params;
    const cert = await Certificate.findOne({ certificateId });

    if (!cert) {
      res.status(404).json({
        valid: false,
        error: 'Certificate record not found or invalid certificate ID'
      });
      return;
    }

    const expectedHash = generateCertificateHash(
      cert.certificateId,
      cert.username,
      cert.rank,
      cert.totalScore
    );

    const isTamperFree = cert.verificationHash === expectedHash;

    res.json({
      valid: isTamperFree,
      certificateId: cert.certificateId,
      participantName: cert.participantName,
      username: cert.username,
      eventTitle: cert.eventTitle,
      collegeName: cert.collegeName,
      rank: cert.rank,
      totalScore: cert.totalScore,
      issueDate: cert.issueDate,
      verificationHash: cert.verificationHash,
      templateUrl: cert.templateUrl || '',
      useCustomTemplate: !!cert.useCustomTemplate,
      textColorMode: cert.textColorMode || 'auto',
      cryptographicStatus: isTamperFree ? 'GENUINE_VERIFIED_SHA256' : 'HASH_MISMATCH_TAMPERED'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Verification error', details: err.message });
  }
});

// ADMIN ONLY: POST /api/certificates/issue
certificateRouter.post('/issue', authenticate, requireAnyAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      userId,
      rank,
      totalScore,
      eventTitle,
      collegeName,
      templateUrl: bodyTemplateUrl,
      useCustomTemplate: bodyUseCustomTemplate,
      textColorMode: bodyTextColorMode,
      eventId: bodyEventId
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (req.user?.collegeId && user.collegeId && user.collegeId.toString() !== req.user.collegeId.toString()) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const eventId = bodyEventId || user.eventId || req.user?.eventId;
    let effectiveTemplateUrl = bodyTemplateUrl;
    let effectiveUseCustom = bodyUseCustomTemplate;
    let effectiveTextColorMode = bodyTextColorMode;

    if (eventId) {
      const event = await Event.findById(eventId);
      if (event) {
        if (req.user?.collegeId && event.collegeId.toString() !== req.user.collegeId.toString()) {
          res.status(404).json({ error: 'Event not found' });
          return;
        }
        if (event.certificateConfig) {
          if (effectiveUseCustom === undefined) {
            effectiveUseCustom = !event.certificateConfig.useDefaultTemplate;
          }
          if (!effectiveTemplateUrl) {
            effectiveTemplateUrl = event.certificateConfig.customTemplateUrl;
          }
          if (!effectiveTextColorMode) {
            effectiveTextColorMode = event.certificateConfig.textColorMode;
          }
        }
      }
    }

    const certId = 'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    const hash = generateCertificateHash(certId, user.username, rank, totalScore);

    const cert = await Certificate.create({
      certificateId: certId,
      userId: user._id,
      participantName: user.name || user.username,
      username: user.username,
      eventId: eventId || undefined,
      eventTitle: eventTitle || 'DebugArena 2026 Competitive Debugging OA',
      collegeName: collegeName || 'Institute of Engineering & Technology',
      rank,
      totalScore,
      issueDate: new Date(),
      verificationHash: hash,
      templateUrl: effectiveTemplateUrl || '',
      useCustomTemplate: !!effectiveUseCustom,
      textColorMode: effectiveTextColorMode || 'auto'
    });

    res.json({ success: true, certificate: cert });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to issue certificate', details: err.message });
  }
});

// GET /api/certificates/user/:userId
certificateRouter.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const cert = await Certificate.findOne({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, certificate: cert || null });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user certificate', details: err.message });
  }
});
