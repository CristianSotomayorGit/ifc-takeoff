import React, { useRef, useState, useMemo } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  FormControlLabel,
  Switch,
  Button,
  CircularProgress,
  Typography,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import { useEngine } from "./hooks/useEngine";
import { useTakeoff } from "./hooks/useTakeoff";
import MaterialTakeoff from "./components/MaterialTakeoff";

const steps = ["Upload IFC", "Load Model", "Compute Takeoff", "Done"];

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modelProgress, setModelProgress] = useState(0);
  const loadIfc = useEngine(containerRef, setModelProgress);

  const { data, loading: computing, error: takeoffError, startTakeoff } =
    useTakeoff();

  const [hasUploaded, setHasUploaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  const [mode, setMode] = useState<"light" | "dark">("dark");
  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode },
      }),
    [mode]
  );
  const toggleTheme = () =>
    setMode((prev) => (prev === "light" ? "dark" : "light"));

  const inputRef = useRef<HTMLInputElement>(null);
  const handleUploadClick = () => inputRef.current?.click();
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHasUploaded(true);
    setModelLoading(true);
    const url = URL.createObjectURL(file);
    loadIfc(url).finally(() => {
      URL.revokeObjectURL(url);
      setModelLoading(false);
      startTakeoff(file);
    });
  };

  let activeStep = 0;
  if (hasUploaded && modelLoading) activeStep = 1;
  else if (computing) activeStep = 2;
  else if (data.length) activeStep = 3;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Theme toggle top-left */}
      <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 1300 }}>
        <FormControlLabel
          control={<Switch checked={mode === "dark"} onChange={toggleTheme} />}
          label="Dark Mode"
        />
      </Box>

      {/* Stepper bottom-left */}
      <Box
        sx={{
          position: "absolute",
          bottom: 16,
          left: 16,
          width: 600,
          zIndex: 1300,
        }}
      >
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* 3D canvas */}
      <Box
        ref={containerRef}
        sx={{
          width: "100vw",
          height: "100vh",
          position: "relative",
          bgcolor: "background.default",
        }}
      />

      {/* Upload button center */}
      {!hasUploaded && !modelLoading && !computing && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1300,
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".ifc"
            hidden
            onChange={handleFileSelect}
          />
          <Button
            variant="contained"
            size="large"
            startIcon={<UploadIcon fontSize="large" />}
            sx={{ px: 4, py: 2 }}
            onClick={handleUploadClick}
          >
            Upload IFC
          </Button>
        </Box>
      )}

      {/* Model loading progress */}
      {modelLoading && (
        <Box
          sx={{
            position: "absolute",
            top: "calc(50% + 80px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 300,
            zIndex: 1300,
          }}
        >
          <LinearProgress variant="determinate" value={modelProgress} />
          <Typography align="center" sx={{ mt: 1 }}>
            Loading Model… {Math.round(modelProgress)}%
          </Typography>
        </Box>
      )}

      {/* Computing takeoff */}
      {computing && (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1300,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CircularProgress size={80} thickness={4} />
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Computing Takeoff…
          </Typography>
        </Box>
      )}

      {/* Takeoff panel top-right */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 360,
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          p: 1,
          borderRadius: 1,
          boxShadow: 3,
          zIndex: 1300,
        }}
      >
        <MaterialTakeoff
          data={data}
          computing={computing}
          error={takeoffError}
        />
      </Box>
    </ThemeProvider>
  );
};

export default App;
