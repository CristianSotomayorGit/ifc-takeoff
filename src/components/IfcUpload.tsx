import React, { useRef } from "react";
import { Button, Box } from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";

interface IfcUploadProps {
  onFile: (file: File) => void;
}

export const IfcUpload: React.FC<IfcUploadProps> = ({ onFile }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 16,
        left: 16,
        display: "flex",
        alignItems: "center",
        bgcolor: "background.paper",
        p: 1,
        borderRadius: 1,
                  boxShadow: 3,

      }}
    >


      <input
        ref={inputRef}
        type="file"
        accept=".ifc"
        hidden
        onChange={handleChange}
      />
      <Button
        variant="contained"
        color="primary"
        startIcon={<UploadIcon />}
        onClick={handleClick}
      >
        Upload IFC
      </Button>
    </Box>
  );
};
