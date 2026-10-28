import { NextRequest, NextResponse } from 'next/server';
import { generatePDFWithPuppeteer } from '../../../lib/pdfServerUtils';
import { TemplateId } from '../../../lib/templates';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, getConvexClient, incrementUsageAfterAction } from '@/lib/api-usage';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await requireAuth();
    if ('error' in authResult) {
      return authResult.error;
    }
    const { userId } = authResult;

    // 2. Check usage limit BEFORE processing (export is Pro-only feature)
    const usageCheck = await checkUsageLimit(userId, 'export');
    if (!usageCheck.allowed) {
      return usageCheck.error;
    }

    const body = await request.json();
    const { content, templateId, fileName, resumeId, job } = body;

    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: 'Missing required field: content' },
        { status: 400 }
      );
    }

    const convex = getConvexClient();
    const jobText = typeof job === 'string' ? job : '';
    const jobCheck = await convex.query(api.resumes.freePdfJobAllowed, {
      userId,
      resumeId: typeof resumeId === 'string' ? resumeId as Id<'resumes'> : undefined,
      job: jobText,
    });
    if (!jobCheck.allowed) {
      if (jobCheck.upgradeRequired) {
        return NextResponse.json(
          {
            error: 'Usage limit exceeded',
            code: 'PDF_JOB_LOCKED',
            message: jobCheck.reason,
            details: {
              upgradeRequired: true,
              action: 'create_resume',
              exportedJob: jobCheck.exportedJob,
            },
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'PDF blocked', message: jobCheck.reason || 'This PDF cannot be downloaded.' },
        { status: 400 }
      );
    }

    // Validate templateId if provided
    const validTemplateIds: TemplateId[] = ['professional-blue', 'modern-minimal', 'creative-designer', 'developer'];
    const selectedTemplate = templateId && validTemplateIds.includes(templateId) 
      ? templateId 
      : 'professional-blue';

    console.log('Generating PDF with Puppeteer...', { 
      templateId: selectedTemplate,
      contentLength: content.length 
    });

    // Generate PDF using Puppeteer
    const pdfBuffer = await generatePDFWithPuppeteer({
      content,
      templateId: selectedTemplate,
      fileName: fileName || 'Resume.pdf',
    });

    if (typeof resumeId === 'string') {
      try {
        await convex.mutation(api.resumes.recordExportedJob, {
          userId,
          resumeId: resumeId as Id<'resumes'>,
          job: jobText,
        });
      } catch (recordError) {
        console.error('Failed to record exported job:', recordError);
      }
    }

    // 4. Increment usage AFTER successful operation
    await incrementUsageAfterAction(userId, 'export', convex);

    // Return PDF as response
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer);
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName || 'Resume.pdf'}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    
    return NextResponse.json(
      { 
        error: 'PDF Generation Failed',
        message: error.message || 'An unexpected error occurred while generating the PDF' 
      },
      { status: 500 }
    );
  }
}
