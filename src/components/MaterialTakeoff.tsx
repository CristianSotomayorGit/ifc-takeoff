import React from "react";
import {
  Box,
  Typography,
  Button,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material";

export interface TakeoffRecord {
  material: string;
  quantity: number;
  unit: string;
  type: string;
}

interface MaterialTakeoffProps {
  data: TakeoffRecord[];
  computing: boolean;
  error: string | null;
}

const MaterialTakeoff: React.FC<MaterialTakeoffProps> = ({
  data,
  computing,
  error
}) => {
  if (error) {
    return (
      <Typography color="error" sx={{ mb: 1 }}>
        {error}
      </Typography>
    );
  }

  if (computing || !data.length) {
    return null;
  }

  const downloadCsv = () => {
    let csv = "Material,Quantity,Unit,Type\n";
    data.forEach((r) => {
      csv += `${r.material},${r.quantity},${r.unit},${r.type}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "takeoff.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button variant="contained" onClick={downloadCsv} sx={{ mb: 1, width: "100%" }}>
        Download CSV
      </Button>
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {["Material", "Quantity", "Unit", "Type"].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((r, i) => (
              <TableRow key={i} hover>
                <TableCell sx={{ wordBreak: "break-word" }}>{r.material}</TableCell>
                <TableCell align="right">{r.quantity}</TableCell>
                <TableCell>{r.unit}</TableCell>
                <TableCell>{r.type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default MaterialTakeoff;