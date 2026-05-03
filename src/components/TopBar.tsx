export default function TopBar(props: { lang: string, setLang: (lang: string) => void }) {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "60px",
      background: "#f0f0f0",
      display: "flex",
      "align-items": "center",
      padding: "0 20px",
      "box-sizing": "border-box",
      "z-index": 1000
    }}>
      <select
        value={props.lang}
        onChange={(e) => props.setLang(e.target.value)}
        style={{
          padding: "4px 8px",
          "border-radius": "4px",
          border: "1px solid #ccc"
        }}
      >
        <option value="en">EN</option>
        <option value="id">ID</option>
      </select>
    </div>
  );
}
