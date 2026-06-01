/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Clock, 
  BookOpen, 
  Users, 
  FileText, 
  AlertTriangle, 
  Info,
  ChevronRight,
  UserCheck,
  PenTool,
  Book,
  Briefcase,
  ShieldCheck,
  GraduationCap,
  CheckCircle2,
  Circle,
  Lightbulb,
  Download,
  User,
  UserPlus,
  ShieldAlert,
  Users2,
  Library,
  Globe,
  Map,
  Utensils,
  ClipboardCheck,
  GraduationCap as GraduationIcon,
  Trash2,
  PlusCircle,
  FileSpreadsheet,
  Camera,
  Printer,
  MousePointer2,
  CheckCircle,
  XCircle,
  Scan,
  RefreshCcw,
  Save,
  Maximize2,
  Minimize2,
  Sparkles,
  Brain,
  Upload
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Webcam from 'react-webcam';

// --- Types ---
interface WorkloadData {
  totalHours: number;
  lectivas: number;
  noLectivas: number;
  pea: number;
  comunidad: number;
}

interface TimeDisplay {
  hours: number;
  minutes: number;
  formatted: string;
}

interface CommunityActivity {
  id: string;
  name: string;
  icon: React.ReactNode;
  fixedTime?: number; // in hours
  isActive: boolean;
  customHours?: number;
  customMinutes?: number;
}

// --- Utils ---
const decimalToTime = (decimal: number): TimeDisplay => {
  const hours = Math.floor(Math.max(0, decimal));
  const minutes = Math.round((Math.max(0, decimal) - hours) * 60);
  return {
    hours,
    minutes,
    formatted: `${hours}h ${minutes.toString().padStart(2, '0')}m`
  };
};

interface StudentSimceData {
  id: string;
  name: string;
  scores: {
    [appIndex: number]: {
      [catIndex: number]: number;
    };
  };
}

interface SimceCategory {
  name: string;
  questions: string;
  total: number;
}

interface SimceAppConfig {
  name: string;
  categories: SimceCategory[];
}

const SIMCE_CONFIG: SimceAppConfig[] = [
  {
    name: '1° Aplicación',
    categories: [
      { name: 'Conocer', questions: '1-2-8-9-12-13-17-19-23-27-29', total: 11 },
      { name: 'Comprender', questions: '3-4-5-16-20-21-22-28-30', total: 9 },
      { name: 'Analizar', questions: '11-14-15', total: 3 },
      { name: 'Aplicar', questions: '10-24-25', total: 3 },
      { name: 'Inferir', questions: '6-7-18', total: 3 },
      { name: 'Evaluar', questions: '26', total: 1 },
    ]
  },
  {
    name: '2° Aplicación',
    categories: [
      { name: 'Conocer', questions: '1-2-3-8-9-10-15-16-21-22-25-26-29', total: 13 },
      { name: 'Comprender', questions: '4-5-6-7-11-17-18-19-20-28', total: 10 },
      { name: 'Analizar', questions: '14-23-27', total: 3 },
      { name: 'Aplicar', questions: '12-13-24-30', total: 4 },
    ]
  },
  {
    name: '3° Aplicación',
    categories: [
      { name: 'Conocer', questions: '1-2-5-7-8-10-11-12-14-15-16-17-19-23-24-26-27-34-35', total: 19 },
      { name: 'Comprender', questions: '3-4-20-21-22-30-33', total: 7 },
      { name: 'Analizar', questions: '13-28', total: 2 },
      { name: 'Aplicar', questions: '9-25', total: 2 },
      { name: 'Inferir', questions: '6-18-29-32', total: 4 },
      { name: 'Evaluar', questions: '31', total: 1 },
    ]
  },
  {
    name: '4° Aplicación',
    categories: [
      { name: 'Conocer', questions: '', total: 0 },
      { name: 'Comprender', questions: '', total: 0 },
      { name: 'Analizar', questions: '', total: 0 },
      { name: 'Aplicar', questions: '', total: 0 },
      { name: 'Inferir', questions: '', total: 0 },
      { name: 'Evaluar', questions: '', total: 0 },
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'jornada' | 'simce' | 'scanner'>('jornada');
  const [contractHours, setContractHours] = useState<number>(44);
  const [teacherName, setTeacherName] = useState<string>('');

  // Scanner State
  const [scannerConfig, setScannerConfig] = useState({
    activeAppIndex: 0,
    questionCount: 30,
    answerKey: {} as { [q: number]: string },
    selectedStudentId: ''
  });
  const [scanResult, setScanResult] = useState<{ [q: number]: string } | null>(null);
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'scanning' | 'correcting' | 'finished'>('idle');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [corners, setCorners] = useState<{
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    bl: { x: number; y: number };
    br: { x: number; y: number };
  }>({
    tl: { x: 20, y: 20 },
    tr: { x: 80, y: 20 },
    bl: { x: 20, y: 80 },
    br: { x: 80, y: 80 }
  });
  const [activeDragCorner, setActiveDragCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInfo, setAiInfo] = useState<{ confianza: string; advertencias: string[]; alumno?: string | null; fecha?: string | null } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // SIMCE State
  const [schoolInfo, setSchoolInfo] = useState({
    establishment: 'ESCUELA LAURA ROBLES SILVA',
    course: '8°B',
    dates: ['', '', '', '']
  });
  const [students, setStudents] = useState<StudentSimceData[]>([
    { id: '1', name: 'LURDES CAMILA AVALOS', scores: {} }
  ]);

  const webcamRef = React.useRef<Webcam>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!activeDragCorner || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    setCorners(prev => ({
      ...prev,
      [activeDragCorner]: {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
      }
    }));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const addStudent = () => {
    setStudents(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: '', 
      scores: {} 
    }]);
  };

  const removeStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const updateStudentName = (id: string, name: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const updateStudentScore = (studentId: string, appIdx: number, catIdx: number, score: number) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const newScores = { ...s.scores };
      if (!newScores[appIdx]) newScores[appIdx] = {};
      newScores[appIdx][catIdx] = score;
      return { ...s, scores: newScores };
    }));
  };

  // Community Activities State
  const [activities, setActivities] = useState<CommunityActivity[]>([
    { id: 'apoderados', name: 'Atención Apoderados', icon: <UserCheck className="w-4 h-4" />, fixedTime: 1, isActive: true },
    { id: 'consejo_tecnico', name: 'Consejo Técnico', icon: <Users className="w-4 h-4" />, fixedTime: 1.5, isActive: true },
    { id: 'talleres', name: 'Talleres', icon: <PenTool className="w-4 h-4" />, isActive: true },
    { id: 'libro_digital', name: 'Libro Digital', icon: <Book className="w-4 h-4" />, isActive: true },
    { id: 'reuniones_depto', name: 'Reuniones Departamento', icon: <Briefcase className="w-4 h-4" />, isActive: true },
    { id: 'desarrollo_prof', name: 'Desarrollo Profesional Docente', icon: <Lightbulb className="w-4 h-4" />, isActive: true },
    { id: 'consejo_adm', name: 'Consejo Administrativo', icon: <ShieldCheck className="w-4 h-4" />, fixedTime: 1.5, isActive: false },
    { id: 'ceal', name: 'CEAL', icon: <GraduationCap className="w-4 h-4" />, isActive: false },
    { id: 'refuerzo', name: 'Refuerzo Educativo', icon: <UserPlus className="w-4 h-4" />, isActive: false },
    { id: 'pise', name: 'PISE', icon: <ShieldAlert className="w-4 h-4" />, isActive: false },
    { id: 'cgp', name: 'CGP', icon: <Users2 className="w-4 h-4" />, isActive: false },
    { id: 'cra', name: 'CRA', icon: <Library className="w-4 h-4" />, isActive: false },
    { id: 'enlace', name: 'ENLACE', icon: <Globe className="w-4 h-4" />, isActive: false },
    { id: 'mruta', name: 'M.RUTA', icon: <Map className="w-4 h-4" />, isActive: false },
    { id: 'pae', name: 'PAE', icon: <Utensils className="w-4 h-4" />, isActive: false },
  ]);

  const toggleActivity = (id: string) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const updateActivityTime = (id: string, field: 'customHours' | 'customMinutes', value: number) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const results = useMemo(() => {
    // --- Internal Logic (Updated to 58/42 as requested) ---
    // Note: UI and PDF still display "65/35" as per user requirement.
    
    // 1. Calculate Pedagogical Hours (HA) using 58% of contract
    // 1 HA = 45 min = 0.75 hours
    const ha = Math.round((contractHours * 0.58) / 0.75);
    
    // 2. Convert HA to Chronological Hours (HC)
    const hc = ha * 0.75;
    
    // 3. Calculate Recess (Recreo)
    // Maintaining the ratio from the 2019 table (3h recess for 38 HA)
    const recreo = ha * (3 / 38);
    
    // 4. Calculate Total No Lectivas (Effective for PEA + Community)
    // This will now represent the remaining 42% (approx)
    const noLectivasEfectivas = contractHours - hc - recreo;
    
    const pea = noLectivasEfectivas * 0.5;
    const comunidad = noLectivasEfectivas * 0.5;

    return {
      totalHours: contractHours,
      ha,
      hc,
      recreo,
      noLectivasEfectivas,
      pea,
      comunidad
    };
  }, [contractHours]);

  // Calculate Community Distribution
  const communityDistribution = useMemo(() => {
    const activeActivities = activities.filter(a => a.isActive);
    
    const isManual = (a: CommunityActivity) => 
      a.customHours !== undefined || a.customMinutes !== undefined;

    // Fixed activities are those with fixedTime OR those with custom inputs
    const fixedActivities = activeActivities.filter(a => 
      a.fixedTime !== undefined || isManual(a)
    );
    
    const variableActivities = activeActivities.filter(a => 
      a.fixedTime === undefined && !isManual(a)
    );

    const totalFixedTime = fixedActivities.reduce((sum, a) => {
      if (a.fixedTime !== undefined) return sum + a.fixedTime;
      if (isManual(a)) {
        const h = a.customHours || 0;
        const m = (a.customMinutes || 0) / 60;
        return sum + h + m;
      }
      return sum;
    }, 0);

    const remainingTime = Math.max(0, results.comunidad - totalFixedTime);
    const timePerVariable = variableActivities.length > 0 ? remainingTime / variableActivities.length : 0;

    return activeActivities.map(a => {
      if (a.fixedTime !== undefined) return { ...a, time: a.fixedTime };
      if (isManual(a)) {
        return { ...a, time: (a.customHours || 0) + (a.customMinutes || 0) / 60 };
      }
      return { ...a, time: timePerVariable };
    });
  }, [activities, results.comunidad]);

  const chartData = [
    { name: 'Docencia Aula (HC)', value: results.hc, color: '#3b82f6' },
    { name: 'Recreos', value: results.recreo, color: '#93c5fd' },
    { name: 'Preparación (PEA)', value: results.pea, color: '#10b981' },
    { name: 'Gestión/Comunidad', value: results.comunidad, color: '#f59e0b' },
  ];

  const hcTime = decimalToTime(results.hc);
  const recreoTime = decimalToTime(results.recreo);
  const peaTime = decimalToTime(results.pea);
  const comunidadTime = decimalToTime(results.comunidad);
  const totalNoLectivasTime = decimalToTime(results.noLectivasEfectivas);

  const exportPDF = () => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleDateString();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246); // blue-600
    doc.text('Informe de Jornada Docente', 14, 22);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Docente: ${teacherName || 'No especificado'}`, 14, 32);
    doc.text(`Fecha: ${timestamp}`, 14, 37);
    doc.text(`Contrato: ${contractHours} horas semanales`, 14, 42);
    doc.text('Basado en Tabla 2019 (Proporción 65/35)', 14, 47);

    // Main Table (Summary without specific times as requested)
    autoTable(doc, {
      startY: 55,
      head: [['Descripción', 'Sigla']],
      body: [
        ['Horas Lectivas (Docencia Aula)', 'HC'],
        ['Recreos', 'R'],
        ['Horas No Lectivas (Disponibles)', 'HNL'],
        ['  - Preparación y Evaluación (50% HNL)', 'PEA'],
        ['  - Gestión y Comunidad (50% HNL)', 'GC'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Community Activities Table
    const communityRows = communityDistribution.map(act => [
      act.name,
      act.fixedTime ? 'Fijo' : 'Variable',
      decimalToTime(act.time).formatted
    ]);

    if (communityRows.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Desglose de Gestión y Comunidad', 14, (doc as any).lastAutoTable.finalY + 15);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Actividad', 'Tipo', 'Tiempo']],
        body: communityRows,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] }, // amber-500
      });
    }

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Generado por JornadaDocente.cl', 14, finalY);

    doc.save(`Jornada_Docente_${teacherName.replace(/\s+/g, '_') || 'Informe'}.pdf`);
  };

  const exportAnswerSheet = () => {
    const doc = new jsPDF();
    const qCount = scannerConfig.questionCount;
    
    doc.setFontSize(16);
    doc.text('HOJA DE RESPUESTAS - ENSAYO SIMCE', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Nombre:', 20, 35);
    doc.line(35, 35, 100, 35);
    doc.text('Fecha:', 110, 35);
    doc.line(125, 35, 160, 35);

    // Anchor points (corners)
    const margin = 10;
    const s = 4;
    doc.rect(margin, margin, s, s, 'F'); // TL
    doc.rect(210 - margin - s, margin, s, s, 'F'); // TR
    doc.rect(margin, 297 - margin - s, s, s, 'F'); // BL
    doc.rect(210 - margin - s, 297 - margin - s, s, s, 'F'); // BR

    // Bubbles
    const startY = 50;
    const colSpacing = 45;
    const rowSpacing = 8;
    const options = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < qCount; i++) {
        const col = Math.floor(i / 20);
        const row = i % 20;
        const x = 20 + (col * colSpacing);
        const y = startY + (row * rowSpacing);

        doc.setFontSize(8);
        doc.text(`${i + 1}.`, x, y + 2);
        
        options.forEach((opt, oIdx) => {
            const bx = x + 8 + (oIdx * 8);
            doc.circle(bx, y, 2.5, 'S');
            doc.setFontSize(6);
            doc.text(opt, bx, y + 1, { align: 'center' });
        });
    }

    doc.save('Hoja_Respuestas_SIMCE.pdf');
  };

  const fillSampleAnswerKey = () => {
    const sampleKey: { [q: number]: string } = {};
    const options = ['A', 'B', 'C', 'D', 'E'];
    for (let i = 1; i <= scannerConfig.questionCount; i++) {
        const idx = (i * 3 + 1) % options.length;
        sampleKey[i] = options[idx];
    }
    setScannerConfig(prev => ({
        ...prev,
        answerKey: sampleKey
    }));
  };

  const loadDemoSheet = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 1000);

    // 2. Paper styling & border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 790, 990);

    // 3. 4 Black Square Corner Markers (positioned at tl, tr, bl, br)
    const markerRadius = 15;
    ctx.fillStyle = '#0f172a';
    
    // Draw TL Square Marker
    ctx.fillRect(160 - markerRadius, 200 - markerRadius, markerRadius * 2, markerRadius * 2);
    // Draw TR Square Marker
    ctx.fillRect(640 - markerRadius, 200 - markerRadius, markerRadius * 2, markerRadius * 2);
    // Draw BL Square Marker
    ctx.fillRect(160 - markerRadius, 800 - markerRadius, markerRadius * 2, markerRadius * 2);
    // Draw BR Square Marker
    ctx.fillRect(640 - markerRadius, 800 - markerRadius, markerRadius * 2, markerRadius * 2);

    // 4. Header Titles & Info
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOJA DE RESPUESTAS - SIMCE DEMO', 400, 70);

    ctx.fillStyle = '#475569';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Estudiante: LURDES CAMILA AVALOS', 400, 105);
    ctx.fillText('Establecimiento: ESCUELA LAURA ROBLES SILVA | Curso: 8°B', 400, 125);

    // Separator line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 145);
    ctx.lineTo(700, 145);
    ctx.stroke();

    // 5. Draw Bubbles and fill them matching a key
    const options = ['A', 'B', 'C', 'D', 'E'];
    ctx.textAlign = 'center';

    for (let i = 0; i < scannerConfig.questionCount; i++) {
        const col = Math.floor(i / 20);
        const row = i % 20;

        const tyBubble = (19 + (row * 3.8)) / 100;
        const cy = 200 + tyBubble * 600;

        // Draw Question Number
        const txNum = ((16 + (col * 22)) + 0.5) / 100;
        const cxNum = 160 + txNum * 480;

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${i + 1}.`, cxNum - 8, cy + 4);

        const filledOptionIdx = (i * 3 + 1) % options.length;

        options.forEach((opt, oIdx) => {
            const txBubble = ((16 + (col * 22)) + 3.5 + (oIdx * 3.2)) / 100;
            const cx = 160 + txBubble * 480;

            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            
            if (oIdx === filledOptionIdx) {
                ctx.fillStyle = '#1e293b'; 
                ctx.fill();
                
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(opt, cx, cy + 3.5);
            } else {
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = '#64748b';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(opt, cx, cy + 3.5);
            }
        });
    }

    const imageSrc = canvas.toDataURL('image/jpeg');

    const mockAnsKey: { [q: number]: string } = {};
    for (let i = 0; i < scannerConfig.questionCount; i++) {
        mockAnsKey[i + 1] = options[(i * 3 + 1) % options.length];
    }

    setScannerConfig(prev => ({
        ...prev,
        answerKey: mockAnsKey
    }));

    setCapturedImage(imageSrc);
    
    setCorners({
        tl: { x: 20, y: 20 },
        tr: { x: 80, y: 20 },
        bl: { x: 20, y: 80 },
        br: { x: 80, y: 80 }
    });

    setScannerStatus('correcting');
  };

  const capturePhoto = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setIsAnalyzing(true);
    setCapturedImage(imageSrc);

    try {
      // Run custom corner finder on captured image to pre-align the handles
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // guarantees we never hang on broken loading
      });

      if (!img.width || !img.height) {
        throw new Error("No se pudo cargar la imagen de la cámara.");
      }

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        setIsAnalyzing(false);
        setScannerStatus('correcting');
        return;
      }
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      
      const findCorner = (startX: number, startY: number, endX: number, endY: number) => {
          let bestX = 0, bestY = 0, maxScore = -999999;
          const width = endX - startX;
          
          // Coarse scan step (e.g. every 5 pixels) for high speed
          const step = Math.max(3, Math.floor(width / 150));
          
          // Capped adaptive sampling offsets to prevent spilling onto outer borders or non-sheet regions
          const R1 = Math.max(6, Math.min(15, Math.floor(img.width * 0.010)));
          const R2 = Math.max(12, Math.min(26, Math.floor(img.width * 0.018)));
          const R_inner = Math.max(2, Math.min(6, Math.floor(img.width * 0.004)));

          for (let y = startY + R2 + 5; y < endY - R2 - 5; y += step) {
              for (let x = startX + R2 + 5; x < endX - R2 - 5; x += step) {
                  const idx = (Math.floor(y) * img.width + Math.floor(x)) * 4;
                  if (idx < 0 || idx >= data.length - 2) continue;
                  const bCenter = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                  
                  // Inspect potentially dark centers (below 140 gray level)
                  if (bCenter < 140) {
                      // Quick check if center is a local minimum
                      let isLocalMin = true;
                      for (let dy = -2; dy <= 2; dy += 2) {
                          for (let dx = -2; dx <= 2; dx += 2) {
                              const nidx = (Math.floor(y + dy) * img.width + Math.floor(x + dx)) * 4;
                              if (nidx >= 0 && nidx < data.length - 2) {
                                  const nb = (data[nidx] + data[nidx+1] + data[nidx+2]) / 3;
                                  if (nb < bCenter) {
                                      isLocalMin = false;
                                      break;
                                  }
                              }
                          }
                          if (!isLocalMin) break;
                      }
                      
                      if (!isLocalMin) continue;

                      let surroundSum1 = 0;
                      let count1 = 0;
                      let surroundSum2 = 0;
                      let count2 = 0;

                      // Sample 8 points on outer circle R1 (paper region)
                      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                          const sx = Math.floor(x + Math.cos(angle) * R1);
                          const sy = Math.floor(y + Math.sin(angle) * R1);
                          const sidx = (sy * img.width + sx) * 4;
                          if (sidx >= 0 && sidx < data.length - 2) {
                              surroundSum1 += (data[sidx] + data[sidx+1] + data[sidx+2]) / 3;
                              count1++;
                          }
                      }

                      // Sample 8 points on outer circle R2 (paper region)
                      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                          const sx = Math.floor(x + Math.cos(angle) * R2);
                          const sy = Math.floor(y + Math.sin(angle) * R2);
                          const sidx = (sy * img.width + sx) * 4;
                          if (sidx >= 0 && sidx < data.length - 2) {
                              surroundSum2 += (data[sidx] + data[sidx+1] + data[sidx+2]) / 3;
                              count2++;
                          }
                      }

                      if (count1 > 0 && count2 > 0) {
                          const avgS1 = surroundSum1 / count1;
                          const avgS2 = surroundSum2 / count2;
                          
                          // Circular dark center on bright background means:
                          // High surroundings brightness - low center brightness
                          const score = (avgS1 - bCenter) + (avgS2 - bCenter) - (bCenter * 0.4);
                          
                          // Verify core structure (the black solid marker width) in close range (solid core)
                          let innerDarkCount = 0;
                          let innerPoints = 0;
                          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                              const rx_inner = Math.max(2, Math.floor(R_inner / 2));
                              const sx = Math.floor(x + Math.cos(angle) * rx_inner);
                              const sy = Math.floor(y + Math.sin(angle) * rx_inner);
                              const sidx = (sy * img.width + sx) * 4;
                              if (sidx >= 0 && sidx < data.length - 2) {
                                  const bS = (data[sidx] + data[sidx+1] + data[sidx+2]) / 3;
                                  if (bS < bCenter + 50 || bS < 140) {
                                      innerDarkCount++;
                                  }
                                  innerPoints++;
                              }
                          }
                          
                          if (innerPoints > 0 && innerDarkCount >= 5) {
                              if (score > maxScore) {
                                  maxScore = score;
                                  bestX = x;
                                  bestY = y;
                              }
                          }
                      }
                  }
              }
          }

          // Refine with 1-pixel precision in a local 16x16 window
          if (maxScore > -55 && bestX > 0 && bestY > 0) {
              let refX = bestX, refY = bestY, refMaxScore = maxScore;
              for (let dy = -8; dy <= 8; dy++) {
                  for (let dx = -8; dx <= 8; dx++) {
                      const rx = bestX + dx;
                      const ry = bestY + dy;
                      if (rx >= startX + 5 && rx < endX - 5 && ry >= startY + 5 && ry < endY - 5) {
                          const idx = (ry * img.width + rx) * 4;
                          if (idx >= 0 && idx < data.length - 2) {
                              const bCenter = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                              
                              let surroundSum1 = 0, count1 = 0;
                              let surroundSum2 = 0, count2 = 0;
                              for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                                  const sx1 = rx + Math.floor(Math.cos(angle) * R1);
                                  const sy1 = ry + Math.floor(Math.sin(angle) * R1);
                                  const sidx1 = (sy1 * img.width + sx1) * 4;
                                  if (sidx1 >= 0 && sidx1 < data.length - 2) {
                                      surroundSum1 += (data[sidx1] + data[sidx1+1] + data[sidx1+2]) / 3;
                                      count1++;
                                  }
                                  
                                  const sx2 = rx + Math.floor(Math.cos(angle) * R2);
                                  const sy2 = ry + Math.floor(Math.sin(angle) * R2);
                                  const sidx2 = (sy2 * img.width + sx2) * 4;
                                  if (sidx2 >= 0 && sidx2 < data.length - 2) {
                                      surroundSum2 += (data[sidx2] + data[sidx2+1] + data[sidx2+2]) / 3;
                                      count2++;
                                  }
                              }
                              
                              if (count1 > 0 && count2 > 0) {
                                  const avgS1 = surroundSum1 / count1;
                                  const avgS2 = surroundSum2 / count2;
                                  const score = (avgS1 - bCenter) + (avgS2 - bCenter) - (bCenter * 0.4);
                                  if (score > refMaxScore) {
                                      refMaxScore = score;
                                      refX = rx;
                                      refY = ry;
                                  }
                              }
                          }
                      }
                  }
              }
              bestX = refX;
              bestY = refY;
              maxScore = refMaxScore;
          }

          return { x: bestX, y: bestY, score: maxScore };
      };

      const q = 0.45;
      const tl = findCorner(0, 0, img.width * q, img.height * q);
      const tr = findCorner(img.width * (1-q), 0, img.width, img.height * q);
      const bl = findCorner(0, img.height * (1-q), img.width * q, img.height);
      const br = findCorner(img.width * (1-q), img.height * (1-q), img.width, img.height);

      const CONFIDENCE_THRESHOLD = 15;
      const hasAllCorners = tl.score >= CONFIDENCE_THRESHOLD && 
                           tr.score >= CONFIDENCE_THRESHOLD && 
                           bl.score >= CONFIDENCE_THRESHOLD && 
                           br.score >= CONFIDENCE_THRESHOLD;

      const detectedCorners = {
        tl: tl.score >= CONFIDENCE_THRESHOLD ? { x: (tl.x / img.width) * 100, y: (tl.y / img.height) * 100 } : { x: 20, y: 20 },
        tr: tr.score >= CONFIDENCE_THRESHOLD ? { x: (tr.x / img.width) * 100, y: (tr.y / img.height) * 100 } : { x: 80, y: 20 },
        bl: bl.score >= CONFIDENCE_THRESHOLD ? { x: (bl.x / img.width) * 100, y: (bl.y / img.height) * 100 } : { x: 20, y: 80 },
        br: br.score >= CONFIDENCE_THRESHOLD ? { x: (br.x / img.width) * 100, y: (br.y / img.height) * 100 } : { x: 80, y: 80 }
      };

      setCorners(detectedCorners);

      if (hasAllCorners) {
        // Auto-detected perfectly! Analyze answers straight away.
        await processCapturedScan(imageSrc, detectedCorners);
      } else {
        // Show manual review/correcting screen for alignment
        setScannerStatus('correcting');
      }
    } catch (err) {
      console.error("Error in capturePhoto:", err);
      // Fallback on failure
      setScannerStatus('correcting');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processCapturedScan = async (overrideImage?: string, overrideCorners?: typeof corners) => {
    const imageToUse = overrideImage || capturedImage;
    if (!imageToUse) return;

    setIsAnalyzing(true);

    try {
      const img = new Image();
      img.src = imageToUse;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // guarantees we never hang on broken loading
      });

      if (!img.width || !img.height) {
        throw new Error("No se pudo cargar la imagen para procesar.");
      }

      // Create an off-screen temporary canvas for image processing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) {
        throw new Error("No se pudo inicializar el Canvas 2D.");
      }

      tempCtx.drawImage(img, 0, 0);

      const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      const cornersToUse = overrideCorners || corners;

      const absoluteCorners = {
          tl: { x: (cornersToUse.tl.x / 100) * img.width, y: (cornersToUse.tl.y / 100) * img.height },
          tr: { x: (cornersToUse.tr.x / 100) * img.width, y: (cornersToUse.tr.y / 100) * img.height },
          bl: { x: (cornersToUse.bl.x / 100) * img.width, y: (cornersToUse.bl.y / 100) * img.height },
          br: { x: (cornersToUse.br.x / 100) * img.width, y: (cornersToUse.br.y / 100) * img.height }
      };

      // Helper: Bilinear interpolation mapped relative to the detected corners setup
      const getQuadPoint = (tx: number, ty: number) => {
          const x = (1 - tx) * (1 - ty) * absoluteCorners.tl.x +
                    tx * (1 - ty) * absoluteCorners.tr.x +
                    (1 - tx) * ty * absoluteCorners.bl.x +
                    tx * ty * absoluteCorners.br.x;
          const y = (1 - tx) * (1 - ty) * absoluteCorners.tl.y +
                    tx * (1 - ty) * absoluteCorners.tr.y +
                    (1 - tx) * ty * absoluteCorners.bl.y +
                    tx * ty * absoluteCorners.br.y;
          return { x, y };
      };

      const detectedAnswers: { [q: number]: string } = {};
      const options = ['A', 'B', 'C', 'D', 'E']; // Supports A B C D E
      
      // Draw visual corners on the output canvas for feedback
      tempCtx.fillStyle = '#10b981';
      Object.values(absoluteCorners).forEach(c => {
          tempCtx.beginPath();
          tempCtx.arc(c.x, c.y, 15, 0, Math.PI * 2);
          tempCtx.fill();
          tempCtx.strokeStyle = 'white';
          tempCtx.lineWidth = 3;
          tempCtx.stroke();
      });

      for (let i = 0; i < scannerConfig.questionCount; i++) {
          const col = Math.floor(i / 20);
          const row = i % 20;

          const tyBubble = (19 + (row * 3.8)) / 100;

          let selectedOpt = '-';

          const optionBrightness: { [opt: string]: number } = {};
          const optionCoords: { [opt: string]: { x: number, y: number } } = {};

          // 1. Calculate average brightness at each candidate option bubble
          options.forEach((opt, oIdx) => {
              // 3.2 spacing factor fits E beautifully
              const txBubble = ((16 + (col * 22)) + 3.5 + (oIdx * 3.2)) / 100;
              const pt = getQuadPoint(txBubble, tyBubble);
              optionCoords[opt] = pt;

              const sampleSize = Math.max(2, Math.floor(img.width / 160));
              let sumBright = 0;
              let count = 0;
              for (let dy = -sampleSize; dy <= sampleSize; dy++) {
                  for (let dx = -sampleSize; dx <= sampleSize; dx++) {
                      const computedX = Math.floor(pt.x + dx);
                      const computedY = Math.floor(pt.y + dy);
                      const sIdx = (computedY * img.width + computedX) * 4;
                      if (sIdx >= 0 && sIdx < data.length - 2) {
                          const b = (data[sIdx] + data[sIdx+1] + data[sIdx+2]) / 3;
                          sumBright += b;
                          count++;
                      }
                  }
              }
              optionBrightness[opt] = count > 0 ? (sumBright / count) : 255;
          });

          // 2. Determine darkest bubble and reference brightness
          let minBright = 255;
          let candidateOpt = '-';
          options.forEach(opt => {
              if (optionBrightness[opt] < minBright) {
                  minBright = optionBrightness[opt];
                  candidateOpt = opt;
              }
          });

          let otherSum = 0;
          let otherCount = 0;
          options.forEach(opt => {
              if (opt !== candidateOpt) {
                  otherSum += optionBrightness[opt];
                  otherCount++;
              }
          });
          const otherAvg = otherCount > 0 ? (otherSum / otherCount) : 255;

          // OMR fill check: candidate must be significantly darker than other options
          const contrast = otherAvg - minBright;
          const isFilled = (contrast > 20) && (minBright < 170);

          if (isFilled) {
              selectedOpt = candidateOpt;
          }

          // 3. Draw diagnostic circles on feedback display canvas
          options.forEach((opt) => {
              const pt = optionCoords[opt];
              const sampleSize = Math.max(2, Math.floor(img.width / 140));
              tempCtx.beginPath();
              tempCtx.arc(pt.x, pt.y, sampleSize, 0, Math.PI * 2);
              
              if (opt === selectedOpt) {
                  // Shaded / detected selection: blue outline or green if correct
                  const isCorrect = selectedOpt === scannerConfig.answerKey[i + 1];
                  tempCtx.strokeStyle = isCorrect ? '#10b981' : '#3b82f6';
                  tempCtx.lineWidth = Math.max(2, Math.floor(img.width / 400));
                  tempCtx.fillStyle = 'rgba(59, 130, 246, 0.3)';
                  tempCtx.fill();
              } else {
                  // Empty option
                  tempCtx.strokeStyle = '#cbd5e1';
                  tempCtx.lineWidth = 1;
              }
              tempCtx.stroke();
          });

          if (selectedOpt !== '-') {
              detectedAnswers[i + 1] = selectedOpt;
          }
      }

      setScanResult(detectedAnswers);
      setScannerStatus('finished');

      // Wait for the next tick so the DOM canvas element actually mounts
      setTimeout(() => {
          const domCanvas = canvasRef.current;
          if (domCanvas) {
              domCanvas.width = img.width;
              domCanvas.height = img.height;
              const domCtx = domCanvas.getContext('2d');
              if (domCtx) {
                  domCtx.drawImage(tempCanvas, 0, 0);
              }
          }
      }, 100);
    } catch (err) {
      console.error("Error in processCapturedScan:", err);
      alert("No se pudo procesar la hoja localmente. Alinea los marcadores por favor.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processWithGemini = async (base64Image: string) => {
    setIsAiProcessing(true);
    setAiError(null);
    setAiInfo(null);
    try {
      const response = await fetch("/api/omr-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
          questionCount: scannerConfig.questionCount
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Algo falló durante el análisis con IA.");
      }

      const data = await response.json();
      const answers: { [q: number]: string } = {};
      for (let q = 1; q <= scannerConfig.questionCount; q++) {
        const value = data.respuestas[String(q)] || data.respuestas[q];
        answers[q] = value || "OMITIDA";
      }

      setScanResult(answers);
      setAiInfo({
        confianza: data.confianza,
        advertencias: data.advertencias || [],
        alumno: data.alumno,
        fecha: data.fecha
      });

      // Fuzzy student auto-match
      if (data.alumno && typeof data.alumno === 'string') {
        const query = data.alumno.toLowerCase().trim();
        const matched = students.find(s => {
          if (!s.name) return false;
          const sName = s.name.toLowerCase().trim();
          return sName.includes(query) || query.includes(sName);
        });
        if (matched) {
          setScannerConfig(prev => ({
            ...prev,
            selectedStudentId: matched.id
          }));
        }
      }

      setScannerStatus('finished');

      // Draw original image onto output preview canvas
      const img = new Image();
      img.src = base64Image;
      img.onload = () => {
        const domCanvas = canvasRef.current;
        if (domCanvas) {
          domCanvas.width = img.width;
          domCanvas.height = img.height;
          const domCtx = domCanvas.getContext('2d');
          if (domCtx) {
              domCtx.drawImage(img, 0, 0);
          }
        }
      };
    } catch (error: any) {
      console.error("AI OMR error:", error);
      setAiError(error?.message || "Error al conectar con la API de IA.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const readFileAsBase64 = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCapturedImage(result);
      setScannerStatus('correcting');
      setCorners({
        tl: { x: 20, y: 20 },
        tr: { x: 80, y: 20 },
        bl: { x: 20, y: 80 },
        br: { x: 80, y: 80 }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFileAsBase64(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFileAsBase64(file);
    }
  };

  const saveScanToStudent = () => {
    if (!scanResult || !scannerConfig.selectedStudentId) return;
    
    // 1. Calculate scores by category for the target student
    const studentId = scannerConfig.selectedStudentId;
    const appIdx = scannerConfig.activeAppIndex;
    const config = SIMCE_CONFIG[appIdx];
    
    const categoryScores: { [catIdx: number]: number } = {};
    
    config.categories.forEach((cat, catIdx) => {
        const questionsInCat = cat.questions.split('-').map(Number);
        let correctCount = 0;
        
        questionsInCat.forEach(qNum => {
            const userAns = scanResult[qNum];
            const correctAns = scannerConfig.answerKey[qNum];
            if (userAns && correctAns && userAns === correctAns) {
                correctCount++;
            }
        });
        
        categoryScores[catIdx] = correctCount;
    });

    // 2. Update students state
    setStudents(prev => prev.map(s => {
        if (s.id !== studentId) return s;
        const newScores = { ...s.scores };
        newScores[appIdx] = categoryScores;
        return { ...s, scores: newScores };
    }));

    // 3. Reset and switch tab
    setScannerStatus('idle');
    setScanResult(null);
    setActiveTab('simce');
  };
  const totalFixedTime = activities.filter(a => a.isActive && a.fixedTime).reduce((sum, a) => sum + (a.fixedTime || 0), 0);
  const isCommunityOverloaded = totalFixedTime > results.comunidad;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800">
              JornadaDocente<span className="text-blue-600">.cl</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Nombre del docente..."
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-medium w-40 focus:w-60 transition-all"
              />
            </div>
            <button 
              onClick={exportPDF}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Integration */}
      <div className="bg-slate-100 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 flex gap-4">
          <button 
            onClick={() => setActiveTab('jornada')}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'jornada' 
                ? 'border-blue-600 text-blue-600 bg-white shadow-[0_-4px_0_0_inset_white]' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Jornada Docente
          </button>
          <button 
            onClick={() => setActiveTab('simce')}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'simce' 
                ? 'border-blue-600 text-blue-600 bg-white shadow-[0_-4px_0_0_inset_white]' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Análisis SIMCE
          </button>
          <button 
            onClick={() => setActiveTab('scanner')}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'scanner' 
                ? 'border-blue-600 text-blue-600 bg-white shadow-[0_-4px_0_0_inset_white]' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Scan className="w-4 h-4" />
            Escáner SIMCE
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'jornada' ? (
            <motion.div 
              key="jornada"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Existing Jornada content starts here */}
              {/* Left Column: Input & Controls */}
              <div className="lg:col-span-5 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Configuración de Contrato
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Total de Horas de Contrato
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={contractHours || ''}
                      onChange={(e) => setContractHours(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium text-lg"
                      placeholder="Ej: 44"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                      Horas
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700 font-medium">Horas Aula (HA):</span>
                    <span className="text-xl font-bold text-blue-900">{results.ha} hrs.</span>
                  </div>
                  <p className="text-[10px] text-blue-600 mt-1 italic">
                    * Equivalente a {hcTime.formatted} cronológicas.
                  </p>
                </div>
              </div>
            </section>

            {/* Activities Selection */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Actividades de Comunidad
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Selecciona las actividades para distribuir las {comunidadTime.formatted} disponibles.
              </p>
              
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div key={activity.id} className="space-y-2">
                    <button
                      onClick={() => toggleActivity(activity.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        activity.isActive 
                          ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm' 
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={activity.isActive ? 'text-amber-600' : 'text-slate-300'}>
                          {activity.icon}
                        </div>
                        <span className="text-sm font-medium">{activity.name}</span>
                        {activity.fixedTime && (
                          <span className="text-[10px] bg-amber-200/50 px-1.5 py-0.5 rounded text-amber-700 font-bold">
                            {activity.fixedTime}h fijo
                          </span>
                        )}
                      </div>
                      {activity.isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-200" />
                      )}
                    </button>

                    {activity.isActive && ['desarrollo_prof', 'talleres', 'mruta', 'reuniones_depto'].includes(activity.id) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-4"
                      >
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Horas</label>
                          <input 
                            type="number" 
                            min="0"
                            value={activity.customHours ?? 0}
                            onChange={(e) => updateActivityTime(activity.id, 'customHours', Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Minutos</label>
                          <input 
                            type="number" 
                            min="0"
                            max="59"
                            value={activity.customMinutes ?? 0}
                            onChange={(e) => updateActivityTime(activity.id, 'customMinutes', Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              {isCommunityOverloaded && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-[11px] text-red-700 leading-tight">
                    Las horas fijas ({totalFixedTime}h) superan el tiempo disponible ({comunidadTime.formatted}).
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Visualization & Table */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Chart Section */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <ChevronRight className="w-5 h-5 text-blue-500" />
                Distribución Visual (Tabla 2019)
              </h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1000}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => decimalToTime(value).formatted}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Detailed Table */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Resumen de Jornada (Proporción 65/35)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
                      <th className="px-6 py-4 border-b border-slate-100">Descripción</th>
                      <th className="px-6 py-4 border-b border-slate-100">Sigla</th>
                      <th className="px-6 py-4 border-b border-slate-100">Tiempo Real</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {/* HC */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          Horas Lectivas (Docencia Aula)
                        </div>
                      </td>
                      <td className="px-6 py-4 border-b border-slate-100 text-slate-500 font-mono">HC</td>
                      <td className="px-6 py-4 border-b border-slate-100 font-bold text-blue-600">{hcTime.formatted}</td>
                    </tr>
                    
                    {/* Recreo */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                          Recreos
                        </div>
                      </td>
                      <td className="px-6 py-4 border-b border-slate-100 text-slate-500 font-mono">R</td>
                      <td className="px-6 py-4 border-b border-slate-100 font-bold text-blue-400">{recreoTime.formatted}</td>
                    </tr>

                    {/* Total No Lectivas */}
                    <tr className="bg-emerald-50/30">
                      <td className="px-6 py-4 font-bold border-b border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          Horas No Lectivas (Disponibles)
                        </div>
                      </td>
                      <td className="px-6 py-4 border-b border-emerald-100 text-slate-500 font-mono">HNL</td>
                      <td className="px-6 py-4 border-b border-emerald-100 font-bold text-emerald-600">{totalNoLectivasTime.formatted}</td>
                    </tr>

                    {/* PEA */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="pl-12 pr-6 py-3 border-b border-slate-100 text-slate-600">
                        Preparación y Evaluación (50% HNL)
                      </td>
                      <td className="px-6 py-3 border-b border-slate-100 text-slate-400 font-mono">PEA</td>
                      <td className="px-6 py-3 border-b border-slate-100 font-medium text-slate-700">{peaTime.formatted}</td>
                    </tr>
                    
                    {/* Comunidad */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="pl-12 pr-6 py-3 border-b border-slate-100 text-slate-600">
                        Gestión y Comunidad (50% HNL)
                      </td>
                      <td className="px-6 py-3 border-b border-slate-100 text-slate-400 font-mono">GC</td>
                      <td className="px-6 py-3 border-b border-slate-100 font-medium text-slate-700">{comunidadTime.formatted}</td>
                    </tr>
                    
                    {communityDistribution.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="pl-16 pr-6 py-2 border-b border-slate-50 text-slate-500 text-xs flex items-center gap-2">
                          {act.name}
                        </td>
                        <td className="px-6 py-2 border-b border-slate-50 text-slate-400 text-[10px] italic">
                          {act.fixedTime ? 'Fijo' : 'Var.'}
                        </td>
                        <td className="px-6 py-2 border-b border-slate-50 font-medium text-slate-600 text-xs">
                          {decimalToTime(act.time).formatted}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-slate-50/80 font-bold">
                      <td className="px-6 py-4">Total Contrato</td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4 text-slate-900">{decimalToTime(results.totalHours).formatted}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            </div>
          </motion.div>
        ) : activeTab === 'simce' ? (
          <motion.div 
            key="simce"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* SIMCE Analysis Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-slate-100">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                    Análisis Ensayos Tipo SIMCE
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">Control de habilidades y progreso por estudiante</p>
                </div>
                <button 
                  onClick={addStudent}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Añadir Estudiante
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Establecimiento</label>
                  <input 
                    type="text" 
                    value={schoolInfo.establishment}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, establishment: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Curso</label>
                  <input 
                    type="text" 
                    value={schoolInfo.course}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, course: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto -mx-8">
                <div className="min-w-[1200px] px-8">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th rowSpan={2} className="p-4 border border-slate-200 text-xs font-bold text-slate-500 text-left w-64">Nombre del Estudiante</th>
                        {SIMCE_CONFIG.map((app, appIdx) => (
                          <th key={appIdx} colSpan={app.categories.length * 2} className="p-2 border border-slate-200 text-[10px] font-black uppercase text-center bg-slate-100 text-slate-600">
                            {app.name}
                          </th>
                        ))}
                        <th rowSpan={2} className="p-2 border border-slate-200"></th>
                      </tr>
                      <tr className="bg-slate-50">
                        {SIMCE_CONFIG.map((app, appIdx) => (
                          <React.Fragment key={appIdx}>
                            {app.categories.map((cat, catIdx) => (
                              <React.Fragment key={catIdx}>
                                <th className="p-2 border border-slate-200 text-[9px] font-bold text-slate-500 w-20 text-center leading-tight">
                                  {cat.name}
                                  <div className="text-[8px] opacity-60 font-normal">Total: {cat.total}</div>
                                </th>
                                <th className="p-2 border border-slate-200 text-[9px] font-bold text-emerald-600 w-16 text-center">%</th>
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-2 border border-slate-200">
                            <input 
                              type="text"
                              placeholder="Ingresar nombre..."
                              value={student.name}
                              onChange={(e) => updateStudentName(student.id, e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-sm font-medium focus:text-blue-600"
                            />
                          </td>
                          {SIMCE_CONFIG.map((app, appIdx) => (
                            <React.Fragment key={appIdx}>
                              {app.categories.map((cat, catIdx) => {
                                const score = student.scores[appIdx]?.[catIdx] || 0;
                                const percentage = cat.total > 0 ? (score / cat.total) * 100 : 0;
                                return (
                                  <React.Fragment key={catIdx}>
                                    <td className="p-2 border border-slate-200 text-center">
                                      <input 
                                        type="number"
                                        min="0"
                                        max={cat.total}
                                        value={score || ''}
                                        onChange={(e) => updateStudentScore(student.id, appIdx, catIdx, Number(e.target.value))}
                                        className="w-12 bg-white border border-slate-100 rounded text-center text-sm font-bold focus:border-emerald-500 outline-none"
                                        placeholder="0"
                                      />
                                    </td>
                                    <td className={`p-2 border border-slate-200 text-center text-[10px] font-bold ${percentage >= 80 ? 'text-emerald-500' : percentage >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                      {cat.total > 0 ? `${percentage.toFixed(1)}%` : '-'}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          ))}
                          <td className="p-2 border border-slate-200 text-center">
                            <button 
                              onClick={() => removeStudent(student.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex gap-4">
              <div className="bg-blue-600 p-2 h-fit rounded-lg shadow-sm">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-blue-900 text-sm">Instrucciones del Analizador</h4>
                <p className="text-xs text-blue-700 leading-relaxed max-w-2xl">
                  Ingresa solo el número de respuestas correctas en cada casilla. El sistema calculará el porcentaje basado en los requerimientos del ensayo.
                  Los colores indican el nivel de logro: <span className="text-emerald-600 font-bold">Verde (80%+)</span>, <span className="text-amber-600 font-bold">Ámbar (50-79%)</span>, <span className="text-red-600 font-bold">Rojo (&lt;50%)</span>.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="space-y-6">
                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Save className="w-5 h-5 text-blue-500" />
                        Configuración Escaneo
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400">Ensayo a Corregir</label>
                            <select 
                                value={scannerConfig.activeAppIndex}
                                onChange={(e) => setScannerConfig(prev => ({ ...prev, activeAppIndex: Number(e.target.value) }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none"
                            >
                                {SIMCE_CONFIG.map((app, idx) => (
                                    <option key={idx} value={idx}>{app.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400">Preguntas</label>
                            <select 
                                value={scannerConfig.questionCount}
                                onChange={(e) => setScannerConfig(prev => ({ ...prev, questionCount: Number(e.target.value) }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none"
                            >
                                <option value={20}>20 Preguntas</option>
                                <option value={30}>30 Preguntas</option>
                                <option value={40}>40 Preguntas</option>
                                <option value={60}>60 Preguntas</option>
                            </select>
                        </div>
                        <button 
                            onClick={exportAnswerSheet}
                            className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white p-3 rounded-xl text-sm font-bold hover:bg-slate-900 transition-all"
                        >
                            <Printer className="w-4 h-4" />
                            Generar Hoja Imprimible
                        </button>
                    </div>
                  </section>

                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-bold flex items-center gap-1.5">
                            <MousePointer2 className="w-4 h-4 text-emerald-500" />
                            Clave de Respuestas
                        </h3>
                        <button 
                            onClick={fillSampleAnswerKey}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-1 rounded transition-all cursor-pointer"
                        >
                            Llenar de Prueba
                        </button>
                    </div>
                    <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {Array.from({ length: scannerConfig.questionCount }).map((_, i) => {
                            const q = i + 1;
                            return (
                                <div key={q} className="flex flex-col gap-1 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="text-[9px] font-bold text-slate-400">{q}</span>
                                    <select 
                                        value={scannerConfig.answerKey[q] || ''}
                                        onChange={(e) => setScannerConfig(prev => ({
                                            ...prev,
                                            answerKey: { ...prev.answerKey, [q]: e.target.value }
                                        }))}
                                        className="bg-transparent text-[11px] font-black outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">-</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                        <option value="E">E</option>
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                  </section>
                </div>

                {/* Camera / Processor Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Camera className="w-5 h-5 text-blue-500" />
                                Captura de Imagen
                            </h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsFullScreen(true)}
                                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                    Pantalla Completa
                                </button>
                                <button 
                                    onClick={() => setScannerStatus('idle')}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className={`relative ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col' : 'aspect-[3/4] md:aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden shadow-inner border-4 border-slate-800'}`} style={isFullScreen ? {width:'100vw', height:'100dvh', top:0, left:0} : {}}>
                            {(isAnalyzing || isAiProcessing) && (
                                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center">
                                    <div className="relative flex items-center justify-center mb-6">
                                        <div className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-emerald-500 animate-spin" />
                                        <Brain className="w-8 h-8 text-indigo-400 absolute animate-pulse animate-bounce" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">
                                        {isAiProcessing ? 'Analizando con IA de Gemini' : 'Procesando Hoja de Respuestas'}
                                    </h4>
                                    <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                                        {isAiProcessing 
                                         ? 'Nuestra IA está localizando los marcadores, corrigiendo perspectiva/inclinación, analizando círculos y comparando su contraste para alta fidelidad...'
                                         : 'Detectando marcadores y analizando respuestas automáticamente...'}
                                    </p>
                                </div>
                            )}

                            {isFullScreen && (
                                <button 
                                    onClick={() => setIsFullScreen(false)}
                                    className="absolute top-6 right-6 z-[60] bg-white/20 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/40 transition-all"
                                >
                                    <Minimize2 className="w-6 h-6" />
                                </button>
                            )}

                            {scannerStatus !== 'finished' ? (
                                <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
                                    {/* STATE 1: IDLE */}
                                    {scannerStatus === 'idle' && (
                                        <div 
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 transition-all duration-300 ${isDraggingFile ? 'bg-slate-800 border-4 border-dashed border-blue-500' : 'bg-slate-900'}`}
                                        >
                                            <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 flex flex-col items-center shadow-lg">
                                                <Upload className="w-12 h-12 text-blue-400 mb-3 animate-pulse" />
                                                <span className="text-white text-sm font-bold block mb-1">Arrastra aquí la hoja de respuesta</span>
                                                <span className="text-[10px] text-slate-400 block mb-4">Soporta PNG, JPG o escaneo directo</span>
                                                
                                                <div className="flex flex-wrap gap-3 mt-1 justify-center">
                                                    <label className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all inline-block">
                                                        Seleccionar Archivo
                                                        <input 
                                                            type="file" 
                                                            accept="image/*" 
                                                            onChange={handleFileSelect} 
                                                            className="hidden" 
                                                        />
                                                    </label>
                                                    <button
                                                        onClick={loadDemoSheet}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-blue-500/10 shadow-lg"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                                                        Cargar Hoja Demo
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mb-6 w-full max-w-xs text-slate-500">
                                                <div className="h-[1px] bg-slate-800 flex-1" />
                                                <span className="text-[10px] uppercase font-black tracking-widest leading-none">O</span>
                                                <div className="h-[1px] bg-slate-800 flex-1" />
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    setScannerStatus('scanning');
                                                    setIsFullScreen(true);
                                                    // Request fullscreen API for mobile browsers
                                                    try {
                                                      document.documentElement.requestFullscreen?.();
                                                    } catch(_) {}
                                                }}
                                                className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-8 py-4 rounded-2xl text-md font-black shadow-2xl transition-all"
                                            >
                                                <Camera className="w-5 h-5 animate-pulse" />
                                                USAR CÁMARA EN VIVO
                                            </button>
                                        </div>
                                    )}

                                    {/* STATE 2: SCANNING / LIVE PREVIEW */}
                                    {scannerStatus === 'scanning' && (
                                        <div className="relative w-full h-full flex flex-col justify-between">
                                            <style>{`
                                                @keyframes laserScan {
                                                    0% { top: 4%; }
                                                    50% { top: 96%; }
                                                    100% { top: 4%; }
                                                }
                                                .animate-laser {
                                                    animation: laserScan 2.2s ease-in-out infinite;
                                                }
                                            `}</style>

                                            {/* @ts-ignore */}
                                            <Webcam
                                                audio={false}
                                                ref={webcamRef}
                                                screenshotFormat="image/jpeg"
                                                screenshotQuality={1}
                                                mirrored={false}
                                                className="w-full h-full object-contain bg-slate-950"
                                                videoConstraints={{ 
                                                    facingMode: "environment",
                                                    width: { ideal: 1920 },
                                                    height: { ideal: 1080 }
                                                }}
                                            />

                                            {/* Beautiful QR-like center frame guide */}
                                            <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
                                                {/* Top Instructions overlay */}
                                                <div className="self-center bg-black/75 backdrop-blur-md text-white border border-white/15 px-4 py-2 rounded-full text-[11px] font-bold tracking-wider uppercase mb-2 flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                                                    Modo Captura Activo (Alta Calidad)
                                                </div>

                                                {/* Central frame guide */}
                                                <div className="w-64 h-80 border-2 border-emerald-500/25 rounded-2xl mx-auto self-center flex items-center justify-center relative bg-black/10 backdrop-blur-[0.5px]">
                                                    {/* Corner brackets */}
                                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                                                    
                                                     {/* Moving Laser line */}
                                                    <div className="absolute left-0 right-0 h-1 bg-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-laser rounded-full" />

                                                    <div className="text-white/90 text-[10px] font-bold text-center leading-relaxed p-4 bg-black/60 rounded-xl max-w-[200px] border border-white/10 shadow-lg">
                                                        Alinea los 4 marcadores de las esquinas dentro de este recuadro y presiona Capturar
                                                    </div>
                                                </div>

                                                {/* Space filler, pushes shutter down */}
                                                <div className="h-20" />
                                            </div>

                                            {/* Shutter button wrapper */}
                                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-auto">
                                                <button 
                                                    onClick={capturePhoto}
                                                    className="w-20 h-20 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 active:scale-90 transition-all flex items-center justify-center shadow-2xl"
                                                    title="Capturar Foto"
                                                >
                                                    <div className="w-16 h-16 rounded-full border-2 border-black/10 bg-white shadow-inner flex items-center justify-center">
                                                        <Camera className="w-8 h-8 text-neutral-800" />
                                                    </div>
                                                </button>
                                                <span className="bg-black/75 text-white rounded-lg px-2 py-1 text-[9px] font-black tracking-widest border border-white/10 uppercase">Tomar Foto</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* STATE 3: CORRECTING / DRAGGING DOTS */}
                                    {scannerStatus === 'correcting' && capturedImage && (
                                        <div className="relative w-full h-full flex flex-col justify-between bg-slate-950">
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <img 
                                                    src={capturedImage} 
                                                    className="w-full h-full object-contain select-none" 
                                                    alt="Captured page"
                                                    draggable={false}
                                                />
                                                
                                                {/* Drag gestures overlay layer */}
                                                <div 
                                                    ref={containerRef}
                                                    onMouseMove={handleMouseMove}
                                                    onTouchMove={handleTouchMove}
                                                    onMouseUp={() => setActiveDragCorner(null)}
                                                    onTouchEnd={() => setActiveDragCorner(null)}
                                                    onMouseLeave={() => setActiveDragCorner(null)}
                                                    className="absolute inset-x-0 inset-y-0 select-none cursor-crosshair z-20"
                                                >
                                                    {/* Connected quadrilateral polygon outline */}
                                                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                                        <polygon 
                                                            points={`
                                                                ${corners.tl.x}%,${corners.tl.y}% 
                                                                ${corners.tr.x}%,${corners.tr.y}% 
                                                                ${corners.br.x}%,${corners.br.y}% 
                                                                ${corners.bl.x}%,${corners.bl.y}%
                                                            `} 
                                                            fill="rgba(59, 130, 246, 0.2)" 
                                                            stroke="#2563eb" 
                                                            strokeWidth="3" 
                                                            strokeDasharray="4" 
                                                        />
                                                    </svg>

                                                    {/* Handles for alignment */}
                                                    {(['tl', 'tr', 'bl', 'br'] as const).map(key => {
                                                        const pt = corners[key];
                                                        const isDragging = activeDragCorner === key;
                                                        return (
                                                            <div
                                                                key={key}
                                                                style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDragCorner(key);
                                                                }}
                                                                onTouchStart={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDragCorner(key);
                                                                }}
                                                                className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-move active:scale-125 transition-transform touch-none z-30"
                                                            >
                                                                {/* Ring target */}
                                                                <div className={`w-7 h-7 rounded-full border-4 border-white shadow-2xl transition-all flex items-center justify-center ${isDragging ? 'bg-amber-500 scale-125' : 'bg-blue-600'}`}>
                                                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Action bar and advice overlay */}
                                            <div className="absolute top-4 left-4 right-4 z-30 bg-black/70 backdrop-blur-md rounded-xl p-3 border border-white/10 text-white text-[10px] text-center font-semibold pointer-events-none uppercase tracking-wide">
                                                Alinea los círculos sobre las 4 esquinas negras de la hoja.
                                            </div>

                                            <div className="absolute bottom-6 left-4 right-4 z-30 flex flex-col items-center gap-3">
                                                {aiError && (
                                                    <div className="bg-red-500/90 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-lg flex items-center gap-2 max-w-sm border border-red-400/20 backdrop-blur-sm">
                                                        <AlertTriangle className="w-4 h-4 text-white" />
                                                        <span>{aiError}</span>
                                                    </div>
                                                )}
                                                <div className="flex gap-2 justify-center flex-wrap">
                                                    <button 
                                                        onClick={() => setScannerStatus('scanning')}
                                                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-2xl text-xs font-black shadow-lg transition-all"
                                                    >
                                                        <RefreshCcw className="w-4 h-4" />
                                                        Re-capturar
                                                    </button>
                                                    <button 
                                                        onClick={() => processCapturedScan()}
                                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl text-xs font-black shadow-lg transition-all border border-emerald-500/20"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Procesar Localmente
                                                    </button>
                                                    <button 
                                                        onClick={() => processWithGemini(capturedImage!)}
                                                        disabled={isAiProcessing}
                                                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-4 py-3 rounded-2xl text-xs font-black shadow-lg border border-indigo-500/20 transition-all disabled:opacity-50"
                                                    >
                                                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                                                        Procesar con IA (Gemini)
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full h-full relative">
                                    <canvas 
                                        ref={canvasRef}
                                        className="w-full h-full object-contain bg-white"
                                    />
                                    {isFullScreen && (
                                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                                            <button 
                                                onClick={() => setIsFullScreen(false)}
                                                className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl"
                                            >
                                                VER RESULTADOS
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {scanResult && scannerStatus === 'finished' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        Detección de Respuestas
                                    </h4>
                                    <div className="flex gap-2">
                                        <select 
                                            value={scannerConfig.selectedStudentId}
                                            onChange={(e) => setScannerConfig(prev => ({ ...prev, selectedStudentId: e.target.value }))}
                                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm"
                                        >
                                            <option value="">Seleccionar Estudiante...</option>
                                            {students.map(s => (
                                                <option key={s.id} value={s.id}>{s.name || 'Sin nombre'}</option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={saveScanToStudent}
                                            disabled={!scannerConfig.selectedStudentId}
                                            className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all"
                                        >
                                            SINCRONIZAR
                                        </button>
                                    </div>
                                </div>

                                {aiInfo && (
                                    <div className="mb-4 p-4 bg-indigo-50 border border-indigo-150 rounded-xl space-y-2 text-left">
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2">
                                                <Brain className="w-4 h-4 text-indigo-600" />
                                                <span className="font-bold text-indigo-900">Análisis OMR Asistido por IA (Gemini)</span>
                                            </div>
                                            <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-black text-white ${aiInfo.confianza === 'alta' ? 'bg-emerald-500' : aiInfo.confianza === 'media' ? 'bg-amber-500' : 'bg-red-500'}`}>
                                                Confianza: {aiInfo.confianza}
                                            </span>
                                        </div>

                                        {(aiInfo.alumno || aiInfo.fecha) && (
                                            <div className="grid grid-cols-2 gap-3 text-xs bg-indigo-100/40 p-2.5 rounded-lg border border-indigo-100/60">
                                                {aiInfo.alumno && (
                                                    <div>
                                                        <span className="text-[10px] uppercase font-black text-indigo-600 block">Estudiante Detectado</span>
                                                        <span className="font-bold text-slate-800">{aiInfo.alumno}</span>
                                                     </div>
                                                 )}
                                                 {aiInfo.fecha && (
                                                     <div>
                                                         <span className="text-[10px] uppercase font-black text-indigo-600 block">Fecha Detectada</span>
                                                         <span className="font-bold text-slate-800">{aiInfo.fecha}</span>
                                                     </div>
                                                 )}
                                            </div>
                                        )}
                                        {aiInfo.advertencias.length > 0 && (
                                            <div className="text-[10px] text-indigo-700 space-y-1 bg-white/50 p-2.5 rounded-lg border border-indigo-100/50">
                                                <span className="font-bold block">Observaciones del Escaneo:</span>
                                                <ul className="list-disc pl-4 space-y-0.5 font-medium">
                                                    {aiInfo.advertencias.map((adv, idx) => (
                                                        <li key={idx}>{adv}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
                                    {Object.entries(scanResult).map(([q, res]) => (
                                        <div key={q} className={`flex flex-col items-center bg-white border p-1 rounded ${res === scannerConfig.answerKey[Number(q)] ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'}`}>
                                            <span className="text-[8px] text-slate-400 font-bold">{q}</span>
                                            <span className="text-xs font-black">{res}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-slate-400 text-sm">
          <p>© 2026 Herramienta de Cálculo Docente. Basado en Tabla 2019 (65/35).</p>
        </div>
      </footer>
    </div>
  );
}
