"use client";

import { useState, useEffect } from "react";

interface FileList {
  zhFiles: string[];
  jaFiles: string[];
  bothFiles: string[];
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState("both");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [fileList, setFileList] = useState<FileList>({ zhFiles: [], jaFiles: [], bothFiles: [] });

  const login = () => {
    if (password.trim()) {
      setAuthed(true);
      loadFiles(password);
    }
  };

  const loadFiles = async (pw: string) => {
    const res = await fetch(`/api/upload?password=${pw}`);
    const data = await res.json();
    if (!data.error) setFileList(data);
  };

  const upload = async () => {
    if (!file) return setMessage("请选择文件");
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("password", password);
    formData.append("file", file);
    formData.append("lang", lang);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    setMessage(data.message || data.error);
    setUploading(false);
    if (data.success) {
      setFile(null);
      loadFiles(password);
    }
  };

  const deleteFile = async (filename: string, fileLang: string) => {
    if (!confirm(`确认删除「${filename}」？`)) return;
    const res = await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, filename, lang: fileLang }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage("删除成功");
      loadFiles(password);
    }
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "white", borderRadius: 16, padding: "40px 32px", width: 340, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, background: "#2563eb", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 24 }}>🔐</div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "#111" }}>后台管理</h1>
            <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>NJF REGI 知识库管理</p>
          </div>
          <input
            type="password"
            placeholder="请输入管理密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e0e0e0", fontSize: 14, outline: "none", marginBottom: 12 }}
          />
          <button
            onClick={login}
            style={{ width: "100%", padding: "11px", background: "#2563eb", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            登录
          </button>
        </div>
      </div>
    );
  }

  const allFiles = [
    ...fileList.bothFiles.map(f => ({ name: f, lang: "both" })),
    ...fileList.zhFiles.map(f => ({ name: f, lang: "zh" })),
    ...fileList.jaFiles.map(f => ({ name: f, lang: "ja" })),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: "24px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, background: "#2563eb", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📚</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#111" }}>知识库管理</h1>
            <p style={{ fontSize: 12, color: "#999" }}>NJF REGI AIサポート</p>
          </div>
        </div>

        {/* 上传区域 */}
        <div style={{ background: "white", borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 16 }}>上传说明书</h2>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>适用语言</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ v: "both", l: "中日文通用" }, { v: "zh", l: "仅中文" }, { v: "ja", l: "仅日文" }].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setLang(opt.v)}
                  style={{
                    padding: "7px 14px", borderRadius: 20, fontSize: 13, border: "1.5px solid",
                    borderColor: lang === opt.v ? "#2563eb" : "#e0e0e0",
                    background: lang === opt.v ? "#eff6ff" : "white",
                    color: lang === opt.v ? "#2563eb" : "#666",
                    cursor: "pointer", fontWeight: lang === opt.v ? 600 : 400,
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div
            onClick={() => document.getElementById("fileInput")?.click()}
            style={{
              border: "2px dashed #d0d0d0", borderRadius: 12, padding: "28px 20px",
              textAlign: "center", cursor: "pointer", marginBottom: 14,
              background: file ? "#f0f9ff" : "#fafafa",
              borderColor: file ? "#2563eb" : "#d0d0d0",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{file ? "📄" : "📁"}</div>
            <p style={{ fontSize: 14, color: file ? "#2563eb" : "#999" }}>
              {file ? file.name : "点击选择 PDF 或 TXT 文件"}
            </p>
            {file && <p style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</p>}
            <input
              id="fileInput"
              type="file"
              accept=".pdf,.txt"
              style={{ display: "none" }}
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {message && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13,
              background: message.includes("成功") ? "#f0fdf4" : "#fef2f2",
              color: message.includes("成功") ? "#15803d" : "#dc2626",
              border: `1px solid ${message.includes("成功") ? "#bbf7d0" : "#fecaca"}`,
            }}>
              {message}
            </div>
          )}

          <button
            onClick={upload}
            disabled={uploading || !file}
            style={{
              width: "100%", padding: "12px", background: uploading || !file ? "#e0e0e0" : "#2563eb",
              color: uploading || !file ? "#aaa" : "white", border: "none", borderRadius: 10,
              fontSize: 15, fontWeight: 600, cursor: uploading || !file ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "上传中..." : "上传到知识库"}
          </button>
        </div>

        {/* 文件列表 */}
        <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 16 }}>
            已上传文件 ({allFiles.length})
          </h2>

          {allFiles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#bbb", fontSize: 14 }}>
              暂无文件，请上传说明书
            </div>
          ) : (
            allFiles.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 0", borderBottom: i < allFiles.length - 1 ? "1px solid #f0f0f0" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  <div>
                    <p style={{ fontSize: 14, color: "#111", fontWeight: 500 }}>{f.name}</p>
                    <p style={{ fontSize: 11, color: "#aaa" }}>
                      {f.lang === "both" ? "中日文通用" : f.lang === "zh" ? "仅中文" : "仅日文"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteFile(f.name, f.lang)}
                  style={{ padding: "5px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
                >
                  删除
                </button>
              </div>
            ))
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#ccc", marginTop: 16 }}>
          访问地址：your-domain.vercel.app/admin
        </p>
      </div>
    </div>
  );
}
