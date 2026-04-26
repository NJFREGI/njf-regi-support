{/* 文件列表 */}
<div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
  <div
    onClick={() => setShowFiles(!showFiles)}
    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
  >
    <h2 style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>
      已上传文件 ({allFiles.length})
    </h2>
    <span style={{ fontSize: 18, color: "#999", transform: showFiles ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
      ▾
    </span>
  </div>

  {showFiles && (
    <div style={{ marginTop: 16 }}>
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
              style={{ padding: "5px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #feca
