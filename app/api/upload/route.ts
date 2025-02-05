import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const campaignName = formData.get("campaignName") as string
  const adSize = formData.get("adSize") as string
  const files = formData.getAll("files") as File[]

  if (!campaignName || !adSize || files.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const blob = await put(file.name, file, { access: "public" })
        return blob.url
      }),
    )

    const ad = await prisma.ad.create({
      data: {
        campaignName,
        adSize,
        files: uploadedFiles,
      },
    })

    return NextResponse.json({ success: true, ad })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

