import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const ads = await prisma.ad.findMany()
    return NextResponse.json({ ads })
  } catch (error) {
    console.error("Failed to fetch ads:", error)
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 })
  }
}

