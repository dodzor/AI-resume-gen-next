import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing file. Please upload a PDF resume.' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF file.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum supported size is 5MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await pdfParse(buffer);
    const extractedText = (result.text ?? '').replace(/\s+/g, ' ').trim();

    if (!extractedText) {
      return NextResponse.json(
        {
          error:
            'No selectable text found in this PDF. Please upload a text-based PDF (scanned PDFs are not supported in v1).'
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      fileName: file.name,
      pageCount: result.numpages ?? undefined,
      text: extractedText
    });
  } catch (error) {
    console.error('PDF parsing failed:', error);
    return NextResponse.json(
      { error: 'Failed to parse PDF. Please try another file.' },
      { status: 500 }
    );
  }
}
