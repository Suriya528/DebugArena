import { Router, Request, Response } from 'express';
import { Certificate, generateCertificateHash } from '../models/Certificate.js';
import { User } from '../models/User.js';
import { Event } from '../models/Event.js';
import { authenticate, requireAnyAdmin, AuthenticatedRequest } from '../middleware/auth.js';

import { College } from '../models/College.js';

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
      primaryColor: cert.primaryColor || '#b8860b',
      secondaryColor: cert.secondaryColor || '#d97706',
      signatoryName: cert.signatoryName || 'Dr. A. Sakthivel',
      signatoryTitle: cert.signatoryTitle || 'Chairman, Examination & Technical Board',
      identificationNo: cert.identificationNo || `UP00F20-${cert.certificateId.slice(-6)}`,
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
      eventId: bodyEventId,
      primaryColor: bodyPrimaryColor,
      secondaryColor: bodySecondaryColor,
      signatoryName: bodySignatoryName,
      signatoryTitle: bodySignatoryTitle,
      identificationNo: bodyIdentificationNo
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
    let effectiveSignatoryName = bodySignatoryName;
    let effectiveSignatoryTitle = bodySignatoryTitle;

    let event: any = null;
    if (eventId) {
      event = await Event.findById(eventId);
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
        if (!effectiveSignatoryName && event.branding?.signatoryName) {
          effectiveSignatoryName = event.branding.signatoryName;
        }
        if (!effectiveSignatoryTitle && event.branding?.signatoryTitle) {
          effectiveSignatoryTitle = event.branding.signatoryTitle;
        }
      }
    }

    const effectiveCollegeId = user.collegeId || req.user?.collegeId || event?.collegeId;
    let effectiveCollegeName = collegeName;
    let effectivePrimaryColor = bodyPrimaryColor;
    let effectiveSecondaryColor = bodySecondaryColor;

    if (effectiveCollegeId) {
      const col = await College.findById(effectiveCollegeId);
      if (col) {
        if (!effectiveCollegeName) effectiveCollegeName = col.name;
        if (!effectivePrimaryColor) effectivePrimaryColor = col.primaryColor;
        if (!effectiveSecondaryColor) effectiveSecondaryColor = col.secondaryColor;
      }
    }

    const certId = 'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    const hash = generateCertificateHash(certId, user.username, rank, totalScore);
    const systemId = bodyIdentificationNo || `UP00F20-${Math.floor(100000 + Math.random() * 900000)}`;

    const cert = await Certificate.create({
      certificateId: certId,
      userId: user._id,
      participantName: user.name || user.username,
      username: user.username,
      eventId: eventId || undefined,
      eventTitle: eventTitle || (event ? event.name : 'DebugArena Competitive Debugging OA'),
      collegeName: effectiveCollegeName || 'Institute of Engineering & Technology',
      rank,
      totalScore,
      issueDate: new Date(),
      verificationHash: hash,
      templateUrl: effectiveTemplateUrl || '',
      useCustomTemplate: !!effectiveUseCustom,
      textColorMode: effectiveTextColorMode || 'auto',
      primaryColor: effectivePrimaryColor || '#b8860b',
      secondaryColor: effectiveSecondaryColor || '#d97706',
      signatoryName: effectiveSignatoryName || 'Dr. A. Sakthivel',
      signatoryTitle: effectiveSignatoryTitle || 'Chairman, Examination & Technical Board',
      identificationNo: systemId
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
