import { NextRequest, NextResponse } from "next/server";
import { getAnalysis, deleteAnalysis } from "@/lib/database";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const analysis = getAnalysis(id);

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load analysis", message: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteAnalysis(id);

    if (!deleted) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete analysis", message: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
