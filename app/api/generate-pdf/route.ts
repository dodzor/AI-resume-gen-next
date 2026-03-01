import { NextRequest, NextResponse } from 'next/server';
import { generatePDFWithPuppeteer } from '../../../lib/pdfServerUtils';
import { TemplateId } from '../../../lib/templates';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';

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
    const { content, templateId, fileName } = body;

    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { error: 'Missing required field: content' },
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

    // 4. Increment usage AFTER successful operation
    await incrementUsageAfterAction(userId, 'export');

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
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
