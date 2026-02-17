import { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>TESTING REACT</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
