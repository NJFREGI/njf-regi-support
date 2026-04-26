import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "njfregi2024";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const password = formData.get("password") as string;
    const file = formData.get("file") as File;
    const lang = formData.get("lang") as string || "both";

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let text = "";

    if (file.name.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else if (file.name.endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      text = data.text;
    } else {
      return NextResponse.json({ error: "只支持 PDF 和 TXT 文件" }, { status: 400 });
    }

    text = text.replace(/\s+/g, " ").trim();

    if (text.length < 10) {
      return NextResponse.json({ error: "文件内容为空或无法解析" }, { status: 400 });
    }

    const key = `manual:${lang}:${file.name}`;
    await redis.set(key, text);

    const listKey = `manual:files:${lang}`;
    const existing = await redis.get<string[]>(listKey) || [];
    if (!existing.includes(file.name)) {
      existing.push(file.name);
      await redis.set(listKey, existing);
    }

    return NextResponse.json({
      success: true,
      message: `上传成功！文件「${file.name}」已加入知识库`,
      chars: text.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "上传失败，请重试" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { password, filename, lang } = await req.json();

    if (password !== (process.env.ADMIN_PASSWORD || "njfregi2024")) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    await redis.del(`manual:${lang}:${filename}`);

    const listKey = `manual:files:${lang}`;
    const existing = await redis.get<string[]>(listKey) || [];
    const updated = existing.filter((f: string) => f !== filename);
    await redis.set(listKey, updated);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password");

  if (password !== (process.env.ADMIN_PASSWORD || "njfregi2024")) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const zhFiles = await redis.get<string[]>("manual:files:zh") || [];
  const jaFiles = await redis.get<string[]>("manual:files:ja") || [];
  const bothFiles = await redis.get<string[]>("manual:files:both") || [];

  return NextResponse.json({ zhFiles, jaFiles, bothFiles });
}
