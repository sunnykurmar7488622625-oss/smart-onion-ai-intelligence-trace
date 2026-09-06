import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const TrendChart = ({ data = [], height = 260, xKey = "label", testId }) => (
  <div style={{ height }} data-testid={testId}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#EEECE8" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: "#78716C" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#78716C" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E7E5E4", fontSize: 13 }} formatter={(v) => `${v}%`} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        <Line type="monotone" dataKey="grade_a" name="Grade A %" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="defective" name="Defect %" stroke="#DC2626" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);
